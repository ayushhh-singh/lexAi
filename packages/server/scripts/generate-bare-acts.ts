/**
 * generate-bare-acts.ts
 *
 * Uses OpenAI GPT-4o-mini to generate representative bare act text files
 * for the knowledge base. This bypasses the indiacode.nic.in scraper
 * (which breaks when the site changes).
 *
 * Usage: npx tsx scripts/generate-bare-acts.ts
 *
 * Requires: OPENAI_API_KEY in .env
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { ACT_REGISTRY } from "./download-bare-acts.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data", "bare-acts");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateActText(
  title: string,
  shortName: string,
  year: number
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      {
        role: "system",
        content:
          "You are an Indian legal text database. Output the key sections of Indian bare acts " +
          "in a structured plain text format. Include section numbers, headings, and the " +
          "substantive legal text. Focus on the most important and commonly referenced " +
          "sections that lawyers search for. Format each section as:\n\n" +
          "CHAPTER [N] — [TITLE]\n\n" +
          "Section [N]. [Heading]\n[Full section text]\n\n" +
          "Include at least 20-30 key sections. Be accurate to the actual Indian statute.",
      },
      {
        role: "user",
        content: `Generate the key sections of: ${title} (${year})\nShort name: ${shortName}\n\nInclude the most important sections that Indian lawyers commonly reference. Output plain text only.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const header = `${title}\n${"=".repeat(title.length)}\n\n`;
  return header + text;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const missing = ACT_REGISTRY.filter((act) => {
    const filePath = path.join(DATA_DIR, act.filename);
    return !fs.existsSync(filePath) || fs.statSync(filePath).size < 200;
  });

  console.log(`Found ${missing.length} acts to generate\n`);

  for (const act of missing) {
    const filePath = path.join(DATA_DIR, act.filename);
    console.log(`Generating: ${act.shortName} — ${act.title}...`);

    try {
      const text = await generateActText(act.title, act.shortName, act.year);

      if (text.length < 500) {
        console.error(`  WARN: Generated text too short (${text.length} chars), skipping`);
        continue;
      }

      fs.writeFileSync(filePath, text, "utf-8");
      console.log(`  Saved: ${act.filename} (${text.length} chars)`);
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : err}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\nDone! Now run the seed script:");
  console.log("  npx tsx scripts/seed-knowledge-base.ts");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
