import { config } from "../lib/config.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { ragService } from "./rag.service.js";
import OpenAI from "openai";
import type {
  CaseLawSearchRequest,
  CaseLawResult,
  ActEntry,
  ActSection,
  ScoredChunk,
} from "@nyay/shared";

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

// ─── Mock mode: when INDIAN_KANOON_API_KEY is not set ────────────────
const MOCK_MODE = !process.env.INDIAN_KANOON_API_KEY;
const IK_BASE = "https://api.indiankanoon.org";
const IK_TOKEN = process.env.INDIAN_KANOON_API_KEY ?? "";

// ─── Indian Kanoon API client ────────────────────────────────────────

async function ikFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(path, IK_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Token ${IK_TOKEN}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Indian Kanoon API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─── Case law search ─────────────────────────────────────────────────

export async function searchCaseLaw(
  request: CaseLawSearchRequest
): Promise<{ results: CaseLawResult[]; total: number }> {
  const limit = Math.min(request.limit ?? 10, 20);

  // 1. Search our knowledge base first
  const kbResults = await searchKnowledgeBase(request, limit);

  if (kbResults.length >= limit) {
    return { results: kbResults.slice(0, limit), total: kbResults.length };
  }

  // 2. If not enough results and not in mock mode, fetch from Indian Kanoon
  if (!MOCK_MODE) {
    const ikResults = await searchIndianKanoon(request, limit - kbResults.length);
    // Lazy populate: fetch, chunk, embed, store
    for (const result of ikResults) {
      await lazyPopulate(result);
    }
    const combined = [...kbResults, ...ikResults];
    return { results: combined.slice(0, limit), total: combined.length };
  }

  // Mock mode: supplement with mock data if KB is empty
  if (kbResults.length === 0) {
    return { results: getMockCaseLawResults(request), total: 5 };
  }

  return { results: kbResults, total: kbResults.length };
}

async function searchKnowledgeBase(
  request: CaseLawSearchRequest,
  limit: number
): Promise<CaseLawResult[]> {
  const filters: { source_type?: "judgement"; source_title?: string } = {
    source_type: "judgement",
  };
  if (request.statute) {
    filters.source_title = request.statute;
  }

  const chunks = await ragService.hybridSearch(request.keywords, filters, limit);

  // Group by source_title to deduplicate cases
  const caseMap = new Map<string, { chunks: ScoredChunk[]; best: ScoredChunk }>();
  for (const chunk of chunks) {
    const key = chunk.source_title;
    const existing = caseMap.get(key);
    if (existing) {
      existing.chunks.push(chunk);
      if (chunk.score > existing.best.score) existing.best = chunk;
    } else {
      caseMap.set(key, { chunks: [chunk], best: chunk });
    }
  }

  const results: CaseLawResult[] = [];
  for (const [title, { chunks: caseChunks, best }] of caseMap) {
    const rawMeta = (best.metadata ?? {}) as Record<string, unknown>;
    const str = (key: string): string | null => {
      const v = rawMeta[key];
      return typeof v === "string" ? v : null;
    };

    // Apply court filter
    const metaCourt = str("court");
    if (request.court && metaCourt && !metaCourt.toLowerCase().includes(request.court.toLowerCase())) {
      continue;
    }

    // Apply year filter — exclude cases without year metadata when filter is active
    const metaYear = str("year");
    const year = metaYear ? parseInt(metaYear, 10) : NaN;
    if (request.year_from && (isNaN(year) || year < request.year_from)) continue;
    if (request.year_to && (isNaN(year) || year > request.year_to)) continue;

    // Apply judge filter
    const metaJudges = str("judges");
    if (request.judge && metaJudges && !metaJudges.toLowerCase().includes(request.judge.toLowerCase())) {
      continue;
    }

    results.push({
      id: best.id,
      title,
      citation: str("citation") ?? title,
      court: metaCourt ?? "Unknown Court",
      date: str("date") ?? "",
      judges: metaJudges ? metaJudges.split(",").map((j) => j.trim()) : [],
      headnote: best.summary ?? best.content.slice(0, 300),
      source: "knowledge_base",
      chunk_ids: caseChunks.map((c) => c.id),
    });
  }

  return results;
}

async function searchIndianKanoon(
  request: CaseLawSearchRequest,
  limit: number
): Promise<CaseLawResult[]> {
  const queryParts = [request.keywords];
  if (request.court) queryParts.push(`court:${request.court}`);
  if (request.judge) queryParts.push(`judge:${request.judge}`);
  if (request.year_from) queryParts.push(`fromdate:${request.year_from}-01-01`);
  if (request.year_to) queryParts.push(`todate:${request.year_to}-12-31`);
  if (request.statute) queryParts.push(`statute:${request.statute}`);

  const data = (await ikFetch("/search/", {
    formInput: queryParts.join(" "),
    pagenum: "0",
  })) as { docs?: Array<{ tid: string; title: string; headline: string; docsource: string; publishdate?: string; author?: string }> };

  const docs = data.docs ?? [];
  return docs.slice(0, limit).map((doc) => ({
    id: `ik-${doc.tid}`,
    title: doc.title,
    citation: doc.title,
    court: doc.docsource ?? "Unknown Court",
    date: doc.publishdate ?? "",
    judges: doc.author ? [doc.author] : [],
    headnote: doc.headline?.replace(/<[^>]+>/g, "") ?? "",
    source: "indian_kanoon" as const,
  }));
}

// ─── Lazy population: fetch full doc, chunk, embed, store ────────────

// In-flight guard to prevent concurrent population of the same doc
const populatingIds = new Set<string>();

async function lazyPopulate(result: CaseLawResult): Promise<void> {
  if (result.source !== "indian_kanoon") return;

  const ikId = result.id.replace("ik-", "");

  // Prevent concurrent population of the same document
  if (populatingIds.has(ikId)) return;
  populatingIds.add(ikId);

  try {
    return await _doLazyPopulate(ikId, result);
  } finally {
    populatingIds.delete(ikId);
  }
}

async function _doLazyPopulate(ikId: string, result: CaseLawResult): Promise<void> {
  // Check if already in DB
  const { data: existing } = await supabaseAdmin
    .from("legal_chunks")
    .select("id")
    .eq("metadata->>ik_id", ikId)
    .limit(1);

  if (existing && existing.length > 0) return;

  try {
    // Fetch full document
    const doc = (await ikFetch(`/doc/${ikId}/`)) as { doc?: string; title?: string };
    const text = doc.doc?.replace(/<[^>]+>/g, "") ?? "";

    if (!text || text.length < 100) return;

    // Chunk the document
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);

    // Embed and store each chunk
    for (const [i, chunk] of chunks.entries()) {
      const embedding = await embed(chunk);

      await supabaseAdmin.from("legal_chunks").insert({
        source_type: "judgement",
        source_title: result.title,
        section_ref: `Part ${i + 1}`,
        content: chunk,
        summary: i === 0 ? result.headnote.slice(0, 300) : null,
        metadata: {
          ik_id: ikId,
          court: result.court,
          date: result.date,
          citation: result.citation,
          judges: result.judges.join(", "),
        },
        embedding: JSON.stringify(embedding),
      });
    }

    // Update result with KB source
    result.source = "knowledge_base";
  } catch (err) {
    // Log but don't fail the search
    console.error(`Failed to lazy-populate case ${result.id}:`, err);
  }
}

