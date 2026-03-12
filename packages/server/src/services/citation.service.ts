import { supabaseAdmin } from "../lib/supabase.js";
import {
  parseCitations as parseFromShared,
  type ParsedCitation,
  type CitationVerification,
  type Citation,
} from "@nyay/shared";

const IK_TOKEN = process.env.INDIAN_KANOON_API_KEY ?? "";
const IK_BASE = "https://api.indiankanoon.org";
const HAS_IK = !!IK_TOKEN;

// ---------------------------------------------------------------------------
// 1. parseCitations — extract structured citations from AI response text
// ---------------------------------------------------------------------------
export function parseCitations(text: string): ParsedCitation[] {
  return parseFromShared(text);
}

// ---------------------------------------------------------------------------
// 2. verifyCitations — search legal_chunks for each citation
//    Caps concurrency at 5 and isolates failures per citation.
// ---------------------------------------------------------------------------
const MAX_CONCURRENT_VERIFICATIONS = 5;
const MAX_CITATIONS_TO_VERIFY = 20;

export async function verifyCitations(
  parsed: ParsedCitation[]
): Promise<CitationVerification[]> {
  if (parsed.length === 0) return [];

  // Cap to prevent excessive DB load from hallucination-heavy responses
  const toVerify = parsed.slice(0, MAX_CITATIONS_TO_VERIFY);
  const results: CitationVerification[] = [];

  // Process in batches to cap concurrent DB connections
  for (let i = 0; i < toVerify.length; i += MAX_CONCURRENT_VERIFICATIONS) {
    const batch = toVerify.slice(i, i + MAX_CONCURRENT_VERIFICATIONS);
    const batchResults = await Promise.all(batch.map(verifySingle));
    results.push(...batchResults);
  }

  return results;
}

async function verifySingle(
  citation: ParsedCitation
): Promise<CitationVerification> {
  try {
    const isCaseCitation = isCaseFormat(citation.format);

    // ── Layer 1: Metadata citation match (for case citations stored via lazy-populate) ──
    if (isCaseCitation) {
      const metaResult = await verifyViaMetadata(citation);
      if (metaResult) return metaResult;
    }

    // ── Layer 2: FTS keyword search against legal_chunks ──
    const searchTerm = buildSearchTerm(citation);
    const { data, error } = await supabaseAdmin.rpc("match_chunks_keyword", {
      search_query: searchTerm,
      match_limit: 3,
      filter_source_type: getSourceTypeFilter(citation),
    });

    if (error) {
      console.error(`[citation-verify] RPC error for "${citation.raw}":`, error.message);
    } else if (data && data.length > 0) {
      const best = data[0];
      return {
        citation,
        verified: true,
        chunk_id: best.id,
        source_title: best.source_title,
      };
    }

    // ── Layer 2b: Retry FTS without source_type filter (broader match) ──
    if (getSourceTypeFilter(citation)) {
      const { data: broadData } = await supabaseAdmin.rpc("match_chunks_keyword", {
        search_query: searchTerm,
        match_limit: 3,
        filter_source_type: null,
      });
      if (broadData && broadData.length > 0) {
        const best = broadData[0];
        return {
          citation,
          verified: true,
          chunk_id: best.id,
          source_title: best.source_title,
        };
      }
    }

    // ── Layer 3: Indian Kanoon API verification (for case citations) ──
    if (isCaseCitation && HAS_IK) {
      const ikResult = await verifyViaIndianKanoon(citation);
      if (ikResult) return ikResult;
    }

    return {
      citation,
      verified: false,
      suggestion: buildSuggestion(citation),
    };
  } catch (err) {
    console.error(`[citation-verify] Unexpected error for "${citation.raw}":`, err);
    return { citation, verified: false, suggestion: "Verification failed unexpectedly." };
  }
}

function isCaseFormat(format: string): boolean {
  return ["AIR", "SCC", "NEUTRAL", "SCR", "SCC_ONLINE", "ILR", "CRLJ"].includes(format);
}

// Search metadata->>'citation' for cases stored via lazy-populate
async function verifyViaMetadata(
  citation: ParsedCitation
): Promise<CitationVerification | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("legal_chunks")
      .select("id, source_title")
      .eq("source_type", "judgement")
      .ilike("metadata->>citation", `%${citation.raw}%`)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    return {
      citation,
      verified: true,
      chunk_id: data[0].id,
      source_title: data[0].source_title,
    };
  } catch {
    return null;
  }
}

