import Anthropic from "@anthropic-ai/sdk";
import type { DocumentTemplate, DocumentOutputFormat } from "@nyay/shared";
import { config } from "../lib/config.js";
import { getSkillsForDocumentType } from "../config/skills.js";
import { getTemplate } from "./templates/index.js";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const SKILLS_MODEL = "claude-sonnet-4-5-20250514";

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
      tools: [{ type: "code_execution" }],
    };

    if (containers.length > 0) {
      params.containers = containers;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await anthropic.messages.create(params);

    // Extract file_id and text from response
    let fileId = "";
    let text = "";

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      }
      // Look for code execution results with file output
      if (block.type === "code_execution_result" && "content" in block) {
        const content = block.content as Array<{ type: string; file_id?: string }>;
        for (const item of content) {
          if (item.type === "file" && item.file_id) {
            fileId = item.file_id;
          }
        }
      }
    }

    if (!fileId) {
      throw new Error("Skills generation did not produce a file. The AI response may not have used code_execution.");
    }

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return { fileId, text, tokensUsed };
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (anthropic as any).files.retrieveContent(fileId);

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      throw new Error(`Generated file exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }
    return Buffer.from(arrayBuffer);
  }
}

export const skillsClient = new SkillsClient();
