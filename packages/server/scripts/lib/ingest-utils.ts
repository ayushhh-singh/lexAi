import OpenAI from "openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SourceType } from "@nyay/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ChunkRecord {
  source_type: SourceType;
  source_title: string;
  section_ref: string | null;
  content: string;
  summary: string | null;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Clients (lazy-initialized)
// ---------------------------------------------------------------------------
let _openai: OpenAI | null = null;
let _supabase: SupabaseClient | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
      );
    }
    _supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabase;
}

// ---------------------------------------------------------------------------
// Rate-limiting helper
// ---------------------------------------------------------------------------
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Hierarchical chunking
//   ~500 chars per chunk, 100 char overlap, preserve section boundaries
// ---------------------------------------------------------------------------
export function chunkText(
  text: string,
  maxChars = 500,
  overlap = 100
): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let buffer = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (buffer.length + trimmed.length + 1 <= maxChars) {
      buffer += (buffer ? "\n\n" : "") + trimmed;
    } else {
      // Flush current buffer
      if (buffer) chunks.push(buffer);

      // If a single paragraph exceeds maxChars, split it by sentences
      if (trimmed.length > maxChars) {
        const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
        let sentBuf = "";
        for (const sent of sentences) {
          if (sentBuf.length + sent.length <= maxChars) {
            sentBuf += sent;
          } else {
            if (sentBuf) chunks.push(sentBuf.trim());
            // If a single sentence still exceeds maxChars, hard-split it
            if (sent.length > maxChars) {
              for (let k = 0; k < sent.length; k += maxChars) {
                const slice = sent.slice(k, k + maxChars);
                if (k + maxChars < sent.length) {
                  chunks.push(slice.trim());
                } else {
                  sentBuf = slice;
                }
              }
              continue;
            }
            sentBuf = sent;
          }
        }
        buffer = sentBuf;
      } else {
        buffer = trimmed;
      }
    }
  }
  if (buffer) chunks.push(buffer);

  // Apply overlap: prepend tail of previous chunk, breaking at word boundary
  if (overlap > 0 && chunks.length > 1) {
    const overlapped: string[] = [chunks[0]];
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1];
      let tail = prev.slice(-overlap);
      // Advance to next word boundary to avoid mid-word splits
      const wordBreak = tail.indexOf(" ");
      if (wordBreak > 0 && wordBreak < tail.length - 1) {
        tail = tail.slice(wordBreak + 1);
      }
      overlapped.push(tail + "\n" + chunks[i]);
    }
    return overlapped;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Contextual summaries via GPT-4o-mini  (~150 chars each)
//   Batched: up to 20 chunks per call, 3 req/sec
// ---------------------------------------------------------------------------
export async function generateSummaries(
  chunks: string[],
  batchSize = 20
): Promise<string[]> {
  const openai = getOpenAI();
  const summaries: string[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const prompt = batch
      .map(
        (c, idx) =>
          `[CHUNK ${idx + 1}]\n${c.slice(0, 600)}\n[/CHUNK ${idx + 1}]`
      )
      .join("\n\n");

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: batch.length * 60,
      messages: [
        {
          role: "system",
          content:
            "You summarize Indian legal text chunks. For each [CHUNK N], " +
            "return exactly one line: N|<summary up to 150 chars>. " +
            "No extra text. The summary should capture the legal provision, " +
            "section reference, and key concept.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "";
    const lines = raw.trim().split("\n");
    const parsed = new Map<number, string>();
    for (const line of lines) {
      const m = line.match(/^(\d+)\|(.+)/);
      if (m) parsed.set(Number(m[1]), m[2].trim());
    }

    for (let j = 0; j < batch.length; j++) {
      summaries.push(parsed.get(j + 1) ?? batch[j].slice(0, 150));
    }

    if (i + batchSize < chunks.length) await sleep(340); // ~3 req/sec
  }

  return summaries;
}

// ---------------------------------------------------------------------------
// Embeddings via text-embedding-3-small (1536d)
//   Batch: 100 texts/call, 3 req/sec
// ---------------------------------------------------------------------------
export async function generateEmbeddings(
  texts: string[],
  batchSize = 100
): Promise<number[][]> {
  const openai = getOpenAI();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });

    for (const item of res.data) {
      embeddings.push(item.embedding);
    }

    if (i + batchSize < texts.length) await sleep(340); // ~3 req/sec
    process.stdout.write(
      `  Embeddings: ${Math.min(i + batchSize, texts.length)}/${texts.length}\r`
    );
  }
  console.log();

  return embeddings;
}

// ---------------------------------------------------------------------------
// Insert chunks into legal_chunks (idempotent via source_title + section_ref)
// ---------------------------------------------------------------------------
export async function insertChunks(records: ChunkRecord[]): Promise<number> {
  const supabase = getSupabase();
  let inserted = 0;
  let failed = 0;

  // Batch inserts in groups of 50
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);

    const { error } = await supabase.from("legal_chunks").insert(
      batch.map((r) => ({
        source_type: r.source_type,
        source_title: r.source_title,
        section_ref: r.section_ref,
        content: r.content,
        summary: r.summary,
        embedding: r.embedding ? JSON.stringify(r.embedding) : null,
        metadata: r.metadata,
      }))
    );

    if (error) {
      console.error(`  Insert error (batch ${i}):`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  if (failed > 0) {
    console.error(
      `  WARNING: ${failed}/${records.length} chunks failed to insert. ` +
        `Re-run with --force to retry.`
    );
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// Check if source already ingested (for idempotency)
// ---------------------------------------------------------------------------
export async function isSourceIngested(
  sourceTitle: string
): Promise<boolean> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from("legal_chunks")
    .select("id", { count: "exact", head: true })
    .eq("source_title", sourceTitle);

  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Delete all chunks for a source (for re-ingestion)
// ---------------------------------------------------------------------------
export async function deleteSource(sourceTitle: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("legal_chunks")
    .delete()
    .eq("source_title", sourceTitle);

  if (error) console.error(`  Delete error for ${sourceTitle}:`, error.message);
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
export function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}
