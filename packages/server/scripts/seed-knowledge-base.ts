/**
 * seed-knowledge-base.ts
 *
 * Master script that orchestrates the full knowledge base pipeline:
 *   1. Download bare acts from indiacode.nic.in
 *   2. Ingest bare acts (parse, chunk, embed, store)
 *   3. Ingest judgments (parse, chunk, embed, store)
 *
 * Idempotent — skips sources already present in legal_chunks.
 * Re-run with --force to re-ingest everything.
 *
 * Usage: npx tsx packages/server/scripts/seed-knowledge-base.ts [--force]
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import "dotenv/config";
import { log, getSupabase } from "./lib/ingest-utils.js";
import { downloadBareActs } from "./download-bare-acts.js";
import { ingestBareActs } from "./ingest-bare-acts.js";
import { ingestJudgments } from "./ingest-judgments.js";

// ---------------------------------------------------------------------------
// Preflight checks
// ---------------------------------------------------------------------------
function checkEnv(): void {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.error("Set them in packages/server/.env or export them.");
    process.exit(1);
  }
}

async function checkDatabase(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("legal_chunks")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Cannot reach legal_chunks table:", error.message);
    console.error("Make sure Supabase is running: npx supabase start");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const force = process.argv.includes("--force");
  const startTime = Date.now();

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║        Nyay Sahayak — Knowledge Base Seed       ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  // Preflight
  log("Running preflight checks...");
  checkEnv();
  await checkDatabase();
  log("Preflight OK");
  console.log();

  // Step 1: Download bare acts
  console.log("━━━ Step 1/3: Download Bare Acts ━━━");
  const downloaded = await downloadBareActs(force);
  console.log();

  // Step 2: Ingest bare acts
  console.log("━━━ Step 2/3: Ingest Bare Acts ━━━");
  const actChunks = await ingestBareActs(force);
  console.log();

  // Step 3: Ingest judgments
  console.log("━━━ Step 3/3: Ingest Judgments ━━━");
  const judgmentChunks = await ingestJudgments(force);
  console.log();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║                   SUMMARY                       ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Acts downloaded:     ${String(downloaded.length).padStart(6)}                   ║`);
  console.log(`║  Act chunks inserted: ${String(actChunks).padStart(6)}                   ║`);
  console.log(`║  Judgment chunks:     ${String(judgmentChunks).padStart(6)}                   ║`);
  console.log(`║  Total chunks:        ${String(actChunks + judgmentChunks).padStart(6)}                   ║`);
  console.log(`║  Time elapsed:        ${elapsed.padStart(5)}s                   ║`);
  console.log("╚══════════════════════════════════════════════════╝");

  // Verify final count
  const supabase = getSupabase();
  const { count } = await supabase
    .from("legal_chunks")
    .select("id", { count: "exact", head: true });

  log(`Total chunks in database: ${count ?? "unknown"}`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
