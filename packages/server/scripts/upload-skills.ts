/**
 * Upload SKILL.md files to Claude API as skills.
 *
 * Usage:
 *   npx tsx scripts/upload-skills.ts upload indian-legal-drafter
 *   npx tsx scripts/upload-skills.ts upload court-formatter
 *   npx tsx scripts/upload-skills.ts upload --all
 *   npx tsx scripts/upload-skills.ts list
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "../../../.claude/skills");
const SKILL_IDS_PATH = join(SKILLS_DIR, "skill-ids.json");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function loadSkillIds(): Record<string, string> {
  if (existsSync(SKILL_IDS_PATH)) {
    return JSON.parse(readFileSync(SKILL_IDS_PATH, "utf-8"));
  }
  return {};
}

function saveSkillIds(ids: Record<string, string>): void {
  writeFileSync(SKILL_IDS_PATH, JSON.stringify(ids, null, 2) + "\n");
  console.log(`Saved skill IDs to ${SKILL_IDS_PATH}`);
}

function getAvailableSkills(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
    .map((d) => d.name);
}

function readSkillFile(name: string): { frontmatter: Record<string, string>; body: string } {
  const path = join(SKILLS_DIR, name, "SKILL.md");
  if (!existsSync(path)) {
    throw new Error(`Skill file not found: ${path}`);
  }
  const raw = readFileSync(path, "utf-8");

  // Parse YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: { name }, body: raw };
  }

  const frontmatter: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: fmMatch[2].trim() };
}

async function uploadSkill(name: string): Promise<string> {
  const { frontmatter, body } = readSkillFile(name);
  const displayName = frontmatter.name || name;
  const description = frontmatter.description || "";

  console.log(`Uploading skill: ${displayName}...`);

  const skill = await (anthropic as any).beta.skills.create({
    name: displayName,
    description,
    instructions: body,
  });

  console.log(`  -> skill_id: ${skill.id}`);
  return skill.id;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help") {
    console.log(`Usage:
  npx tsx scripts/upload-skills.ts upload <skill-name>   Upload a single skill
  npx tsx scripts/upload-skills.ts upload --all          Upload all skills
  npx tsx scripts/upload-skills.ts list                  List available skills`);
    process.exit(0);
  }

  if (command === "list") {
    const available = getAvailableSkills();
    const ids = loadSkillIds();
    console.log("\nAvailable skills:");
    for (const name of available) {
      const status = ids[name] ? `uploaded (${ids[name]})` : "not uploaded";
      console.log(`  ${name} — ${status}`);
    }
    return;
  }

  if (command === "upload") {
    const ids = loadSkillIds();
    const toUpload = args.includes("--all") ? getAvailableSkills() : args.filter((a) => !a.startsWith("-"));

    if (toUpload.length === 0) {
      console.error("Error: Specify skill name(s) or --all");
      process.exit(1);
    }

    for (const name of toUpload) {
      try {
        ids[name] = await uploadSkill(name);
      } catch (err) {
        console.error(`Failed to upload ${name}:`, err);
      }
    }

    saveSkillIds(ids);
    console.log("\nDone.");
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
