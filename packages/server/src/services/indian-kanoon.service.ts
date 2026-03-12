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
  const mockActs = getMockActs();
  const mockAct = mockActs.find((a) => a.title === actTitle);
  const act: ActEntry = mockAct ?? {
    id: actTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: actTitle,
    year: 0,
    short_title: actTitle,
  };

  // Act-specific mock sections
  const actSectionsMap: Record<string, ActSection[]> = {
    "Bharatiya Nagarik Suraksha Sanhita, 2023": [
      { id: "bnss-s1", section_ref: "Section 1", title: "Short title, extent and commencement", content: "This Act may be called the Bharatiya Nagarik Suraksha Sanhita, 2023. It extends to the whole of India. It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint." },
      { id: "bnss-s2", section_ref: "Section 2", title: "Definitions", content: "In this Sanhita, unless the context otherwise requires — (a) 'bailable offence' means an offence which is shown as bailable in the First Schedule, or which is made bailable by any other law for the time being in force; (b) 'charge' includes any head of charge when the charge contains more heads than one; (c) 'cognizable offence' means an offence for which a police officer may arrest without warrant; (d) 'complaint' means any allegation made orally or in writing to a Magistrate, with a view to his taking action under this Sanhita." },
      { id: "bnss-s3", section_ref: "Section 3", title: "Construction of references", content: "Any reference in any enactment or in any instrument to the Code of Criminal Procedure, 1973, shall be construed as a reference to the Bharatiya Nagarik Suraksha Sanhita, 2023." },
      { id: "bnss-s4", section_ref: "Section 4", title: "Trial of offences under Bharatiya Nyaya Sanhita and other laws", content: "(1) All offences under the Bharatiya Nyaya Sanhita, 2023 shall be investigated, inquired into, tried, and otherwise dealt with according to the provisions hereinafter contained. (2) All offences under any other law shall be investigated, inquired into, tried, and otherwise dealt with according to the same provisions, but subject to any enactment for the time being in force regulating the manner or place of investigating, inquiring into, trying or otherwise dealing with such offences." },
      { id: "bnss-s35", section_ref: "Section 35", title: "Arrest — when police may arrest without warrant", content: "(1) Any police officer may without an order from a Magistrate and without a warrant, arrest any person — (a) who commits, in the presence of a police officer, a cognizable offence; (b) against whom a reasonable complaint has been made, or credible information has been received, or a reasonable suspicion exists, of his having committed a cognizable offence punishable with imprisonment for a term which may extend to seven years." },
      { id: "bnss-s37", section_ref: "Section 37", title: "Arrest — how made", content: "(1) In making an arrest the police officer or other person making the same shall actually touch or confine the body of the person to be arrested, unless there be a submission to the custody by word or action. (2) If such person forcibly resists the endeavour to arrest him, or attempts to evade the arrest, such police officer or other person may use all means necessary to effect the arrest." },
      { id: "bnss-s105", section_ref: "Section 105", title: "Power to order investigation", content: "Any Magistrate empowered under section 200 may order an investigation to be made by a police officer or by such other person as he thinks fit, for the purposes of finding out whether or not a case is made out for proceeding." },
      { id: "bnss-s163", section_ref: "Section 163", title: "Search warrants", content: "(1) Where any Court has reason to believe that a person to whom a summons or order under section 161 or a requisition under section 162 has been, or might be, addressed, will not or would not produce the document or thing as required by such summons or requisition, or where such document or thing is not known to the Court to be in the possession of any person, or where the Court considers that the purposes of any inquiry, trial or other proceeding under this Sanhita will be served by a general search or inspection, it may issue a search warrant." },
      { id: "bnss-s187", section_ref: "Section 187", title: "Cognizance of offences by Magistrates", content: "Every offence shall ordinarily be inquired into and tried by a Court within whose local jurisdiction it was committed. Subject to the other provisions of this Sanhita, any Magistrate of the first class may take cognizance of any offence." },
      { id: "bnss-s480", section_ref: "Section 480", title: "Inherent powers of High Court", content: "Nothing in this Sanhita shall be deemed to limit or affect the inherent powers of the High Court to make such orders as may be necessary to give effect to any order under this Sanhita, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice." },
      { id: "bnss-s483", section_ref: "Section 483", title: "Bail", content: "When any person accused of any non-bailable offence is arrested or detained without warrant by an officer in charge of a police station, or appears or is brought before a Court, he may be released on bail." },
      { id: "bnss-s528", section_ref: "Section 528", title: "Appeals", content: "Any person convicted on a trial held by a High Court may appeal to the Supreme Court. Any person convicted on a trial held by a Sessions Judge or an Additional Sessions Judge may appeal to the High Court." },
    ],
    "Bharatiya Nyaya Sanhita, 2023": [
      { id: "bns-s1", section_ref: "Section 1", title: "Short title, commencement and application", content: "(1) This Act may be called the Bharatiya Nyaya Sanhita, 2023. (2) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint. (3) Every person shall be liable to punishment under this Sanhita and not otherwise for every act or omission contrary to the provisions thereof, of which he shall be guilty within India." },
      { id: "bns-s2", section_ref: "Section 2", title: "Definitions", content: "In this Sanhita — (1) 'act' denotes as well a series of acts as a single act; (2) 'animal' denotes any living creature, other than a human being; (3) 'court of justice' denotes a Judge who is empowered by law to act judicially, whether alone or as a member of a body of Judges; (4) 'dishonestly' — whoever does anything with the intention of causing wrongful gain to one person or wrongful loss to another person, is said to do that thing dishonestly." },
      { id: "bns-s4", section_ref: "Section 4", title: "Punishments", content: "The punishments to which offenders are liable under the provisions of this Sanhita are — (a) Death; (b) Imprisonment for life; (c) Imprisonment, which is of two descriptions, namely: (i) Rigorous, that is, with hard labour; (ii) Simple; (d) Fine; (e) Community Service." },
      { id: "bns-s24", section_ref: "Section 24", title: "General exceptions — act of a person bound by law", content: "Nothing is an offence which is done by a person who is bound by law to do it." },
      { id: "bns-s39", section_ref: "Section 39", title: "Right of private defence", content: "Every person has a right, subject to the restrictions contained in this Sanhita, to defend his own body, and the body of any other person, against any offence affecting the human body; and the property, whether movable or immovable, of himself or of any other person, against any act which is an offence falling under the definition of theft, robbery, mischief or criminal trespass." },
      { id: "bns-s100", section_ref: "Section 100", title: "Murder", content: "Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine." },
      { id: "bns-s101", section_ref: "Section 101", title: "Culpable homicide not amounting to murder", content: "Whoever causes death by doing an act with the intention of causing death, or with the intention of causing such bodily injury as is likely to cause death, or with the knowledge that he is likely by such act to cause death, commits the offence of culpable homicide not amounting to murder, if the act by which the death is caused is done without premeditation." },
      { id: "bns-s115", section_ref: "Section 115", title: "Voluntarily causing hurt", content: "Whoever does any act with the intention of thereby causing hurt to any person, or with the knowledge that he is likely thereby to cause hurt to any person, and does thereby cause hurt to any person, is said to voluntarily cause hurt." },
      { id: "bns-s303", section_ref: "Section 303", title: "Theft", content: "Whoever, intending to take dishonestly any movable property out of the possession of any person without that person's consent, moves that property in order to such taking, is said to commit theft." },
      { id: "bns-s308", section_ref: "Section 308", title: "Extortion", content: "Whoever intentionally puts any person in fear of any injury to that person, or to any other, and thereby dishonestly induces the person so put in fear to deliver to any person any property or valuable security, or anything signed or sealed which may be converted into a valuable security, commits extortion." },
      { id: "bns-s316", section_ref: "Section 316", title: "Criminal breach of trust", content: "Whoever, being in any manner entrusted with property, or with any dominion over property, dishonestly misappropriates or converts to his own use that property, or dishonestly uses or disposes of that property in violation of any direction of law prescribing the mode in which such trust is to be discharged, commits criminal breach of trust." },
      { id: "bns-s318", section_ref: "Section 318", title: "Cheating", content: "Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, or intentionally induces the person so deceived to do or omit to do anything which he would not do or omit if he were not so deceived, is said to cheat." },
      { id: "bns-s351", section_ref: "Section 351", title: "Criminal intimidation", content: "Whoever threatens another with any injury to his person, reputation or property, or to the person or reputation of any one in whom that person is interested, with intent to cause alarm to that person, or to cause that person to do any act which he is not legally bound to do, or to omit to do any act which that person is legally entitled to do, as the means of avoiding the execution of such threat, commits criminal intimidation." },
    ],
    "Bharatiya Sakshya Adhiniyam, 2023": [
      { id: "bsa-s1", section_ref: "Section 1", title: "Short title, extent and commencement", content: "This Act may be called the Bharatiya Sakshya Adhiniyam, 2023. It extends to the whole of India. It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint." },
      { id: "bsa-s2", section_ref: "Section 2", title: "Definitions", content: "In this Adhiniyam, unless the context otherwise requires — (a) 'Court' includes all Judges and Magistrates, and all persons, except arbitrators, legally authorised to take evidence; (b) 'fact' means and includes any thing, state of things, or relation of things, capable of being perceived by the senses, or any mental condition of which any person is conscious." },
      { id: "bsa-s3", section_ref: "Section 3", title: "Interpretation clause — evidence", content: "'Evidence' means and includes — (1) all statements including statements given electronically which the Court permits or requires to be made before it by witnesses, in relation to matters of fact under inquiry, such statements are called oral evidence; (2) all documents including electronic or digital records produced for the inspection of the Court, such documents are called documentary evidence." },
      { id: "bsa-s4", section_ref: "Section 4", title: "Relevancy of facts", content: "Evidence may be given in any suit or proceeding of the existence or non-existence of every fact in issue and of such other facts as are hereinafter declared to be relevant, and of no others." },
      { id: "bsa-s14", section_ref: "Section 14", title: "Facts showing existence of state of mind", content: "Facts showing the existence of any state of mind, such as intention, knowledge, good faith, negligence, rashness, ill-will or good-will towards any particular person, or showing the existence of any state of body or bodily feeling, are relevant, when the existence of any such state of mind or body or bodily feeling, is in issue or relevant." },
      { id: "bsa-s23", section_ref: "Section 23", title: "Admission — when relevant", content: "Admissions are relevant and may be proved as against the person who makes them or his representative in interest." },
      { id: "bsa-s39", section_ref: "Section 39", title: "Relevancy of certain evidence for proving subsequent conduct", content: "When there is a question whether a particular act was done, the existence of any course of business, according to which it naturally would have been done, is a relevant fact." },
      { id: "bsa-s57", section_ref: "Section 57", title: "Electronic and digital record", content: "The contents of electronic records may be proved in accordance with the provisions of section 63. Information stored in any electronic or digital form, including data, record, email, server logs, documents, voice mail, and video, is admissible in evidence." },
      { id: "bsa-s118", section_ref: "Section 118", title: "Who may testify", content: "All persons shall be competent to testify unless the Court considers that they are prevented from understanding the questions put to them, or from giving rational answers to those questions, by tender years, extreme old age, disease, whether of body or mind, or any other cause of the same kind." },
    ],
    "Constitution of India": [
      { id: "coi-a12", section_ref: "Article 12", title: "Definition of State", content: "In this Part, unless the context otherwise requires, 'the State' includes the Government and Parliament of India and the Government and the Legislature of each of the States and all local or other authorities within the territory of India or under the control of the Government of India." },
      { id: "coi-a14", section_ref: "Article 14", title: "Equality before law", content: "The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India." },
      { id: "coi-a19", section_ref: "Article 19", title: "Protection of certain rights regarding freedom of speech, etc.", content: "(1) All citizens shall have the right — (a) to freedom of speech and expression; (b) to assemble peaceably and without arms; (c) to form associations or unions or co-operative societies; (d) to move freely throughout the territory of India; (e) to reside and settle in any part of the territory of India; (g) to practise any profession, or to carry on any occupation, trade or business." },
      { id: "coi-a21", section_ref: "Article 21", title: "Protection of life and personal liberty", content: "No person shall be deprived of his life or personal liberty except according to procedure established by law." },
      { id: "coi-a21a", section_ref: "Article 21A", title: "Right to education", content: "The State shall provide free and compulsory education to all children of the age of six to fourteen years in such manner as the State may, by law, determine." },
      { id: "coi-a32", section_ref: "Article 32", title: "Remedies for enforcement of rights conferred by this Part", content: "(1) The right to move the Supreme Court by appropriate proceedings for the enforcement of the rights conferred by this Part is guaranteed. (2) The Supreme Court shall have power to issue directions or orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, whichever may be appropriate, for the enforcement of any of the rights conferred by this Part." },
      { id: "coi-a226", section_ref: "Article 226", title: "Power of High Courts to issue certain writs", content: "(1) Notwithstanding anything in article 32, every High Court shall have power, throughout the territories in relation to which it exercises jurisdiction, to issue to any person or authority, including in appropriate cases, any Government, within those territories directions, orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, or any of them, for the enforcement of any of the rights conferred by Part III and for any other purpose." },
      { id: "coi-a136", section_ref: "Article 136", title: "Special leave to appeal by the Supreme Court", content: "(1) Notwithstanding anything in this Chapter, the Supreme Court may, in its discretion, grant special leave to appeal from any judgment, decree, determination, sentence or order in any cause or matter passed or made by any court or tribunal in the territory of India." },
      { id: "coi-a141", section_ref: "Article 141", title: "Law declared by Supreme Court to be binding on all courts", content: "The law declared by the Supreme Court shall be binding on all courts within the territory of India." },
      { id: "coi-a142", section_ref: "Article 142", title: "Enforcement of decrees and orders of Supreme Court", content: "(1) The Supreme Court in the exercise of its jurisdiction may pass such decree or make such order as is necessary for doing complete justice in any cause or matter pending before it." },
      { id: "coi-a300a", section_ref: "Article 300A", title: "Right to property", content: "No person shall be deprived of his property save by authority of law." },
    ],
    "Code of Civil Procedure, 1908": [
      { id: "cpc-s1", section_ref: "Section 1", title: "Short title, commencement and extent", content: "This Act may be cited as the Code of Civil Procedure, 1908. It extends to the whole of India except the State of Jammu and Kashmir." },
      { id: "cpc-s2", section_ref: "Section 2", title: "Definitions", content: "In this Act, unless there is anything repugnant in the subject or context — (1) 'Code' includes rules; (2) 'decree' means the formal expression of an adjudication which, so far as regards the Court expressing it, conclusively determines the rights of the parties with regard to all or any of the matters in controversy in the suit; (3) 'judgment' means the statement given by the Judge of the grounds of a decree or order." },
      { id: "cpc-s9", section_ref: "Section 9", title: "Courts to try all civil suits unless barred", content: "The Courts shall (subject to the provisions herein contained) have jurisdiction to try all suits of a civil nature excepting suits of which their cognizance is either expressly or impliedly barred." },
      { id: "cpc-s10", section_ref: "Section 10", title: "Stay of suit — res sub judice", content: "No Court shall proceed with the trial of any suit in which the matter in issue is also directly and substantially in issue in a previously instituted suit between the same parties, or between parties under whom they or any of them claim, litigating under the same title where such suit is pending in the same or any other Court in India having jurisdiction to grant the relief claimed." },
      { id: "cpc-s11", section_ref: "Section 11", title: "Res judicata", content: "No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and substantially in issue in a former suit between the same parties, or between parties under whom they or any of them claim, litigating under the same title, in a Court competent to try such subsequent suit or the suit in which such issue has been subsequently raised, and has been heard and finally decided by such Court." },
      { id: "cpc-o7r11", section_ref: "Order VII Rule 11", title: "Rejection of plaint", content: "The plaint shall be rejected in the following cases: (a) where it does not disclose a cause of action; (b) where the relief claimed is undervalued, and the plaintiff, on being required by the Court to correct the valuation within a time to be fixed by the Court, fails to do so; (c) where the relief claimed is properly valued, but the plaint is written upon paper insufficiently stamped, and the plaintiff, on being required by the Court to supply the requisite stamp-paper within a time to be fixed by the Court, fails to do so; (d) where the suit appears from the statement in the plaint to be barred by any law." },
      { id: "cpc-o39", section_ref: "Order XXXIX", title: "Temporary injunctions and interlocutory orders", content: "Rule 1 — Where in any suit it is proved by affidavit or otherwise that any property in dispute in a suit is in danger of being wasted, damaged or alienated by any party to the suit, or wrongfully sold in execution of a decree, the Court may by order grant a temporary injunction to restrain such act. Rule 2 — In any suit for restraining the defendant from committing a breach of contract or other injury of any kind, the Court may grant a temporary injunction." },
      { id: "cpc-s96", section_ref: "Section 96", title: "Appeal from original decree", content: "(1) Save where otherwise expressly provided in the body of this Code or by any other law for the time being in force, an appeal shall lie from every decree passed by any Court exercising original jurisdiction to the Court authorised to hear appeals from the decisions of such Court." },
      { id: "cpc-s100", section_ref: "Section 100", title: "Second appeal", content: "(1) Save as otherwise expressly provided in the body of this Code or by any other law for the time being in force, an appeal shall lie to the High Court from every decree passed in appeal by any Court subordinate to the High Court, if the High Court is satisfied that the case involves a substantial question of law." },
      { id: "cpc-s115", section_ref: "Section 115", title: "Revision", content: "The High Court may call for the record of any case which has been decided by any Court subordinate to such High Court and in which no appeal lies thereto, and if such subordinate Court appears — (a) to have exercised a jurisdiction not vested in it by law; (b) to have failed to exercise a jurisdiction so vested; (c) to have acted in the exercise of its jurisdiction illegally or with material irregularity — the High Court may make such order in the case as it thinks fit." },
    ],
    "Indian Penal Code, 1860": [
      { id: "ipc-s1", section_ref: "Section 1", title: "Title and extent of operation of the Code", content: "This Act shall be called the Indian Penal Code, and shall extend to the whole of India." },
      { id: "ipc-s34", section_ref: "Section 34", title: "Acts done by several persons in furtherance of common intention", content: "When a criminal act is done by several persons in furtherance of the common intention of all, each of such persons is liable for that act in the same manner as if it were done by him alone." },
      { id: "ipc-s299", section_ref: "Section 299", title: "Culpable homicide", content: "Whoever causes death by doing an act with the intention of causing death, or with the intention of causing such bodily injury as is likely to cause death, or with the knowledge that he is likely by such act to cause death, commits the offence of culpable homicide." },
      { id: "ipc-s300", section_ref: "Section 300", title: "Murder", content: "Except in the cases hereinafter excepted, culpable homicide is murder, if the act by which the death is caused is done with the intention of causing death, or if it is done with the intention of causing such bodily injury as the offender knows to be likely to cause the death of the person to whom the harm is caused." },
      { id: "ipc-s302", section_ref: "Section 302", title: "Punishment for murder", content: "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine." },
      { id: "ipc-s304a", section_ref: "Section 304A", title: "Causing death by negligence", content: "Whoever causes the death of any person by doing any rash or negligent act not amounting to culpable homicide, shall be punished with imprisonment of either description for a term which may extend to two years, or with fine, or with both." },
      { id: "ipc-s376", section_ref: "Section 376", title: "Punishment for rape", content: "Whoever commits rape shall be punished with rigorous imprisonment of either description for a term which shall not be less than ten years, but which may extend to imprisonment for life, and shall also be liable to fine." },
      { id: "ipc-s420", section_ref: "Section 420", title: "Cheating and dishonestly inducing delivery of property", content: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine." },
      { id: "ipc-s498a", section_ref: "Section 498A", title: "Husband or relative of husband subjecting woman to cruelty", content: "Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to three years and shall also be liable to fine." },
      { id: "ipc-s482", section_ref: "Section 482", title: "Saving of inherent powers of High Court (CrPC)", content: "Nothing in this Code shall be deemed to limit or affect the inherent powers of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice. [Note: Section 482 is from the Code of Criminal Procedure, 1973 (CrPC), not IPC. It is often referenced alongside IPC sections in practice.]" },
    ],
    "Limitation Act, 1963": [
      { id: "la-s1", section_ref: "Section 1", title: "Short title, extent and commencement", content: "This Act may be called the Limitation Act, 1963. It extends to the whole of India." },
      { id: "la-s2", section_ref: "Section 2", title: "Definitions", content: "In this Act, unless the context otherwise requires — (a) 'applicant' includes a petitioner in proceedings and any person from or through whom an applicant derives his right to apply; (b) 'application' includes a petition; (c) 'bill of exchange' includes a hundi and a cheque; (d) 'bond' includes any instrument whereby a person obliges himself to pay money to another." },
      { id: "la-s3", section_ref: "Section 3", title: "Bar of limitation", content: "Subject to the provisions contained in sections 4 to 24 (inclusive), every suit instituted, appeal preferred, and application made after the prescribed period shall be dismissed, although limitation has not been set up as a defence." },
      { id: "la-s5", section_ref: "Section 5", title: "Extension of prescribed period in certain cases", content: "Any appeal or any application, other than an application under any of the provisions of Order XXI of the Code of Civil Procedure, 1908, may be admitted after the prescribed period if the appellant or the applicant satisfies the court that he had sufficient cause for not preferring the appeal or making the application within such period." },
      { id: "la-s14", section_ref: "Section 14", title: "Exclusion of time of proceeding bona fide in court without jurisdiction", content: "In computing the period of limitation for any suit the time during which the plaintiff has been prosecuting with due diligence another civil proceeding, whether in a court of first instance or of appeal or revision, against the defendant shall be excluded, where the proceeding relates to the same matter in issue and is prosecuted in good faith in a court which, from defect of jurisdiction or other cause of a like nature, is unable to entertain it." },
      { id: "la-s17", section_ref: "Section 17", title: "Effect of fraud or mistake", content: "Where, in the case of any suit or application for which a period of limitation is prescribed under this Act — (1) the suit or application is based upon the fraud of the defendant or respondent or his agent; or (2) the knowledge of the right or title on which a suit or application is founded is concealed by the fraud of any such person as aforesaid — the period of limitation shall not begin to run until the plaintiff or applicant has discovered the fraud or the mistake." },
    ],
    "Negotiable Instruments Act, 1881": [
      { id: "ni-s1", section_ref: "Section 1", title: "Short title and commencement", content: "This Act may be called the Negotiable Instruments Act, 1881." },
      { id: "ni-s4", section_ref: "Section 4", title: "Promissory note", content: "A 'promissory note' is an instrument in writing (not being a bank-note or a currency-note) containing an unconditional undertaking, signed by the maker, to pay a certain sum of money only to, or to the order of, a certain person, or to the bearer of the instrument." },
      { id: "ni-s5", section_ref: "Section 5", title: "Bill of exchange", content: "A 'bill of exchange' is an instrument in writing containing an unconditional order, signed by the maker, directing a certain person to pay a certain sum of money only to, or to the order of, a certain person or to the bearer of the instrument." },
      { id: "ni-s6", section_ref: "Section 6", title: "Cheque", content: "A 'cheque' is a bill of exchange drawn on a specified banker and not expressed to be payable otherwise than on demand and it includes the electronic image of a truncated cheque and a cheque in the electronic form." },
      { id: "ni-s138", section_ref: "Section 138", title: "Dishonour of cheque for insufficiency of funds", content: "Where any cheque drawn by a person on an account maintained by him with a banker for payment of any amount of money to another person from out of that account for the discharge, in whole or in part, of any debt or other liability, is returned by the bank unpaid, either because of the amount of money standing to the credit of that account is insufficient to honour the cheque or that it exceeds the amount arranged to be paid from that account by an agreement made with that bank, such person shall be deemed to have committed an offence and shall be punished with imprisonment for a term which may extend to two years, or with fine which may extend to twice the amount of the cheque, or with both." },
      { id: "ni-s139", section_ref: "Section 139", title: "Presumption in favour of holder", content: "It shall be presumed, unless the contrary is proved, that the holder of a cheque received the cheque of the nature referred to in section 138 for the discharge, in whole or in part, of any debt or other liability." },
      { id: "ni-s141", section_ref: "Section 141", title: "Offences by companies", content: "If the person committing an offence under section 138 is a company, every person who, at the time the offence was committed, was in charge of, and was responsible to, the company for the conduct of the business of the company, as well as the company, shall be deemed to be guilty of the offence and shall be liable to be proceeded against and punished accordingly." },
      { id: "ni-s142", section_ref: "Section 142", title: "Cognizance of offences", content: "Notwithstanding anything contained in the Code of Criminal Procedure, 1973 — (a) no court shall take cognizance of any offence punishable under section 138 except upon a complaint, in writing, made by the payee or, as the case may be, the holder in due course of the cheque; (b) such complaint is made within one month of the date on which the cause of action arises under clause (c) of the proviso to section 138." },
    ],
  };

  // Generic fallback sections for acts not in the map
  const fallbackSections: ActSection[] = [
    { id: "mock-s1", section_ref: "Section 1", title: "Short title, extent and commencement", content: `This Act may be called the ${actTitle}. It extends to the whole of India. It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint.` },
    { id: "mock-s2", section_ref: "Section 2", title: "Definitions", content: "In this Act, unless the context otherwise requires — (a) the terms used herein shall have the meanings assigned to them in the respective definitions section of this Act." },
    { id: "mock-s3", section_ref: "Section 3", title: "Application", content: "The provisions of this Act shall apply to all matters and proceedings as specified, subject to the exceptions and conditions contained herein." },
  ];

  const sections = actSectionsMap[actTitle] ?? fallbackSections;
  return { act, sections };
}

export const indianKanoonService = {
  searchCaseLaw,
  browseActs,
  getActSections,
};
