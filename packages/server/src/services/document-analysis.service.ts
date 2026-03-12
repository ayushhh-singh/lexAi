import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { z } from "zod";
import { config } from "../lib/config.js";
import type {
  DocumentAnalysisIssue,
  DocumentAnalysisStatute,
  DocumentAnalysisRisk,
} from "@nyay/shared";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const ANALYSIS_MODEL = "claude-sonnet-4-6";
const MAX_TEXT_LENGTH = 100_000;

export interface ExtractedText {
  text: string;
  pageCount?: number;
  method: "pdf-parse" | "mammoth" | "openai-vision";
}

export interface AnalysisOutput {
  summary: string;
  key_issues: DocumentAnalysisIssue[];
  relevant_statutes: DocumentAnalysisStatute[];
  risk_assessment: DocumentAnalysisRisk[];
  next_steps: string[];
  tokensUsed: number;
}

// ─── Text Extraction ──────────────────────────────────────────────────

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedText> {
  console.log(`[docs] extractText start — mimeType=${mimeType}, bufferSize=${buffer.length}`);
  const startTime = Date.now();
  if (mimeType === "application/pdf") {
    const result = await extractFromPDF(buffer);
    console.log(`[docs] extractText done — method=${result.method}, chars=${result.text.length}, ${Date.now() - startTime}ms`);
    return result;
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await extractFromDOCX(buffer);
    console.log(`[docs] extractText done — method=${result.method}, chars=${result.text.length}, ${Date.now() - startTime}ms`);
    return result;
  }

  if (mimeType.startsWith("image/")) {
    const result = await extractFromImage(buffer, mimeType);
    console.log(`[docs] extractText done — method=${result.method}, chars=${result.text.length}, ${Date.now() - startTime}ms`);
    return result;
  }

  console.error(`[docs] extractText unsupported mimeType=${mimeType}`);
  throw new Error(
    `Unsupported file type: ${mimeType}. Supported: PDF, DOCX, and images (PNG, JPG, WEBP).`
  );
}

async function extractFromPDF(buffer: Buffer): Promise<ExtractedText> {
  console.log(`[docs] extractFromPDF — bufferSize=${buffer.length}`);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const text = result.text.trim();

  if (!text || text.length < 20) {
    console.warn(`[docs] PDF text too short (${text.length} chars), falling back to Vision OCR`);
    // PDF might be scanned — fall back to Vision OCR
    return extractFromImage(buffer, "application/pdf");
  }

  console.log(`[docs] extractFromPDF done — ${text.length} chars, ${result.total} pages`);
  return {
    text: text.slice(0, MAX_TEXT_LENGTH),
    pageCount: result.total,
    method: "pdf-parse",
  };
}

async function extractFromDOCX(buffer: Buffer): Promise<ExtractedText> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value.trim().slice(0, MAX_TEXT_LENGTH),
    method: "mammoth",
  };
}

