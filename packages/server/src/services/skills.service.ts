import Anthropic from "@anthropic-ai/sdk";
import type { DocumentTemplate, DocumentOutputFormat } from "@nyay/shared";
import { config } from "../lib/config.js";
import { getSkillsForDocumentType } from "../config/skills.js";
import { getTemplate } from "./templates/index.js";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const SKILLS_MODEL = "claude-sonnet-4-6";

export interface GenerateResult {
  fileId: string;
  text: string;
  tokensUsed: number;
}

const MAX_FIELD_LENGTH = 5000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function sanitizeFields(fields: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    sanitized[key] = value.slice(0, MAX_FIELD_LENGTH);
  }
  return sanitized;
}

export class SkillsClient {
  async generateDocument(
    template: DocumentTemplate,
    fields: Record<string, string>,
    format: DocumentOutputFormat,
    options?: {
      court?: string;
      language?: "en" | "hi";
      ragContext?: string;
    }
  ): Promise<GenerateResult> {
    const templateDef = getTemplate(template);
    const safeFields = sanitizeFields(fields);
    const instruction = templateDef.instructionBuilder(safeFields, options?.ragContext);

    const skills = getSkillsForDocumentType(template, format);
    const containers = skills.map((s) => ({
      type: "skill" as const,
      skill_id: s.skill_id,
    }));

    const fileType = format === "pdf" ? "pdf" : "docx";
    const languageNote =
      options?.language === "hi"
        ? "\n\nIMPORTANT: Write the document body in Hindi (Devanagari script). Legal citations, case names, and section references should remain in English."
        : "";

    const courtNote = options?.court
      ? `\n\nFORMAT FOR COURT: ${options.court}. Apply court-specific formatting rules (margins, font, spacing) as per the court-formatter skill.`
      : "";

    const userPrompt = `Generate a ${templateDef.name} document in ${fileType.toUpperCase()} format.${courtNote}${languageNote}

${instruction}

IMPORTANT: Use the code_execution tool to generate the ${fileType.toUpperCase()} file. Use python-docx for DOCX or reportlab for PDF. The file must be properly formatted and ready for legal use.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: SKILLS_MODEL,
      max_tokens: 16384,
      system:
        "You are an expert Indian legal document drafter. Generate professionally formatted legal documents. " +
        "Always use code_execution to create the actual document file.",
      messages: [{ role: "user", content: userPrompt }],
      tools: [{ type: "code_execution_20260120", name: "code_execution" }],
    };

    if (containers.length > 0) {
      params.containers = containers;
    }

    console.log("[skills] Calling Anthropic code_execution API...", {
      model: SKILLS_MODEL,
      template,
      format,
      hasContainers: containers.length > 0,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any;
    try {
      response = await anthropic.messages.create(params);
      console.log("[skills] API response received, stop_reason:", response.stop_reason,
        "content_blocks:", response.content?.length);
    } catch (apiError) {
      console.error("[skills] Anthropic API error:", apiError);
      throw apiError;
    }

    // Extract file_id and text from response
    let fileId = "";
    let text = "";

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      }
      // code_execution_20260120 returns bash_code_execution_tool_result blocks
      // with nested bash_code_execution_output items containing file_id
      if (block.type === "bash_code_execution_tool_result" && block.content) {
        const result = block.content;
        const content = result.content as Array<{ type: string; file_id?: string }> | undefined;
        if (content) {
          for (const item of content) {
            if (item.type === "bash_code_execution_output" && item.file_id) {
              fileId = item.file_id;
            }
          }
        }
      }
    }

    if (!fileId) {
      console.error("[skills] No file found. Block types:", response.content.map((b: { type: string }) => b.type));
      throw new Error("Skills generation did not produce a file. The AI response may not have used code_execution.");
    }

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return { fileId, text, tokensUsed };
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    // SDK v0.30.1 lacks beta.files — use raw HTTP to download
    const response = await fetch(`https://api.anthropic.com/v1/files/${fileId}/content`, {
      headers: {
        "x-api-key": config.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
      },
    });

    if (!response.ok) {
      throw new Error(`File download failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      throw new Error(`Generated file exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }
    return Buffer.from(arrayBuffer);
  }
}

export const skillsClient = new SkillsClient();
