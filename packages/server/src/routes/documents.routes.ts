import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import { skillsClient } from "../services/skills.service.js";
import {
  extractText,
  analyzeDocument,
  generateAnalysisReport,
} from "../services/document-analysis.service.js";
import { getTemplate } from "../services/templates/index.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { generateDocumentSchema, analyzeDocumentSchema } from "@nyay/shared";
import type { DocumentTemplate, DocumentOutputFormat, DocumentAnalysisResult } from "@nyay/shared";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, "INVALID_FILE_TYPE", `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, PNG, JPG, WEBP.`));
    }
  },
});

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

// ─── POST /analyze — upload + extract + AI analysis ─────────────────
// Derive file extension from validated MIME type (never trust filename)
const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

router.post(
  "/analyze",
  requireCredits(5),
  upload.single("file"),
  async (req: Request, res: Response, next) => {
    let storagePath: string | null = null;
    let docId: string | null = null;

    try {
      if (!req.file) {
        throw new AppError(400, "NO_FILE", "A file is required for analysis");
      }

      const meta = analyzeDocumentSchema.safeParse(req.body);
      const language = meta.success ? meta.data.language : "en";
      const caseMatterId = meta.success ? meta.data.case_matter_id : undefined;

      // 1. Extract text
      const extracted = await extractText(
        req.file.buffer,
        req.file.mimetype
      );

      if (!extracted.text || extracted.text.length < 20) {
        throw new AppError(
          422,
          "EXTRACTION_FAILED",
          "Could not extract meaningful text from the uploaded file."
        );
      }

      // 2. Upload original file to Supabase Storage
      const extension = MIME_TO_EXT[req.file.mimetype] || "bin";
      storagePath = `${req.user!.id}/${Date.now()}-analysis.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("documents")
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("documents")
        .getPublicUrl(storagePath);

      // 3. Save document record
      const title = req.file.originalname.replace(/\.[^.]+$/, "");
      const { data: doc, error: insertError } = await supabaseAdmin
        .from("legal_documents")
        .insert({
          user_id: req.user!.id,
          case_matter_id: caseMatterId || null,
          title,
          document_type: "uploaded",
          file_url: urlData.publicUrl,
          file_size: req.file.buffer.length,
          mime_type: req.file.mimetype,
          generation_method: "manual" as const,
        })
        .select()
        .single();

      if (insertError) {
        await supabaseAdmin.storage.from("documents").remove([storagePath]).catch(() => {});
        storagePath = null;
        throw new Error(`Failed to save document: ${insertError.message}`);
      }

      docId = doc.id;

      // 4. Run AI analysis
      const startTime = Date.now();
      const analysis = await analyzeDocument(extracted.text, language);
      const analysisTimeMs = Date.now() - startTime;

      // 5. Save analysis result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: analysisRow, error: analysisError } = await (supabaseAdmin as any)
        .from("document_analyses")
        .insert({
          document_id: doc.id,
          user_id: req.user!.id,
          summary: analysis.summary,
          key_issues: analysis.key_issues,
          relevant_statutes: analysis.relevant_statutes,
          risk_assessment: analysis.risk_assessment,
          next_steps: analysis.next_steps,
          extracted_text_length: extracted.text.length,
          extraction_method: extracted.method,
          tokens_used: analysis.tokensUsed,
          analysis_time_ms: analysisTimeMs,
        })
        .select()
        .single();

      if (analysisError) {
        // Analysis computed but failed to persist — fail the request so credits aren't charged
        throw new Error(`Failed to save analysis: ${analysisError.message}`);
      }

      // 6. Update document with AI summary
      await supabaseAdmin
        .from("legal_documents")
        .update({ ai_summary: analysis.summary.slice(0, 500) })
        .eq("id", doc.id);

      const result: { analysis: DocumentAnalysisResult; document: typeof doc } = {
        analysis: {
          id: analysisRow.id,
          document_id: doc.id,
          summary: analysis.summary,
          key_issues: analysis.key_issues,
          relevant_statutes: analysis.relevant_statutes,
          risk_assessment: analysis.risk_assessment,
          next_steps: analysis.next_steps,
          extracted_text_length: extracted.text.length,
          tokens_used: analysis.tokensUsed,
          analysis_time_ms: analysisTimeMs,
          created_at: analysisRow.created_at,
        },
        document: doc,
      };

      res.json({ success: true, data: result });
    } catch (err) {
      // Clean up orphaned storage file + document record on failure
      try {
        if (docId) {
          await supabaseAdmin.from("legal_documents").delete().eq("id", docId);
        }
        if (storagePath) {
          await supabaseAdmin.storage.from("documents").remove([storagePath]);
        }
      } catch {
        // Best-effort cleanup — don't mask the original error
      }
      next(err);
    }
  }
);

// ─── GET /:id/analysis — get analysis for a document ─────────────────
router.get("/:id/analysis", async (req: Request, res: Response, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      throw new AppError(400, "BAD_REQUEST", "Invalid document ID");
    }

    // Verify ownership
    const { data: doc } = await supabaseAdmin
      .from("legal_documents")
      .select("id, user_id")
      .eq("id", req.params.id)
      .single();

    if (!doc || doc.user_id !== req.user!.id) {
      throw new AppError(404, "NOT_FOUND", "Document not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analysis, error } = await (supabaseAdmin as any)
      .from("document_analyses")
      .select("*")
      .eq("document_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !analysis) {
      throw new AppError(404, "NOT_FOUND", "No analysis found for this document");
    }

    res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/analysis/report — generate PDF report ─────────────────
router.post(
  "/:id/analysis/report",
  requireCredits(3),
  async (req: Request, res: Response, next) => {
    try {
      if (!UUID_RE.test(req.params.id)) {
        throw new AppError(400, "BAD_REQUEST", "Invalid document ID");
      }

      // Verify ownership & get analysis
      const { data: doc } = await supabaseAdmin
        .from("legal_documents")
        .select("id, title, user_id, case_matter_id")
        .eq("id", req.params.id)
        .single();

      if (!doc || doc.user_id !== req.user!.id) {
        throw new AppError(404, "NOT_FOUND", "Document not found");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: analysis } = await (supabaseAdmin as any)
        .from("document_analyses")
        .select("*")
        .eq("document_id", req.params.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!analysis) {
        throw new AppError(404, "NOT_FOUND", "No analysis found. Analyze the document first.");
      }

      // Generate PDF report
      const reportResult = await generateAnalysisReport(
        {
          summary: analysis.summary,
          key_issues: analysis.key_issues,
          relevant_statutes: analysis.relevant_statutes,
          risk_assessment: analysis.risk_assessment,
          next_steps: analysis.next_steps,
        },
        doc.title
      );

      // Download from Anthropic
      const fileBuffer = await skillsClient.downloadFile(reportResult.fileId);

      // Upload to Supabase Storage
      const reportPath = `${req.user!.id}/${Date.now()}-analysis-report.pdf`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("documents")
        .upload(reportPath, fileBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Report upload failed: ${uploadError.message}`);
      }

      const { data: reportUrl } = supabaseAdmin.storage
        .from("documents")
        .getPublicUrl(reportPath);

      // Save report as a new document
      const { data: reportDoc } = await supabaseAdmin
        .from("legal_documents")
        .insert({
          user_id: req.user!.id,
          case_matter_id: doc.case_matter_id || null,
          title: `Analysis Report — ${doc.title}`,
          document_type: "analysis_report",
          file_url: reportUrl.publicUrl,
          file_id: reportResult.fileId,
          file_size: fileBuffer.length,
          mime_type: "application/pdf",
          generation_method: "ai_skill" as const,
          ai_summary: analysis.summary.slice(0, 500),
        })
        .select()
        .single();

      res.json({
        success: true,
        data: {
          id: reportDoc?.id,
          title: `Analysis Report — ${doc.title}`,
          file_url: reportUrl.publicUrl,
          mime_type: "application/pdf",
          file_size: fileBuffer.length,
          tokens_used: reportResult.tokensUsed,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /:id — delete a document ────────────────────────────────
router.delete("/:id", async (req: Request, res: Response, next) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      throw new AppError(400, "BAD_REQUEST", "Invalid document ID");
    }

    const { data: doc } = await supabaseAdmin
      .from("legal_documents")
      .select("id, user_id, file_url")
      .eq("id", req.params.id)
      .single();

    if (!doc || doc.user_id !== req.user!.id) {
      throw new AppError(404, "NOT_FOUND", "Document not found");
    }

    // Delete analysis records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("document_analyses")
      .delete()
      .eq("document_id", req.params.id);

    // Delete storage file
    if (doc.file_url) {
      const storagePath = doc.file_url.split("/storage/v1/object/public/documents/")[1];
      if (storagePath) {
        await supabaseAdmin.storage.from("documents").remove([storagePath]).catch(() => {});
      }
    }

    // Delete document record
    await supabaseAdmin
      .from("legal_documents")
      .delete()
      .eq("id", req.params.id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
