/**
 * ingest-judgments.ts
 *
 * Parses judgment text files from data/judgments/, splits them into
 * semantic sections (Facts, Issues, Analysis, Holding), extracts citations,
 * chunks, generates embeddings, and stores in legal_chunks.
 *
 * Usage: npx tsx packages/server/scripts/ingest-judgments.ts [--force]
 *
 * Expected file format: Plain text judgment files (.txt) in data/judgments/.
 * Filenames should be descriptive, e.g.:
 *   "Kesavananda-Bharati-v-State-of-Kerala-1973.txt"
 *   "Maneka-Gandhi-v-Union-of-India-1978.txt"
 *
 * The first few lines should contain the case title and citation.
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

// ---------------------------------------------------------------------------
// Citation extraction (inlined from @nyay/shared to avoid CJS/ESM issues)
// ---------------------------------------------------------------------------
const CITATION_REGEXES = [
  /AIR\s+\d{4}\s+(?:SC|Del|Bom|Cal|Mad|All|Kar|Ker|Pat|Raj|AP|Guj|HP|J&K|MP|Ori|P&H|Pun)\s+\d+/g,
  /\(\d{4}\)\s+\d+\s+SCC\s+\d+/g,
  /\d{4}\s+SCC\s+OnLine\s+(?:SC|Del|Bom|Cal|Mad|All|Kar|Ker)\s+\d+/g,
  /CrLJ\s+\d{4}\s+\w+\s+\d+/g,
];

function extractCitations(text: string): string[] {
  const citations: string[] = [];
  for (const pattern of CITATION_REGEXES) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      citations.push(match[0]);
    }
  }
  return [...new Set(citations)];
}

// ---------------------------------------------------------------------------
// Directories
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve(import.meta.dirname, "..", "data", "judgments");

// ---------------------------------------------------------------------------
// Judgment section types
// ---------------------------------------------------------------------------
type JudgmentSectionType =
  | "header"
  | "facts"
  | "issues"
  | "arguments"
  | "analysis"
  | "holding"
  | "order"
  | "dissent"
  | "other";

interface JudgmentSection {
  type: JudgmentSectionType;
  label: string;
  content: string;
}

interface JudgmentMeta {
  caseTitle: string;
  citations: string[];
  court: string | null;
  date: string | null;
  judges: string | null;
}

// ---------------------------------------------------------------------------
// Section detection patterns
// ---------------------------------------------------------------------------
const SECTION_MARKERS: Array<{
  pattern: RegExp;
  type: JudgmentSectionType;
  label: string;
}> = [
  { pattern: /^(?:FACTS|FACTUAL\s+BACKGROUND|BRIEF\s+FACTS)/i, type: "facts", label: "Facts" },
  { pattern: /^(?:ISSUES?\s+(?:FOR|FRAMED)|QUESTIONS?\s+(?:FOR|OF)\s+LAW)/i, type: "issues", label: "Issues" },
  { pattern: /^(?:ARGUMENTS?|SUBMISSIONS?|CONTENTIONS?)\s/i, type: "arguments", label: "Arguments" },
  { pattern: /^(?:ANALYSIS|DISCUSSION|REASONING|CONSIDERATION)/i, type: "analysis", label: "Analysis" },
  { pattern: /^(?:HELD|HOLDING|JUDGMENT|DECISION|CONCLUSION)/i, type: "holding", label: "Holding" },
  { pattern: /^(?:ORDER|DIRECTIONS?|RELIEF)/i, type: "order", label: "Order" },
  { pattern: /^(?:DISSENT|DISSENTING\s+OPINION|MINORITY\s+VIEW)/i, type: "dissent", label: "Dissent" },
];

// ---------------------------------------------------------------------------
// Parse judgment text into sections
// ---------------------------------------------------------------------------
function parseJudgment(text: string): {
  meta: JudgmentMeta;
  sections: JudgmentSection[];
} {
  const lines = text.split("\n");

  // Extract metadata from first ~20 lines
  const headerLines = lines.slice(0, 20).join("\n");
  const meta = extractMeta(headerLines, text);

  // Split into sections
  const sections: JudgmentSection[] = [];
  let currentType: JudgmentSectionType = "header";
  let currentLabel = "Header";
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this line starts a new section
    let matched = false;
    for (const marker of SECTION_MARKERS) {
      if (marker.pattern.test(trimmed)) {
        // Flush previous section
        if (currentLines.length > 0) {
          sections.push({
            type: currentType,
            label: currentLabel,
            content: currentLines.join("\n"),
          });
        }
        currentType = marker.type;
        currentLabel = marker.label;
        currentLines = [trimmed];
        matched = true;
        break;
      }
    }

    if (!matched) {
      currentLines.push(trimmed);
    }
  }

  // Flush last section
  if (currentLines.length > 0) {
    sections.push({
      type: currentType,
      label: currentLabel,
      content: currentLines.join("\n"),
    });
  }

  // If no sections were detected (unstructured judgment), treat entire text
  // as a single "analysis" section after the header
  if (sections.length <= 1) {
    const bodyStart = Math.min(20, lines.length);
    const headerContent = lines.slice(0, bodyStart).join("\n").trim();
    const bodyContent = lines.slice(bodyStart).join("\n").trim();

    return {
      meta,
      sections: [
        ...(headerContent ? [{ type: "header" as const, label: "Header", content: headerContent }] : []),
        ...(bodyContent ? [{ type: "analysis" as const, label: "Full Judgment", content: bodyContent }] : []),
      ],
    };
  }

  return { meta, sections: sections.filter((s) => s.content.length > 30) };
}

// ---------------------------------------------------------------------------
// Extract metadata from judgment header
// ---------------------------------------------------------------------------
function extractMeta(header: string, fullText: string): JudgmentMeta {
  // Case title: first non-empty line or "X v. Y" pattern
  const titleMatch = header.match(
    /(.+?\s+v[s.]?\s+.+?)(?:\n|$)/i
  );
  const firstLine = header.split("\n").find((l) => l.trim().length > 5) ?? "";
  const caseTitle = titleMatch ? titleMatch[1].trim() : firstLine.trim();

  // Court detection
  const courtPatterns: Array<[RegExp, string]> = [
    [/supreme\s+court/i, "Supreme Court of India"],
    [/high\s+court\s+of\s+(\w+)/i, "High Court"],
    [/delhi\s+high\s+court/i, "Delhi High Court"],
    [/bombay\s+high\s+court/i, "Bombay High Court"],
    [/madras\s+high\s+court/i, "Madras High Court"],
    [/calcutta\s+high\s+court/i, "Calcutta High Court"],
    [/karnataka\s+high\s+court/i, "Karnataka High Court"],
  ];
  let court: string | null = null;
  for (const [pattern, name] of courtPatterns) {
    if (pattern.test(header)) {
      court = name;
      break;
    }
  }

  // Date: look for "Decided on: DD.MM.YYYY" or similar
  const dateMatch = header.match(
    /(?:decided|dated?|judgment)\s*(?:on)?[:\s]*(\d{1,2}[./\-]\d{1,2}[./\-]\d{4})/i
  );
  const date = dateMatch ? dateMatch[1] : null;

  // Judges
  const judgeMatch = header.match(
    /(?:before|coram|bench)[:\s]*(.+?)(?:\n|$)/i
  );
  const judges = judgeMatch ? judgeMatch[1].trim() : null;

  // Citations from full text
  const citations = extractCitations(fullText);

  return { caseTitle, citations, court, date, judges };
}

// ---------------------------------------------------------------------------
// Process a single judgment file
// ---------------------------------------------------------------------------
async function processJudgment(filePath: string): Promise<number> {
  const filename = path.basename(filePath, ".txt");
  const rawText = fs.readFileSync(filePath, "utf-8");

  const { meta, sections } = parseJudgment(rawText);
  const sourceTitle = meta.caseTitle || filename;

  log(`Processing: ${sourceTitle}`);
  log(`  Court: ${meta.court ?? "unknown"} | Citations found: ${meta.citations.length}`);
  log(`  Sections: ${sections.map((s) => s.label).join(", ")}`);

  // Chunk each section
  const allChunks: Array<{
    content: string;
    sectionType: JudgmentSectionType;
    label: string;
  }> = [];

  for (const section of sections) {
    const prefix = `[${sourceTitle}]\n[${section.label}]\n`;
    const chunks = chunkText(section.content, 500, 100);
    for (const chunk of chunks) {
      allChunks.push({
        content: prefix + chunk,
        sectionType: section.type,
        label: section.label,
      });
    }
  }

  log(`  Total chunks: ${allChunks.length}`);

  if (allChunks.length === 0) {
    log(`  WARN: No chunks — skipping`);
    return 0;
  }

  // Generate summaries
  log(`  Generating summaries...`);
  const summaries = await generateSummaries(
    allChunks.map((c) => c.content)
  );

  // Generate embeddings
  log(`  Generating embeddings...`);
  const textsToEmbed = allChunks.map(
    (c, i) => `${summaries[i]}\n\n${c.content}`
  );
  const embeddings = await generateEmbeddings(textsToEmbed);

  // Build records
  const records: ChunkRecord[] = allChunks.map((c, i) => ({
    source_type: "judgement" as const,
    source_title: sourceTitle,
    section_ref: c.label,
    content: c.content,
    summary: summaries[i],
    embedding: embeddings[i],
    metadata: {
      section_type: c.sectionType,
      court: meta.court,
      date: meta.date,
      judges: meta.judges,
      citations: meta.citations,
      filename,
    },
  }));

  // Insert
  log(`  Inserting into legal_chunks...`);
  const inserted = await insertChunks(records);
  log(`  Done: ${inserted} chunks inserted`);

  return inserted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function ingestJudgments(force = false): Promise<number> {
  if (!fs.existsSync(DATA_DIR)) {
    log(`No judgments directory found at ${DATA_DIR} — skipping`);
    return 0;
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => path.join(DATA_DIR, f));

  if (files.length === 0) {
    log("No judgment .txt files found — skipping");
    return 0;
  }

  log(`Found ${files.length} judgment files`);
  let totalInserted = 0;

  for (const filePath of files) {
    const filename = path.basename(filePath, ".txt");
    const rawText = fs.readFileSync(filePath, "utf-8");

    // Parse to get the canonical title used for storage
    const { meta } = parseJudgment(rawText);
    const sourceTitle = meta.caseTitle || filename;

    // Idempotency check using the same title that processJudgment stores
    if (!force && (await isSourceIngested(sourceTitle))) {
      log(`SKIP ${filename} — already ingested`);
      continue;
    }

    if (force) {
      await deleteSource(sourceTitle);
    }

    const inserted = await processJudgment(filePath);
    totalInserted += inserted;
  }

  log(`Judgments ingestion complete: ${totalInserted} total chunks inserted`);
  return totalInserted;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (
  process.argv[1]?.endsWith("ingest-judgments.ts") ||
  process.argv[1]?.endsWith("ingest-judgments.js")
) {
  const force = process.argv.includes("--force");
  ingestJudgments(force).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
