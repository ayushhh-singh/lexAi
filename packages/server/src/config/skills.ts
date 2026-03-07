import type { DocumentTemplate, DocumentOutputFormat } from "@nyay/shared";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_IDS_PATH = join(__dirname, "../../../../.claude/skills/skill-ids.json");

export interface SkillRef {
  skill_id: string;
  name: string;
}

let skillIds: Record<string, string> = {};

if (existsSync(SKILL_IDS_PATH)) {
  try {
    skillIds = JSON.parse(readFileSync(SKILL_IDS_PATH, "utf-8"));
  } catch {
    console.warn("[skills] Failed to read skill-ids.json, skills will need to be uploaded");
  }
}

const SKILL_MAP: Record<DocumentTemplate, string[]> = {
  "legal-notice": ["indian-legal-drafter", "court-formatter"],
  "bail-application": ["indian-legal-drafter", "court-formatter"],
  "writ-petition": ["indian-legal-drafter", "court-formatter"],
  "contract-nda": ["indian-legal-drafter"],
  "affidavit": ["indian-legal-drafter", "court-formatter"],
};

export function getSkillsForDocumentType(
  type: DocumentTemplate,
  _format: DocumentOutputFormat
): SkillRef[] {
  const skillNames = SKILL_MAP[type] ?? ["indian-legal-drafter"];
  return skillNames
    .filter((name) => skillIds[name])
    .map((name) => ({ skill_id: skillIds[name], name }));
}

export function getSkillId(name: string): string | undefined {
  return skillIds[name];
}

export function setSkillIds(ids: Record<string, string>): void {
  skillIds = { ...skillIds, ...ids };
}
