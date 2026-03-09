import type { DocumentTemplate, DocumentOutputFormat } from "@nyay/shared";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "../lib/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_IDS_PATH = join(__dirname, "../../../../.claude/skills/skill-ids.json");

export interface SkillRef {
  skill_id: string;
  name: string;
}

const SKILL_NAMES = ["indian-legal-drafter", "court-formatter"] as const;

function loadSkillIds(): Record<string, string> {
  const ids: Record<string, string> = {};

  // Priority 1: Validated env vars (production — Railway)
  const envMap: Record<string, string> = {
    "indian-legal-drafter": config.SKILL_ID_INDIAN_LEGAL_DRAFTER,
    "court-formatter": config.SKILL_ID_COURT_FORMATTER,
  };

  for (const [name, id] of Object.entries(envMap)) {
    if (id) ids[name] = id;
  }

  // Priority 2: Local file fallback for any missing IDs (development)
  const missing = SKILL_NAMES.filter((n) => !ids[n]);
  if (missing.length > 0 && existsSync(SKILL_IDS_PATH)) {
    try {
      const raw: unknown = JSON.parse(readFileSync(SKILL_IDS_PATH, "utf-8"));
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const name of missing) {
          const val = (raw as Record<string, unknown>)[name];
          if (typeof val === "string" && val) ids[name] = val;
        }
      }
    } catch {
      console.warn("[skills] Failed to read skill-ids.json, skills will need to be uploaded");
    }
  }

  return ids;
}

let skillIds = loadSkillIds();

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
