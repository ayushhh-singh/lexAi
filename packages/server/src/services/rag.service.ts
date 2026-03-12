import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { supabaseAdmin } from "../lib/supabase.js";
import { config } from "../lib/config.js";
import type {
  SearchFilters,
  ScoredChunk,
  QueryIntent,
} from "@nyay/shared";

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const RERANK_MODEL = "claude-haiku-4-5-20251001";
const EXPLAIN_MODEL = "claude-haiku-4-5-20251001";
const EMBEDDING_MODEL = "text-embedding-3-small";
const RRF_K = 60;
const CONTEXT_TOKEN_BUDGET = 4000;
const CHARS_PER_TOKEN = 4; // rough estimate
const MAX_QUERY_LENGTH = 2000;
const VALID_SOURCE_TYPES = new Set(["act", "judgement", "commentary", "article"]);

// ---------------------------------------------------------------------------
// 1. Semantic search — pgvector cosine similarity
// ---------------------------------------------------------------------------
export async function semanticSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20
): Promise<ScoredChunk[]> {
  console.log(`[rag] semanticSearch — query="${query.slice(0, 80)}", filters=${JSON.stringify(filters)}, limit=${limit}`);
  const startTime = Date.now();
  const safeQuery = query.slice(0, MAX_QUERY_LENGTH);
  const safeSourceType = sanitizeSourceType(filters.source_type);
  const embedding = await embed(safeQuery);
  console.log(`[rag] embedding generated — ${Date.now() - startTime}ms`);

  const { data, error } = await supabaseAdmin.rpc("match_chunks_semantic", {
    query_embedding: JSON.stringify(embedding),
    match_limit: limit,
    filter_source_type: safeSourceType,
  });

  if (error) {
    console.error(`[rag] semanticSearch failed: ${error.message}`);
    throw new Error(`Semantic search failed: ${error.message}`);
  }

  const results = (data ?? []).map((row) => ({
    id: row.id,
    source_type: row.source_type,
    source_title: row.source_title,
    section_ref: row.section_ref,
    content: row.content,
    summary: row.summary,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    score: row.similarity,
  }));
  console.log(`[rag] semanticSearch done — ${results.length} results, ${Date.now() - startTime}ms`);
  return results;
}

// ---------------------------------------------------------------------------
// 2. Keyword search — PostgreSQL FTS ts_query with ranking
// ---------------------------------------------------------------------------
export async function keywordSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20
): Promise<ScoredChunk[]> {
  console.log(`[rag] keywordSearch — query="${query.slice(0, 80)}", limit=${limit}`);
  const startTime = Date.now();
  const safeQuery = query.slice(0, MAX_QUERY_LENGTH);
  const safeSourceType = sanitizeSourceType(filters.source_type);

  const { data, error } = await supabaseAdmin.rpc("match_chunks_keyword", {
    search_query: safeQuery,
    match_limit: limit,
    filter_source_type: safeSourceType,
  });

  if (error) {
    console.error(`[rag] keywordSearch failed: ${error.message}`);
    throw new Error(`Keyword search failed: ${error.message}`);
  }

  const results = (data ?? []).map((row) => ({
    id: row.id,
    source_type: row.source_type,
    source_title: row.source_title,
    section_ref: row.section_ref,
    content: row.content,
    summary: row.summary,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    score: row.fts_rank,
  }));
  console.log(`[rag] keywordSearch done — ${results.length} results, ${Date.now() - startTime}ms`);
  return results;
}

// ---------------------------------------------------------------------------
// 3. Hybrid search — run both parallel, merge with RRF, deduplicate
// ---------------------------------------------------------------------------
export async function hybridSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 10
): Promise<ScoredChunk[]> {
  console.log(`[rag] hybridSearch — query="${query.slice(0, 80)}", limit=${limit}`);
  const startTime = Date.now();
  const [semantic, keyword] = await Promise.all([
    semanticSearch(query, filters, 20),
    keywordSearch(query, filters, 20),
  ]);

  // Reciprocal Rank Fusion
  const scoreMap = new Map<string, { chunk: ScoredChunk; rrfScore: number }>();

  semantic.forEach((chunk, rank) => {
    const rrfScore = 1 / (RRF_K + rank + 1);
    scoreMap.set(chunk.id, { chunk, rrfScore });
  });

  keyword.forEach((chunk, rank) => {
    const rrfScore = 1 / (RRF_K + rank + 1);
    const existing = scoreMap.get(chunk.id);
    if (existing) {
      existing.rrfScore += rrfScore;
    } else {
      scoreMap.set(chunk.id, { chunk, rrfScore });
    }
  });

  // Sort by combined RRF score, deduplicated by id
  const merged = Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, limit)
    .map(({ chunk, rrfScore }) => ({ ...chunk, score: rrfScore }));
  console.log(`[rag] hybridSearch done — semantic=${semantic.length}, keyword=${keyword.length}, merged=${merged.length}, ${Date.now() - startTime}ms`);
  return merged;
}