// Verify case citations via Indian Kanoon search API
async function verifyViaIndianKanoon(
  citation: ParsedCitation
): Promise<CitationVerification | null> {
  try {
    const url = new URL("/search/", IK_BASE);
    url.searchParams.set("formInput", citation.raw);
    url.searchParams.set("pagenum", "0");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Token ${IK_TOKEN}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5s timeout per citation
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { docs?: Array<{ tid: string; title: string }> };
    const docs = data.docs ?? [];

    if (docs.length > 0) {
      console.log(`[citation-verify] Verified via Indian Kanoon: "${citation.raw}" → ${docs[0].title}`);
      return {
        citation,
        verified: true,
        source_title: docs[0].title,
      };
    }

    return null;
  } catch {
    // Network/timeout errors — don't block verification
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. toCitations — convert verification results to Citation[] for storage
// ---------------------------------------------------------------------------
export function toCitations(verifications: CitationVerification[]): Citation[] {
  return verifications.map((v) => ({
    text: v.citation.raw,
    source: v.source_title ?? v.citation.act ?? v.citation.raw,
    source_type: inferSourceType(v.citation),
    chunk_id: v.chunk_id,
    verified: v.verified,
  }));
}

// ---------------------------------------------------------------------------
// 4. logUnverified — log gaps in knowledge base for future ingestion
// ---------------------------------------------------------------------------
export function logUnverified(verifications: CitationVerification[]): void {
  const unverified = verifications.filter((v) => !v.verified);
  if (unverified.length === 0) return;

  console.warn(
    `[citation-gaps] ${unverified.length} unverified citation(s):`,
    unverified.map((v) => ({
      citation: v.citation.raw,
      format: v.citation.format,
      suggestion: v.suggestion,
    }))
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSearchTerm(c: ParsedCitation): string {
  switch (c.format) {
    case "AIR":
    case "SCC":
    case "NEUTRAL":
    case "SCR":
    case "SCC_ONLINE":
    case "ILR":
    case "CRLJ":
      // For case citations, search the raw citation string
      return c.raw;
    case "SECTION_REF":
      return `Section ${c.section} ${c.act}`;
    case "ARTICLE_REF":
      return `Article ${c.section} Constitution`;
    case "ORDER_RULE":
      return `${c.section} ${c.act}`;
    default:
      return c.raw;
  }
}

function getSourceTypeFilter(c: ParsedCitation): string | null {
  switch (c.format) {
    case "AIR":
    case "SCC":
    case "NEUTRAL":
    case "SCR":
    case "SCC_ONLINE":
    case "ILR":
    case "CRLJ":
      return "judgement";
    case "SECTION_REF":
    case "ARTICLE_REF":
    case "ORDER_RULE":
      return "act";
    default:
      return null;
  }
}

function inferSourceType(c: ParsedCitation): "act" | "judgement" | "commentary" | "article" {
  switch (c.format) {
    case "AIR":
    case "SCC":
    case "NEUTRAL":
    case "SCR":
    case "SCC_ONLINE":
    case "ILR":
    case "CRLJ":
      return "judgement";
    case "SECTION_REF":
    case "ARTICLE_REF":
    case "ORDER_RULE":
      return "act";
    default:
      return "commentary";
  }
}

function buildSuggestion(c: ParsedCitation): string {
  switch (c.format) {
    case "AIR":
    case "SCC":
    case "NEUTRAL":
    case "SCR":
    case "SCC_ONLINE":
    case "ILR":
    case "CRLJ":
      return `Case "${c.raw}" not found in knowledge base. Verify manually.`;
    case "SECTION_REF":
      return `Section ${c.section} of ${c.act} not found. Check if the statute has been ingested.`;
    case "ARTICLE_REF":
      return `Article ${c.section} of Constitution not found in knowledge base.`;
    case "ORDER_RULE":
      return `${c.section} of ${c.act} not found. Check procedural code ingestion.`;
    default:
      return `Citation "${c.raw}" could not be verified.`;
  }
}

export const citationService = {
  parseCitations,
  verifyCitations,
  toCitations,
  logUnverified,
};