// ─── Browse Acts ─────────────────────────────────────────────────────

export async function browseActs(): Promise<ActEntry[]> {
  // Fetch distinct act titles — limit to prevent unbounded queries
  const { data, error } = await supabaseAdmin
    .from("legal_chunks")
    .select("source_title, metadata")
    .eq("source_type", "act")
    .order("source_title")
    .limit(5000);

  if (error) throw new Error(`Failed to browse acts: ${error.message}`);

  // Deduplicate by source_title
  const actMap = new Map<string, ActEntry>();
  for (const row of data ?? []) {
    if (actMap.has(row.source_title)) continue;
    const meta = (row.metadata ?? {}) as Record<string, string>;
    actMap.set(row.source_title, {
      id: row.source_title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: row.source_title,
      year: meta.year ? parseInt(meta.year, 10) : 0,
      short_title: meta.short_title ?? row.source_title,
    });
  }

  // If KB is empty and mock mode, return mock acts
  if (actMap.size === 0 && MOCK_MODE) {
    return getMockActs();
  }

  return Array.from(actMap.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getActSections(actTitle: string): Promise<{
  act: ActEntry;
  sections: ActSection[];
}> {
  const { data, error } = await supabaseAdmin
    .from("legal_chunks")
    .select("id, section_ref, content, summary, metadata")
    .eq("source_type", "act")
    .eq("source_title", actTitle)
    .order("section_ref");

  if (error) throw new Error(`Failed to get act sections: ${error.message}`);

  if ((!data || data.length === 0) && MOCK_MODE) {
    return getMockActSections(actTitle);
  }

  const meta = (data?.[0]?.metadata ?? {}) as Record<string, string>;
  const act: ActEntry = {
    id: actTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: actTitle,
    year: meta.year ? parseInt(meta.year, 10) : 0,
    short_title: meta.short_title ?? actTitle,
  };

  const sections: ActSection[] = (data ?? []).map((row) => ({
    id: row.id,
    section_ref: row.section_ref ?? "Untitled",
    title: row.summary ?? row.section_ref ?? "Untitled",
    content: row.content,
  }));

  return { act, sections };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function chunkText(text: string, size: number, overlap: number): string[] {
  const step = size - overlap;
  if (step <= 0) throw new Error("Chunk overlap must be less than chunk size");

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += step;
  }
  return chunks;
}

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

// ─── Mock data ───────────────────────────────────────────────────────

function getMockCaseLawResults(request: CaseLawSearchRequest): CaseLawResult[] {
  const mockCases: CaseLawResult[] = [
    {
      id: "mock-1",
      title: "Kesavananda Bharati v. State of Kerala",
      citation: "AIR 1973 SC 1461",
      court: "Supreme Court of India",
      date: "1973-04-24",
      judges: ["S.M. Sikri CJ", "A.N. Grover", "K.S. Hegde", "A.K. Mukherjea"],
      headnote: "Basic structure doctrine — Parliament cannot amend the Constitution to destroy its basic features including supremacy of the Constitution, republican and democratic form of government, secular character, separation of powers, and federal character.",
      source: "knowledge_base",
    },
    {
      id: "mock-2",
      title: "Maneka Gandhi v. Union of India",
      citation: "AIR 1978 SC 597",
      court: "Supreme Court of India",
      date: "1978-01-25",
      judges: ["M.H. Beg CJ", "Y.V. Chandrachud", "P.N. Bhagwati", "V.R. Krishna Iyer"],
      headnote: "Right to travel abroad is part of personal liberty under Article 21. Procedure established by law must be just, fair, and reasonable. The principles of natural justice are implicit in Article 21.",
      source: "knowledge_base",
    },
    {
      id: "mock-3",
      title: "Vishaka v. State of Rajasthan",
      citation: "AIR 1997 SC 3011",
      court: "Supreme Court of India",
      date: "1997-08-13",
      judges: ["J.S. Verma CJ", "Sujata V. Manohar", "B.N. Kirpal"],
      headnote: "Sexual harassment at workplace violates fundamental rights under Articles 14, 15, 19(1)(g), and 21. Court laid down guidelines (Vishaka Guidelines) for prevention of sexual harassment pending legislation.",
      source: "knowledge_base",
    },
    {
      id: "mock-4",
      title: "K.S. Puttaswamy v. Union of India",
      citation: "(2017) 10 SCC 1",
      court: "Supreme Court of India",
      date: "2017-08-24",
      judges: ["J.S. Khehar CJ", "J. Chelameswar", "S.A. Bobde", "R.K. Agrawal", "D.Y. Chandrachud"],
      headnote: "Right to Privacy is a fundamental right under Article 21 of the Constitution. It protects the inner sphere of the individual from interference by both State and non-State actors and allows individuals to make autonomous life choices.",
      source: "knowledge_base",
    },
    {
      id: "mock-5",
      title: "Arnesh Kumar v. State of Bihar",
      citation: "(2014) 8 SCC 273",
      court: "Supreme Court of India",
      date: "2014-07-02",
      judges: ["C.K. Prasad", "P.C. Pant"],
      headnote: "Guidelines for arrest — Police must follow checklist before arrest in cases punishable up to 7 years. Magistrate must verify compliance with Section 41 CrPC before authorising detention. Non-compliance results in departmental action.",
      source: "knowledge_base",
    },
  ];

  return mockCases.filter((c) => {
    if (request.court && !c.court.toLowerCase().includes(request.court.toLowerCase())) return false;
    if (request.year_from) {
      const year = parseInt(c.date.split("-")[0], 10);
      if (year < request.year_from) return false;
    }
    if (request.year_to) {
      const year = parseInt(c.date.split("-")[0], 10);
      if (year > request.year_to) return false;
    }
    return true;
  });
}

function getMockActs(): ActEntry[] {
  return [
    { id: "bharatiya-nagarik-suraksha-sanhita-2023", title: "Bharatiya Nagarik Suraksha Sanhita, 2023", year: 2023, short_title: "BNSS" },
    { id: "bharatiya-nyaya-sanhita-2023", title: "Bharatiya Nyaya Sanhita, 2023", year: 2023, short_title: "BNS" },
    { id: "bharatiya-sakshya-adhiniyam-2023", title: "Bharatiya Sakshya Adhiniyam, 2023", year: 2023, short_title: "BSA" },
    { id: "code-of-civil-procedure-1908", title: "Code of Civil Procedure, 1908", year: 1908, short_title: "CPC" },
    { id: "constitution-of-india", title: "Constitution of India", year: 1950, short_title: "COI" },
    { id: "consumer-protection-act-2019", title: "Consumer Protection Act, 2019", year: 2019, short_title: "CPA" },
    { id: "contract-act-1872", title: "Indian Contract Act, 1872", year: 1872, short_title: "ICA" },
    { id: "evidence-act-1872", title: "Indian Evidence Act, 1872", year: 1872, short_title: "IEA" },
    { id: "indian-penal-code-1860", title: "Indian Penal Code, 1860", year: 1860, short_title: "IPC" },
    { id: "information-technology-act-2000", title: "Information Technology Act, 2000", year: 2000, short_title: "IT Act" },
    { id: "limitation-act-1963", title: "Limitation Act, 1963", year: 1963, short_title: "LA" },
    { id: "negotiable-instruments-act-1881", title: "Negotiable Instruments Act, 1881", year: 1881, short_title: "NI Act" },
    { id: "specific-relief-act-1963", title: "Specific Relief Act, 1963", year: 1963, short_title: "SRA" },
    { id: "transfer-of-property-act-1882", title: "Transfer of Property Act, 1882", year: 1882, short_title: "TPA" },
  ];
}

function getMockActSections(actTitle: string): { act: ActEntry; sections: ActSection[] } {
  const act: ActEntry = {
    id: actTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: actTitle,
    year: 0,
    short_title: actTitle,
  };

  // Return a few mock sections
  const sections: ActSection[] = [
    {
      id: "mock-s1",
      section_ref: "Section 1",
      title: "Short title, extent and commencement",
      content: `This Act may be called the ${actTitle}. It extends to the whole of India. It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint.`,
    },
    {
      id: "mock-s2",
      section_ref: "Section 2",
      title: "Definitions",
      content: "In this Act, unless the context otherwise requires — (a) the terms used herein shall have the meanings assigned to them in the respective definitions section of this Act.",
    },
    {
      id: "mock-s3",
      section_ref: "Section 3",
      title: "Application",
      content: "The provisions of this Act shall apply to all matters and proceedings as specified, subject to the exceptions and conditions contained herein.",
    },
  ];

  return { act, sections };
}

export const indianKanoonService = {
  searchCaseLaw,
  browseActs,
  getActSections,
};