// ---------------------------------------------------------------------------
// 4. Rerank — Claude Haiku scores relevance 1-10 for top-20 -> return top-5
// ---------------------------------------------------------------------------
export async function rerank(
  query: string,
  chunks: ScoredChunk[],
  topK = 5
): Promise<ScoredChunk[]> {
  if (chunks.length === 0) {
    console.log(`[rag] rerank skipped — no chunks`);
    return [];
  }
  if (chunks.length <= topK) {
    console.log(`[rag] rerank skipped — ${chunks.length} chunks <= topK=${topK}`);
    return chunks;
  }
  console.log(`[rag] rerank start — ${chunks.length} chunks, topK=${topK}`);
  const startTime = Date.now();

  const top20 = chunks.slice(0, 20);

  const chunkList = top20
    .map(
      (c, i) =>
        `[${i + 1}] ${c.source_title}${c.section_ref ? ` — ${c.section_ref}` : ""}\n${c.content.slice(0, 400)}`
    )
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: RERANK_MODEL,
    max_tokens: 200,
    system:
      "You are a legal relevance scorer. Given a query and numbered legal text chunks, " +
      "rate each chunk's relevance to the query from 1 (irrelevant) to 10 (highly relevant). " +
      "Reply with ONLY lines in format: N|SCORE (e.g., 1|8). No extra text.",
    messages: [
      {
        role: "user",
        content: `Query: ${query}\n\nChunks:\n${chunkList}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse scores
  const scores = new Map<number, number>();
  for (const line of text.trim().split("\n")) {
    const match = line.match(/^(\d+)\|(\d+)/);
    if (match) {
      scores.set(Number(match[1]), Number(match[2]));
    }
  }

  // Apply rerank scores and sort
  const scored = top20.map((chunk, i) => ({
    ...chunk,
    score: scores.get(i + 1) ?? 5, // default to 5 if parsing fails
  }));

  const result = scored.sort((a, b) => b.score - a.score).slice(0, topK);
  console.log(`[rag] rerank done — ${result.length} results, scores=[${result.map(r => r.score).join(",")}], ${Date.now() - startTime}ms`);
  return result;
}

// ---------------------------------------------------------------------------
// 5. Build context — format as numbered sources, ~4000 token budget
// ---------------------------------------------------------------------------
export function buildContext(chunks: ScoredChunk[]): string {
  const maxChars = CONTEXT_TOKEN_BUDGET * CHARS_PER_TOKEN;
  const sources: string[] = [];
  let totalChars = 0;

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const ref = c.section_ref ? ` — ${c.section_ref}` : "";
    const header = `[Source ${i + 1}: ${c.source_title}${ref}]`;
    const entry = `${header}\n${c.content}`;

    if (totalChars + entry.length > maxChars) break;

    sources.push(entry);
    totalChars += entry.length;
  }

  return sources.join("\n\n");
}

// ---------------------------------------------------------------------------
// 6. Pipeline — full RAG pipeline for research queries
// ---------------------------------------------------------------------------
export async function pipeline(
  query: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<{
  intent: QueryIntent;
  context: string;
  chunks: ScoredChunk[];
  systemPrompt: string;
}> {
  console.log(`[rag] pipeline start — query="${query.slice(0, 80)}", history=${history.length}`);
  const pipelineStart = Date.now();

  // 1. Classify intent
  const intent = await classifyQuery(query);
  console.log(`[rag] pipeline intent="${intent}"`);

  // 2. Extract entities to refine search filters
  const filters = extractFilters(query);

  // 3. Hybrid search
  const searchResults = await hybridSearch(query, filters, 20);

  // 4. Rerank
  const reranked = await rerank(query, searchResults, 5);

  // 5. Build context
  const context = buildContext(reranked);

  // 6. Construct system prompt
  const historyText = history
    .slice(-4) // last 2 exchanges
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join("\n");

  const systemPrompt = [
    "You are Nyay Sahayak, a legal research assistant for Indian lawyers.",
    "Answer the query using ONLY the provided context from Indian legal sources.",
    "If the context does not contain enough information, state that clearly.",
    "",
    "Rules:",
    "- Cite every claim with [Source N] notation matching the numbered sources.",
    "- Distinguish binding vs persuasive authority.",
    "- For offences after 1 July 2024, reference BNS/BNSS/BSA; for prior, IPC/CrPC/IEA.",
    "- Use Indian legal terminology.",
    "- Be precise and concise.",
    "",
    historyText ? `Recent conversation:\n${historyText}\n` : "",
    `<context>\n${context}\n</context>`,
  ]
    .filter(Boolean)
    .join("\n");

  console.log(`[rag] pipeline done — intent=${intent}, chunks=${reranked.length}, contextChars=${context.length}, ${Date.now() - pipelineStart}ms`);
  return { intent, context, chunks: reranked, systemPrompt };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeSourceType(value: string | undefined): string | null {
  if (!value) return null;
  return VALID_SOURCE_TYPES.has(value) ? value : null;
}

async function embed(text: string): Promise<number[]> {
  const startTime = Date.now();
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  console.log(`[rag] embed done — ${res.data[0].embedding.length} dims, ${Date.now() - startTime}ms`);
  return res.data[0].embedding;
}

async function classifyQuery(query: string): Promise<QueryIntent> {
  const startTime = Date.now();
  const response = await anthropic.messages.create({
    model: RERANK_MODEL,
    max_tokens: 50,
    system:
      "Classify the legal query intent. Reply with ONLY one category:\n" +
      "general_query, case_law_research, statute_lookup, draft_document, " +
      "summarize, procedural_question, opinion",
    messages: [{ role: "user", content: query }],
  });

  const text =
    response.content[0].type === "text"
      ? response.content[0].text.trim().toLowerCase()
      : "general_query";

  const valid: QueryIntent[] = [
    "general_query",
    "case_law_research",
    "statute_lookup",
    "draft_document",
    "summarize",
    "procedural_question",
    "opinion",
  ];
  const result = valid.includes(text as QueryIntent)
    ? (text as QueryIntent)
    : "general_query";
  console.log(`[rag] classifyQuery="${result}" — ${Date.now() - startTime}ms`);
  return result;
}

function extractFilters(query: string): SearchFilters {
  const lower = query.toLowerCase();

  // Detect source type from query keywords
  if (
    /\b(section|act|statute|bns|bnss|bsa|ipc|crpc|cpc|evidence)\b/.test(lower)
  ) {
    return { source_type: "act" };
  }
  if (/\b(judgement|judgment|case law|precedent|ruling|verdict)\b/.test(lower)) {
    return { source_type: "judgement" };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Cache helpers for research/explain endpoint
// ---------------------------------------------------------------------------

export function hashQuery(query: string, filters?: SearchFilters): string {
  const normalized = JSON.stringify({ q: query.toLowerCase().trim(), f: filters ?? {} });
  return createHash("sha256").update(normalized).digest("hex");
}

export async function getCachedExplanation(
  queryHash: string
): Promise<{ response: string; source_chunk_ids: string[] } | null> {
  console.log(`[rag] getCachedExplanation — hash=${queryHash.slice(0, 12)}`);
  const { data } = await supabaseAdmin
    .from("research_cache")
    .select("response, source_chunk_ids")
    .eq("query_hash", queryHash)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (!data) {
    console.log(`[rag] cache miss — hash=${queryHash.slice(0, 12)}`);
    return null;
  }
  console.log(`[rag] cache hit — hash=${queryHash.slice(0, 12)}`);
  return { response: data.response, source_chunk_ids: data.source_chunk_ids ?? [] };
}

export async function cacheExplanation(
  queryHash: string,
  query: string,
  response: string,
  chunkIds: string[]
): Promise<void> {
  await supabaseAdmin.from("research_cache").insert({
    query_hash: queryHash,
    query,
    response,
    source_chunk_ids: chunkIds,
  });
}

export async function explain(
  query: string,
  context: string
): Promise<string> {
  console.log(`[rag] explain start — query="${query.slice(0, 80)}", contextChars=${context.length}`);
  const startTime = Date.now();
  const response = await anthropic.messages.create({
    model: EXPLAIN_MODEL,
    max_tokens: 2048,
    system:
      "You are a legal research assistant. Answer the query using ONLY the provided context.\n" +
      "Cite every claim with [Source N] notation. If context is insufficient, say so.\n" +
      "Use Indian legal terminology. Be precise and concise.",
    messages: [
      {
        role: "user",
        content: `<context>\n${context}\n</context>\n\n<query>\n${query}\n</query>`,
      },
    ],
  });

  const block = response.content[0];
  const result = block.type === "text" ? block.text : "";
  console.log(`[rag] explain done — ${result.length} chars, ${Date.now() - startTime}ms`);
  return result;
}

export const ragService = {
  semanticSearch,
  keywordSearch,
  hybridSearch,
  rerank,
  buildContext,
  pipeline,
  explain,
  hashQuery,
  getCachedExplanation,
  cacheExplanation,
};