async function extractFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedText> {
  console.log(`[docs] extractFromImage — mimeType=${mimeType}, bufferSize=${buffer.length}`);
  const startTime = Date.now();
  const base64 = buffer.toString("base64");

  // PDFs can't be sent as images to OpenAI — use Anthropic's native PDF support
  if (mimeType === "application/pdf") {
    return extractPDFViaAnthropic(buffer);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract ALL text from this document image. Preserve the original formatting, headings, paragraphs, and structure as much as possible. If it's a legal document, preserve section numbers, article numbers, and citations exactly.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() || "";
  console.log(`[docs] extractFromImage done — ${text.length} chars, ${Date.now() - startTime}ms`);
  return {
    text: text.slice(0, MAX_TEXT_LENGTH),
    method: "openai-vision",
  };
}

async function extractPDFViaAnthropic(buffer: Buffer): Promise<ExtractedText> {
  console.log(`[docs] extractPDFViaAnthropic — bufferSize=${buffer.length}`);
  const startTime = Date.now();
  const base64 = buffer.toString("base64");

  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          {
            type: "text",
            text: "Extract ALL text from this PDF document. Preserve the original formatting, headings, paragraphs, and structure as much as possible. If it's a legal document, preserve section numbers, article numbers, and citations exactly. Output only the extracted text, nothing else.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
  console.log(`[docs] extractPDFViaAnthropic done — ${text.length} chars, ${Date.now() - startTime}ms`);
  return {
    text: text.slice(0, MAX_TEXT_LENGTH),
    method: "openai-vision", // keep compatible method name
  };
}

// ─── Claude Analysis ──────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are an expert Indian legal document analyst. Analyze legal documents thoroughly with focus on Indian law.

You MUST respond with ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "summary": "2-3 paragraph comprehensive summary of the document",
  "key_issues": [
    {
      "title": "Issue title",
      "severity": "high" | "medium" | "low",
      "description": "Detailed description",
      "recommendation": "Actionable recommendation"
    }
  ],
  "relevant_statutes": [
    {
      "name": "Full act name",
      "section": "Section/Article number",
      "relevance": "How this statute applies"
    }
  ],
  "risk_assessment": [
    {
      "area": "Risk area name",
      "level": "high" | "medium" | "low",
      "description": "Risk description",
      "mitigation": "Mitigation strategy"
    }
  ],
  "next_steps": ["Step 1", "Step 2", "..."]
}

Rules:
- Reference BNS/BNSS/BSA for offences after 1 July 2024; IPC/CrPC/IEA for prior matters.
- Identify ALL relevant Indian statutes (Acts, Rules, Regulations).
- Flag potential compliance issues, limitation periods, and jurisdictional concerns.
- Provide actionable next steps specific to Indian legal practice.
- Include at least 3 key issues, 2 statutes, 2 risks, and 3 next steps.`;

// Zod schema for validating AI analysis output at runtime
const severityEnum = z.enum(["high", "medium", "low"]);

const analysisOutputSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  key_issues: z.array(
    z.object({
      title: z.string(),
      severity: severityEnum.catch("medium"),
      description: z.string(),
      recommendation: z.string(),
    })
  ).default([]),
  relevant_statutes: z.array(
    z.object({
      name: z.string(),
      section: z.string(),
      relevance: z.string(),
    })
  ).default([]),
  risk_assessment: z.array(
    z.object({
      area: z.string(),
      level: severityEnum.catch("medium"),
      description: z.string(),
      mitigation: z.string(),
    })
  ).default([]),
  next_steps: z.array(z.string()).default([]),
});

/**
 * Sanitize extracted document text to prevent prompt injection.
 * Escapes XML-like tags so content cannot break out of the <document> wrapper.
 */
function sanitizeDocumentText(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function analyzeDocument(
  extractedText: string,
  language: "en" | "hi" = "en"
): Promise<AnalysisOutput> {
  console.log(`[docs] analyzeDocument start — textLength=${extractedText.length}, language=${language}`);
  const startTime = Date.now();
  const languageNote =
    language === "hi"
      ? "\n\nIMPORTANT: Write all analysis text in Hindi (Devanagari script). Legal citations, case names, act names, and section references should remain in English."
      : "";

  const sanitizedText = sanitizeDocumentText(extractedText);

  console.log(`[docs] analyzeDocument calling Anthropic API — model=${ANALYSIS_MODEL}`);
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 8192,
    system: ANALYSIS_SYSTEM_PROMPT + languageNote,
    messages: [
      {
        role: "user",
        content: `Analyze the following legal document:\n\n<document>\n${sanitizedText}\n</document>`,
      },
    ],
  }, { timeout: 120_000 });
  console.log(`[docs] analyzeDocument API response received — status=${response.stop_reason}, ${Date.now() - startTime}ms`);

  const textBlock = response.content.find((b) => b.type === "text");
  const rawJson = textBlock?.type === "text" ? textBlock.text : "";

  let rawParsed: unknown;

  try {
    // Strip any accidental markdown fences (trim first for leading whitespace)
    const cleaned = rawJson
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    rawParsed = JSON.parse(cleaned);
  } catch {
    console.error(`[docs] analyzeDocument JSON parse failed — raw length=${rawJson.length}`);
    throw new Error("AI analysis returned invalid JSON. Please retry.");
  }

  // Validate shape at runtime — .catch() defaults handle missing/wrong severity values
  const result = analysisOutputSchema.safeParse(rawParsed);
  if (!result.success) {
    console.error(`[docs] analyzeDocument Zod validation failed:`, result.error.issues.map((i) => i.message));
    throw new Error(
      `AI analysis returned malformed data: ${result.error.issues.map((i) => i.message).join(", ")}`
    );
  }
  const parsed = result.data;

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
  console.log(`[docs] analyzeDocument done — issues=${parsed.key_issues.length}, statutes=${parsed.relevant_statutes.length}, risks=${parsed.risk_assessment.length}, tokens=${tokensUsed}, ${Date.now() - startTime}ms`);
  return {
    summary: parsed.summary,
    key_issues: parsed.key_issues,
    relevant_statutes: parsed.relevant_statutes,
    risk_assessment: parsed.risk_assessment,
    next_steps: parsed.next_steps,
    tokensUsed,
  };
}

// ─── Analysis Report Generation (Skills API + PDF) ───────────────────

export async function generateAnalysisReport(
  analysis: {
    summary: string;
    key_issues: DocumentAnalysisIssue[];
    relevant_statutes: DocumentAnalysisStatute[];
    risk_assessment: DocumentAnalysisRisk[];
    next_steps: string[];
  },
  documentTitle: string
): Promise<{ fileId: string; tokensUsed: number }> {
  console.log(`[docs] generateAnalysisReport start — document="${documentTitle}"`);
  const startTime = Date.now();
  const prompt = `Generate a professional PDF analysis report for the following legal document analysis.

DOCUMENT: ${documentTitle}
DATE: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}

ANALYSIS DATA:
${JSON.stringify(analysis, null, 2)}

Requirements:
- Create a professionally formatted PDF using reportlab
- Include header with "Nyay Sahayak — Document Analysis Report"
- Sections: Executive Summary, Key Issues (with severity badges), Relevant Statutes, Risk Assessment (with risk levels), Recommended Next Steps
- Use tables for structured data
- Color-code severity/risk levels: high=#E53E3E, medium=#D69E2E, low=#38A169
- Footer with page numbers and generation date
- Font: Helvetica (reportlab built-in)

IMPORTANT: Use the code_execution tool to generate the PDF file.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: ANALYSIS_MODEL,
    max_tokens: 16384,
    system:
      "You are a report generation assistant. Generate professional PDF reports using Python's reportlab library via code_execution.",
    messages: [{ role: "user", content: prompt }],
    tools: [{ type: "code_execution_20260120", name: "code_execution" }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: any = await anthropic.messages.create(params);

  let fileId = "";
  for (const block of response.content) {
    // code_execution_20260120 returns bash_code_execution_tool_result blocks
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
    console.error(`[docs] generateAnalysisReport failed — no file produced, ${Date.now() - startTime}ms`);
    throw new Error("Report generation did not produce a file.");
  }

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
  console.log(`[docs] generateAnalysisReport done — fileId=${fileId}, tokens=${tokensUsed}, ${Date.now() - startTime}ms`);
  return { fileId, tokensUsed };
}
