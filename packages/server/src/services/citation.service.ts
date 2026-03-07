import { supabaseAdmin } from "../lib/supabase.js";
import {
  parseCitations as parseFromShared,
  type ParsedCitation,
  type CitationVerification,
  type Citation,
} from "@nyay/shared";

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
    const searchTerm = buildSearchTerm(citation);

    // Use FTS keyword search against legal_chunks for fast lookup
    const { data, error } = await supabaseAdmin.rpc("match_chunks_keyword", {
      search_query: searchTerm,
      match_limit: 3,
      filter_source_type: getSourceTypeFilter(citation),
    });

    if (error) {
      console.error(`[citation-verify] RPC error for "${citation.raw}":`, error.message);
      return { citation, verified: false, suggestion: "Verification failed due to a database error." };
    }

    const chunks = data ?? [];

    if (chunks.length > 0) {
      const best = chunks[0];
      return {
        citation,
        verified: true,
        chunk_id: best.id,
        source_title: best.source_title,
      };
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
