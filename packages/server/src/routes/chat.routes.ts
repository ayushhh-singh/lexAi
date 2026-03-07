import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { chatService } from "../services/chat.service.js";
import { aiService, type ChatMessage } from "../services/ai.service.js";
import { citationService } from "../services/citation.service.js";
import { buildLegalAssistantPrompt } from "../prompts/legal-assistant.js";
import { AppError } from "../middleware/error.middleware.js";

const router = Router();

// All chat routes require auth
router.use(requireAuth);

// ─── GET /conversations ──────────────────────────────────────────────
router.get("/conversations", async (req: Request, res: Response, next) => {
  try {
    const conversations = await chatService.getConversations(req.user!.id);
    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
});

// ─── POST /conversations ─────────────────────────────────────────────
router.post("/conversations", async (req: Request, res: Response, next) => {
  try {
    const { title, practice_area, case_matter_id } = req.body;

    // Validate inputs are strings if provided
    if (title !== undefined && (typeof title !== "string" || title.length > 200)) {
      throw new AppError(400, "BAD_REQUEST", "title must be a string of at most 200 characters");
    }
    if (practice_area !== undefined && typeof practice_area !== "string") {
      throw new AppError(400, "BAD_REQUEST", "practice_area must be a string");
    }
    if (case_matter_id !== undefined && typeof case_matter_id !== "string") {
      throw new AppError(400, "BAD_REQUEST", "case_matter_id must be a string");
    }

    const conversation = await chatService.createConversation(
      req.user!.id,
      title,
      practice_area,
      case_matter_id
    );
    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

// ─── GET /conversations/:id/messages ────────────────────────────────
router.get("/conversations/:id/messages", async (req: Request, res: Response, next) => {
  try {
    const messages = await chatService.getMessages(req.params.id, req.user!.id);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /conversations/:id ──────────────────────────────────────
router.delete("/conversations/:id", async (req: Request, res: Response, next) => {
  try {
    await chatService.deleteConversation(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /stream — SSE chat streaming (KEY endpoint) ────────────────
// POST (not GET) so user messages stay in the request body, not in
// URLs / server logs / proxy logs / browser history.
router.post("/stream", requireCredits(1), async (req: Request, res: Response, next) => {
  try {
    const { conversation_id: conversationId, message: userMessage } = req.body;

    if (!conversationId || typeof conversationId !== "string") {
      throw new AppError(400, "BAD_REQUEST", "conversation_id is required");
    }
    if (!userMessage || typeof userMessage !== "string") {
      throw new AppError(400, "BAD_REQUEST", "message is required");
    }

    const MAX_MESSAGE_LENGTH = 10_000;
    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(400, "BAD_REQUEST", `message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Prevent Railway/nginx proxy buffering
    res.flushHeaders();

    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });

    // 1. Save user message (verifies ownership internally)
    await chatService.saveMessage(conversationId, req.user!.id, "user", userMessage);

    // 2. Load conversation history (last 20 messages for context window)
    const history = await chatService.getMessages(conversationId, req.user!.id);
    const chatMessages: ChatMessage[] = history
      .filter((m) => m.role !== "system")
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // 3. Build system prompt
    const systemPrompt = buildLegalAssistantPrompt(req.user!);

    // 4. Auto-title on first user message
    if (history.filter((m) => m.role === "user").length <= 1) {
      const title = userMessage.slice(0, 80) + (userMessage.length > 80 ? "..." : "");
      await chatService.updateTitle(conversationId, req.user!.id, title);
    }

    // 5. Stream response
    const sendEvent = (data: Record<string, unknown>) => {
      if (!aborted) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    await aiService.streamChat(
      systemPrompt,
      chatMessages,
      // onToken
      (text) => {
        sendEvent({ type: "token", text });
      },
      // onDone — awaited by streamChat so errors propagate
      async (fullText, usage) => {
        if (aborted) return;

        // Citation verification: parse → verify → log gaps
        // Wrapped in try/catch so verification failure never loses the AI response
        let citations: import("@nyay/shared").Citation[] = [];
        try {
          const parsed = citationService.parseCitations(fullText);
          const verifications = await citationService.verifyCitations(parsed);
          citations = citationService.toCitations(verifications);
          citationService.logUnverified(verifications);
        } catch (err) {
          console.error("[citation-verify] Pipeline failed, saving message without citations:", err);
        }

        // Save assistant message (always — even if citation verification failed)
        await chatService.saveMessage(conversationId, req.user!.id, "assistant", fullText, {
          citations,
          aiModel: "claude-sonnet-4-5-20250514",
          tokensUsed: usage.input + usage.output,
          metadata: { input_tokens: usage.input, output_tokens: usage.output },
        });

        sendEvent({ type: "done", citations });
        res.end();
      }
    );
  } catch (err) {
    if (res.headersSent) {
      // Don't leak internal error details — send a generic message
      const isClientError = err instanceof AppError && err.statusCode < 500;
      const message = isClientError ? err.message : "An error occurred while streaming";
      res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

export default router;
