import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import { skillsClient } from "../services/skills.service.js";
import { getTemplate } from "../services/templates/index.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { generateDocumentSchema } from "@nyay/shared";
import type { DocumentTemplate, DocumentOutputFormat } from "@nyay/shared";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = Router();

router.use(requireAuth);

// ─── POST /generate — skill-based document generation (SSE) ─────────
router.post("/generate", requireCredits(15), async (req: Request, res: Response, next) => {
  try {
    const parsed = generateDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0].message);
    }

    const { template, format, fields, case_matter_id, court, language } = parsed.data;

    // Validate required template fields
    const templateDef = getTemplate(template as DocumentTemplate);
    const missingFields = templateDef.fields
      .filter((f) => f.required && !fields[f.key]?.trim())
      .map((f) => f.label);

    if (missingFields.length > 0) {
      throw new AppError(400, "MISSING_FIELDS", `Missing required fields: ${missingFields.join(", ")}`);
    }

    // SSE headers for progress updates
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });

    const sendEvent = (data: Record<string, unknown>) => {
      if (!aborted) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Step 1: Optionally verify case ownership
    sendEvent({ type: "progress", step: "preparing", message: "Preparing document template..." });

    if (case_matter_id) {
      const { data: caseMatter } = await supabaseAdmin
        .from("case_matters")
        .select("id, title")
        .eq("id", case_matter_id)
        .eq("user_id", req.user!.id)
        .single();

      if (!caseMatter) {
        sendEvent({ type: "error", message: "Case not found or access denied" });
        res.end();
        return;
      }
    }

    // Step 2: Generate document via Skills
    sendEvent({ type: "progress", step: "generating", message: "Generating document with AI (this may take 15-45 seconds)..." });

    const startTime = Date.now();
    const result = await skillsClient.generateDocument(
      template as DocumentTemplate,
      fields,
      format as DocumentOutputFormat,
      { court, language, ragContext: undefined }
    );
    const generationTimeMs = Date.now() - startTime;

    if (aborted) return;

    // Step 3: Download file from Anthropic
    sendEvent({ type: "progress", step: "downloading", message: "Downloading generated file..." });

    const fileBuffer = await skillsClient.downloadFile(result.fileId);

    if (aborted) return;

    // Step 4: Upload to Supabase Storage
    sendEvent({ type: "progress", step: "storing", message: "Storing document..." });

    const mimeType = format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const extension = format === "pdf" ? "pdf" : "docx";
    const fileName = `${req.user!.id}/${Date.now()}-${template}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("documents")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;
    const title = `${templateDef.name} — ${new Date().toLocaleDateString("en-IN")}`;

    // Step 5: Save to legal_documents table
    const { data: doc, error: insertError } = await supabaseAdmin
      .from("legal_documents")
      .insert({
        user_id: req.user!.id,
        case_matter_id: case_matter_id || null,
        title,
        document_type: templateDef.documentType,
        file_url: fileUrl,
        file_id: result.fileId,
        file_size: fileBuffer.length,
        mime_type: mimeType,
        generation_method: "ai_skill" as const,
        ai_summary: result.text.slice(0, 500),
      })
      .select()
      .single();

    if (insertError) {
      // Clean up orphaned storage file
      await supabaseAdmin.storage.from("documents").remove([fileName]).catch(() => {});
      throw new Error(`Failed to save document record: ${insertError.message}`);
    }

    // Step 6: Log to skill_generations for analytics
    await supabaseAdmin.from("skill_generations").insert({
      user_id: req.user!.id,
      case_matter_id: case_matter_id || null,
      skill_ids: [],
      prompt: result.text.slice(0, 2000),
      anthropic_file_id: result.fileId,
      output_format: format,
      tokens_used: result.tokensUsed,
      generation_time_ms: generationTimeMs,
      status: "completed" as const,
    });

    // Done
    sendEvent({
      type: "done",
      document: {
        id: doc.id,
        title: doc.title,
        file_url: fileUrl,
        mime_type: mimeType,
        file_size: fileBuffer.length,
        tokens_used: result.tokensUsed,
      },
    });
    res.end();
  } catch (err) {
    // Signal failure so credits middleware skips deduction (SSE always 200)
    res.statusCode = 500;

    if (res.headersSent) {
      const isClientError = err instanceof AppError && err.statusCode < 500;
      const message = isClientError ? (err as AppError).message : "Document generation failed";
      res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

// ─── GET / — list user's documents ──────────────────────────────────
router.get("/", async (req: Request, res: Response, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("legal_documents")
      .select("id, title, document_type, mime_type, file_size, generation_method, created_at")
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(500, "QUERY_ERROR", "Failed to fetch documents");
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/download — serve file from Supabase Storage ──────────
router.get("/:id/download", async (req: Request, res: Response, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      throw new AppError(400, "BAD_REQUEST", "Invalid document ID");
    }

    const { data: doc, error } = await supabaseAdmin
      .from("legal_documents")
      .select("id, title, file_url, mime_type, user_id")
      .eq("id", req.params.id)
      .single();

    if (error || !doc) {
      throw new AppError(404, "NOT_FOUND", "Document not found");
    }

    if (doc.user_id !== req.user!.id) {
      throw new AppError(404, "NOT_FOUND", "Document not found");
    }

    if (!doc.file_url) {
      throw new AppError(404, "NO_FILE", "No file associated with this document");
    }

    // Extract storage path from the public URL
    const storagePath = doc.file_url.split("/storage/v1/object/public/documents/")[1];
    if (!storagePath) {
      throw new AppError(500, "INVALID_PATH", "Invalid file storage path");
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new AppError(500, "DOWNLOAD_ERROR", "Failed to download file");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ext = doc.mime_type?.includes("pdf") ? "pdf" : "docx";

    const safeTitle = (doc.title || "document").replace(/[^\w\s.-]/g, "_");
    res.setHeader("Content-Type", doc.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.${ext}"; filename*=UTF-8''${encodeURIComponent(doc.title || "document")}.${ext}`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
