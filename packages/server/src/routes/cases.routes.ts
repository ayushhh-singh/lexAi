import { Router, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import { casesService } from "../services/cases.service.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { config } from "../lib/config.js";
import { createCaseSchema, updateCaseSchema, caseFilterSchema } from "@nyay/shared";
import type { CaseDeadline } from "@nyay/shared";

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string): string {
  if (!UUID_RE.test(id)) throw new AppError(400, "BAD_REQUEST", "Invalid ID format");
  return id;
}

const router = Router();

router.use(requireAuth);

// ─── POST / — create case ──────────────────────────────────────────
router.post("/", async (req: Request, res: Response, next) => {
  try {
    const parsed = createCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0].message);
    }
    const caseMatter = await casesService.create(req.user!.id, parsed.data);
    console.log(`[cases] POST / — userId=${req.user!.id}, caseId=${caseMatter.id}, title="${caseMatter.title?.slice(0, 50)}"`);
    res.status(201).json({ success: true, data: caseMatter });
  } catch (err) {
    console.error(`[cases] POST / error — userId=${req.user?.id}:`, err instanceof Error ? err.message : err);
    next(err);
  }
});

// ─── GET / — list cases ────────────────────────────────────────────
router.get("/", async (req: Request, res: Response, next) => {
  try {
    const parsed = caseFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0].message);
    }
    const { cases, total } = await casesService.list(req.user!.id, parsed.data);
    console.log(`[cases] GET / — userId=${req.user!.id}, total=${total}, page=${parsed.data.page}`);
    const { page, limit } = parsed.data;
    res.json({
      success: true,
      data: cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id — get case ──────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    const caseMatter = await casesService.get(id, req.user!.id);
    res.json({ success: true, data: caseMatter });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:id — update case ─────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    const parsed = updateCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0].message);
    }
    const caseMatter = await casesService.update(id, req.user!.id, parsed.data);
    console.log(`[cases] PATCH /:id — caseId=${id}, userId=${req.user!.id}`);
    res.json({ success: true, data: caseMatter });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id — delete case ────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    await casesService.delete(id, req.user!.id);
    console.log(`[cases] DELETE /:id — caseId=${id}, userId=${req.user!.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[cases] DELETE /:id error — userId=${req.user?.id}:`, err instanceof Error ? err.message : err);
    next(err);
  }
});

// ─── Deadlines ────────────────────────────────────────────────────

router.get("/:id/deadlines", async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    const deadlines = await casesService.getDeadlines(id, req.user!.id);
    res.json({ success: true, data: deadlines });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/deadlines", async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    const { title, description, deadline_date, deadline_type, reminder_days } = req.body;
    if (!title || !deadline_date || !deadline_type) {
      throw new AppError(400, "VALIDATION_ERROR", "title, deadline_date, and deadline_type are required");
    }
    const VALID_DEADLINE_TYPES = ["hearing", "filing", "limitation", "compliance", "other"];
    if (!VALID_DEADLINE_TYPES.includes(deadline_type)) {
      throw new AppError(400, "VALIDATION_ERROR", `deadline_type must be one of: ${VALID_DEADLINE_TYPES.join(", ")}`);
    }
    if (title.length > 500) {
      throw new AppError(400, "VALIDATION_ERROR", "Deadline title must be under 500 characters");
    }
    console.log(`[cases] POST /:id/deadlines — caseId=${id}, userId=${req.user!.id}, type=${deadline_type}`);
    const deadline = await casesService.createDeadline(id, req.user!.id, {
      title,
      description,
      deadline_date,
      deadline_type,
      reminder_days,
    });
    res.status(201).json({ success: true, data: deadline });
  } catch (err) {
    next(err);
  }
});

router.patch("/deadlines/:deadlineId/toggle", async (req: Request, res: Response, next) => {
  try {
    const deadlineId = validateUUID(req.params.deadlineId);
    const deadline = await casesService.toggleDeadline(deadlineId, req.user!.id);
    res.json({ success: true, data: deadline });
  } catch (err) {
    next(err);
  }
});

