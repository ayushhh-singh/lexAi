/**
 * ingest-bare-acts.ts
 *
 * Parses bare act .txt files from data/bare-acts/, splits them into
 * hierarchical chunks (~500 chars, 100 overlap), generates contextual
 * summaries (GPT-4o-mini) and embeddings (text-embedding-3-small),
 * then stores everything in the legal_chunks table.
 *
 * Usage: npx tsx packages/server/scripts/ingest-bare-acts.ts [--force]
 *
 * --force re-ingests acts that already exist in the database.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  type ChunkRecord,
  chunkText,
  generateSummaries,
  generateEmbeddings,
  insertChunks,
  isSourceIngested,
  deleteSource,
  log,
} from "./lib/ingest-utils.js";
import { ACT_REGISTRY } from "./download-bare-acts.js";

// ---------------------------------------------------------------------------
// Directories
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve(import.meta.dirname, "..", "data", "bare-acts");

// ---------------------------------------------------------------------------
// Parse act text into sections
//
// Expects text structured as:
//   CHAPTER I — PRELIMINARY
//   Section 1. Short title ...
//   Section 2. Definitions ...
//
// Also handles Article-based structure (Constitution) and
// Order/Rule-based structure (CPC).
// ---------------------------------------------------------------------------
interface ParsedSection {
  sectionRef: string; // e.g. "Section 302" or "Article 21"
  heading: string; // Section heading/title if present
  body: string; // Full section text
}

const SECTION_PATTERN =
  /^(Section|Article|Order|Rule|Schedule|Chapter|Part|Clause)\s+([0-9IVXLC]+[A-Za-z]*)/i;

function parseActText(text: string): ParsedSection[] {
  const lines = text.split("\n");
  const sections: ParsedSection[] = [];
  let currentRef = "Preamble";
  let currentHeading = "";
  let currentBody: string[] = [];
  let chapterContext = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Track chapter/part context
    const chapterMatch = trimmed.match(
      /^(CHAPTER|PART)\s+([IVXLC0-9]+)\s*[.—\-:]*\s*(.*)/i
    );
    if (chapterMatch) {
      chapterContext = `${chapterMatch[1]} ${chapterMatch[2]}${chapterMatch[3] ? " — " + chapterMatch[3] : ""}`;
      continue;
    }

    // Detect new section
    const sectionMatch = trimmed.match(SECTION_PATTERN);
    if (sectionMatch) {
      // Flush previous section
      if (currentBody.length > 0) {
        sections.push({
          sectionRef: currentRef,
          heading: currentHeading,
          body: currentBody.join("\n"),
        });
      }

      currentRef = `${sectionMatch[1]} ${sectionMatch[2]}`;
      // Extract heading: text after the section number on the same line
      const afterRef = trimmed.slice(sectionMatch[0].length).replace(/^[.—\-:)\s]+/, "").trim();
      currentHeading = afterRef || "";
      currentBody = chapterContext
        ? [`[${chapterContext}]`, trimmed]
        : [trimmed];
    } else {
      currentBody.push(trimmed);
    }
  }

  // Flush last section
  if (currentBody.length > 0) {
    sections.push({
      sectionRef: currentRef,
      heading: currentHeading,
      body: currentBody.join("\n"),
    });
  }

  // Filter out empty/tiny sections
  return sections.filter((s) => s.body.length > 20);
}

// ---------------------------------------------------------------------------
// Process a single act file
// ---------------------------------------------------------------------------
async function processAct(
  filePath: string,
  actTitle: string,
  shortName: string,
  year: number
): Promise<number> {
  log(`Processing: ${shortName} — ${actTitle}`);

  const rawText = fs.readFileSync(filePath, "utf-8");
  const sections = parseActText(rawText);
  log(`  Parsed ${sections.length} sections`);

  // Chunk all sections
  const allChunks: Array<{
    content: string;
    sectionRef: string;
    heading: string;
  }> = [];

  for (const section of sections) {
    // Prepend section ref + heading to each chunk for context
    const prefix = section.heading
      ? `${section.sectionRef}. ${section.heading}\n`
      : `${section.sectionRef}\n`;

    const chunks = chunkText(section.body, 500, 100);
    for (const chunk of chunks) {
      allChunks.push({
        content: prefix + chunk,
        sectionRef: section.sectionRef,
        heading: section.heading,
      });
    }
  }

  log(`  Total chunks: ${allChunks.length}`);

  if (allChunks.length === 0) {
    log(`  WARN: No chunks produced — skipping`);
    return 0;
  }

  // Generate summaries
  log(`  Generating summaries...`);
  const summaries = await generateSummaries(
    allChunks.map((c) => c.content)
  );

  // Generate embeddings (embed summary + content for better retrieval)
  log(`  Generating embeddings...`);
  const textsToEmbed = allChunks.map(
    (c, i) => `${summaries[i]}\n\n${c.content}`
  );
  const embeddings = await generateEmbeddings(textsToEmbed);

  // Build records
  const records: ChunkRecord[] = allChunks.map((c, i) => ({
    source_type: "act" as const,
    source_title: actTitle,
    section_ref: c.sectionRef,
    content: c.content,
    summary: summaries[i],
    embedding: embeddings[i],
    metadata: {
      short_name: shortName,
      year,
      heading: c.heading || null,
    },
  }));

  // Insert
  log(`  Inserting into legal_chunks...`);
  const inserted = await insertChunks(records);
  log(`  Done: ${inserted} chunks inserted for ${shortName}`);

  return inserted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function ingestBareActs(force = false): Promise<number> {
  let totalInserted = 0;

  const actFiles = ACT_REGISTRY.map((act) => ({
    ...act,
    filePath: path.join(DATA_DIR, act.filename),
  })).filter((act) => {
    if (!fs.existsSync(act.filePath)) {
      log(`SKIP ${act.shortName} — file not found: ${act.filename}`);
      return false;
    }
    return true;
  });

  log(`Found ${actFiles.length}/${ACT_REGISTRY.length} act files to process`);

  for (const act of actFiles) {
    // Idempotency check
    if (!force && (await isSourceIngested(act.title))) {
      log(`SKIP ${act.shortName} — already ingested (use --force to re-ingest)`);
      continue;
    }

    // If forcing, delete existing chunks first
    if (force) {
      log(`  Deleting existing chunks for ${act.shortName}...`);
      await deleteSource(act.title);
    }

    const inserted = await processAct(
      act.filePath,
      act.title,
      act.shortName,
      act.year
    );
    totalInserted += inserted;
  }

  log(`Bare acts ingestion complete: ${totalInserted} total chunks inserted`);
  return totalInserted;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (
  process.argv[1]?.endsWith("ingest-bare-acts.ts") ||
  process.argv[1]?.endsWith("ingest-bare-acts.js")
) {
  const force = process.argv.includes("--force");
  ingestBareActs(force).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