// ─── Notes ────────────────────────────────────────────────────────

router.get("/:id/notes", async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    const notes = await casesService.getNotes(id, req.user!.id);
    res.json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/notes", async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) {
      throw new AppError(400, "VALIDATION_ERROR", "Note content is required");
    }
    if (content.length > 10000) {
      throw new AppError(400, "VALIDATION_ERROR", "Note content must be under 10,000 characters");
    }
    const note = await casesService.createNote(id, req.user!.id, content.trim());
    console.log(`[cases] POST /:id/notes — caseId=${id}, userId=${req.user!.id}, noteId=${note.id}`);
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
});

router.delete("/notes/:noteId", async (req: Request, res: Response, next) => {
  try {
    const noteId = validateUUID(req.params.noteId);
    await casesService.deleteNote(noteId, req.user!.id);
    console.log(`[cases] DELETE /notes/:noteId — noteId=${noteId}, userId=${req.user!.id}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/summary — Generate Case Summary Report (SSE) ─────
router.post("/:id/summary", requireCredits(15), async (req: Request, res: Response, next) => {
  try {
    const id = validateUUID(req.params.id);
    console.log(`[cases] POST /:id/summary — caseId=${id}, userId=${req.user!.id}`);
    const context = await casesService.getSummaryContext(id, req.user!.id);

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let aborted = false;
    req.on("close", () => { aborted = true; });

    const sendEvent = (data: Record<string, unknown>) => {
      if (!aborted) res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Build the summary prompt
    const { caseMatter, documents, deadlines, conversations } = context;
    const now = new Date();

    const docList = documents.length > 0
      ? documents.map((d) => `- ${d.title} (${d.document_type}, ${d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN") : "N/A"})`).join("\n")
      : "No documents linked.";

    const deadlineList = deadlines.length > 0
      ? deadlines.map((d: CaseDeadline) => {
          const date = new Date(d.deadline_date);
          const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const status = d.is_completed ? "Completed" : daysLeft < 0 ? `OVERDUE by ${Math.abs(daysLeft)} days` : `${daysLeft} days remaining`;
          return `- ${d.title} (${d.deadline_type}) — ${date.toLocaleDateString("en-IN")} [${status}]`;
        }).join("\n")
      : "No deadlines set.";

    const convList = conversations.length > 0
      ? conversations.map((c: { title: string | null; practice_area: string | null }) => `- ${c.title ?? "Untitled"} (${c.practice_area ?? "General"})`).join("\n")
      : "No research conversations.";

    const prompt = `Generate a comprehensive Case Summary Report as a PDF document for the following case matter.

CASE DETAILS:
- Title: ${caseMatter.title}
- Case Number: ${caseMatter.case_number ?? "Not assigned"}
- Case Type: ${caseMatter.case_type}
- Court: ${caseMatter.court_name ?? caseMatter.court_level}
- Practice Area: ${caseMatter.practice_area}
- Status: ${caseMatter.status}
- Filing Date: ${caseMatter.filing_date ?? "Not filed"}
- Next Hearing: ${caseMatter.next_hearing_date ?? "Not scheduled"}
- Description: ${caseMatter.description ?? "No description"}
- Opposing Party: ${caseMatter.opposing_party ?? "Not specified"}
- Opposing Counsel: ${caseMatter.opposing_counsel ?? "Not specified"}

LINKED DOCUMENTS:
${docList}

DEADLINES:
${deadlineList}

RESEARCH CONVERSATIONS:
${convList}

REQUIREMENTS:
1. Create a professional PDF report with the lawyer's case summary
2. Include sections: Case Overview, Current Status, Timeline, Documents Summary, Upcoming Deadlines, and Recommendations
3. Use formal legal language appropriate for Indian courts
4. Highlight any urgent deadlines or overdue items
5. Add a "Report generated on" timestamp at the bottom

IMPORTANT: Use the code_execution tool to generate the PDF file using reportlab. The report must be professionally formatted with proper headers, sections, and tables.`;

    sendEvent({ type: "progress", step: "preparing", message: "Gathering case data..." });

    if (aborted) return;

    sendEvent({ type: "progress", step: "generating", message: "Generating summary report with AI (this may take 15-45 seconds)..." });

    const startTime = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      system: "You are an expert Indian legal professional. Generate comprehensive, professionally formatted case summary reports as PDF documents. Always use code_execution to create the actual PDF file.",
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "code_execution_20260120" }],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResponse: any = await anthropic.messages.create(params);

    const generationTimeMs = Date.now() - startTime;

    if (aborted) return;

    // Extract file_id
    let fileId = "";
    let text = "";

    for (const block of aiResponse.content) {
      if (block.type === "text") text += block.text;
      if (block.type === "code_execution_result" && "content" in block) {
        const content = block.content as Array<{ type: string; file_id?: string }>;
        for (const item of content) {
          if (item.type === "file" && item.file_id) fileId = item.file_id;
        }
      }
    }

    if (!fileId) {
      console.error(`[cases] summary generation produced no file — caseId=${id}`);
      sendEvent({ type: "error", message: "Summary generation did not produce a PDF file." });
      res.statusCode = 500;
      res.end();
      return;
    }

    sendEvent({ type: "progress", step: "downloading", message: "Downloading report..." });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileResponse = await (anthropic as any).files.retrieveContent(fileId);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    if (aborted) return;

    sendEvent({ type: "progress", step: "storing", message: "Storing report..." });

    const fileName = `${req.user!.id}/${Date.now()}-case-summary-${id.slice(0, 8)}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(fileName, fileBuffer, { contentType: "application/pdf", upsert: false });

    if (uploadError) {
      console.error(`[cases] summary storage upload failed — caseId=${id}:`, uploadError.message);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage.from("documents").getPublicUrl(fileName);
    const fileUrl = urlData.publicUrl;
    const title = `Case Summary — ${caseMatter.title} — ${new Date().toLocaleDateString("en-IN")}`;

    const { data: doc, error: insertError } = await supabaseAdmin
      .from("legal_documents")
      .insert({
        user_id: req.user!.id,
        case_matter_id: id,
        title,
        document_type: "case_summary",
        file_url: fileUrl,
        file_id: fileId,
        file_size: fileBuffer.length,
        mime_type: "application/pdf",
        generation_method: "ai_skill" as const,
        ai_summary: text.slice(0, 500),
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[cases] failed to save summary record — caseId=${id}:`, insertError.message);
      await supabaseAdmin.storage.from("documents").remove([fileName]).catch(() => {});
      throw new Error(`Failed to save document record: ${insertError.message}`);
    }

    const tokensUsed = aiResponse.usage.input_tokens + aiResponse.usage.output_tokens;
    console.log(`[cases] summary complete — caseId=${id}, docId=${doc.id}, tokens=${tokensUsed}, ${generationTimeMs}ms`);

    // Log to skill_generations
    await supabaseAdmin.from("skill_generations").insert({
      user_id: req.user!.id,
      case_matter_id: id,
      skill_ids: [],
      prompt: prompt.slice(0, 2000),
      anthropic_file_id: fileId,
      output_format: "pdf",
      tokens_used: tokensUsed,
      generation_time_ms: generationTimeMs,
      status: "completed" as const,
    });

    sendEvent({
      type: "done",
      document: {
        id: doc.id,
        title: doc.title,
        file_url: fileUrl,
        mime_type: "application/pdf",
        file_size: fileBuffer.length,
        tokens_used: tokensUsed,
      },
    });
    res.end();
  } catch (err) {
    console.error(`[cases] POST /:id/summary error — userId=${req.user?.id}:`, err instanceof Error ? err.message : err);
    res.statusCode = 500;
    if (res.headersSent) {
      const isClientError = err instanceof AppError && err.statusCode < 500;
      const message = isClientError ? (err as AppError).message : "Summary generation failed";
      res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

export default router;
