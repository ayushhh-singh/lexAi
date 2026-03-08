import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import { ragService } from "../services/rag.service.js";
import { indianKanoonService } from "../services/indian-kanoon.service.js";
import type { SearchRequest, ExplainRequest, CaseLawSearchRequest } from "@nyay/shared";

const router = Router();

router.use(requireAuth);

// ─── POST /search — hybrid RAG search ──────────────────────────────
router.post("/search", requireCredits(1), async (req: Request, res: Response, next) => {
  try {
    const { query, filters, limit } = req.body as SearchRequest;

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      throw new AppError(400, "BAD_REQUEST", "query must be at least 3 characters");
    }
    if (query.length > 2000) {
      throw new AppError(400, "BAD_REQUEST", "query must be at most 2000 characters");
    }

    const safeLimit = Math.min(Math.max(limit ?? 10, 1), 20);

    const searchResults = await ragService.hybridSearch(query.trim(), filters ?? {}, safeLimit);
    const reranked = await ragService.rerank(query.trim(), searchResults, Math.min(safeLimit, 5));

    res.json({
      success: true,
      data: {
        query: query.trim(),
        intent: "general_query",
        results: reranked,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /explain — RAG search + Haiku explanation, cached ────────
router.post("/explain", requireCredits(2), async (req: Request, res: Response, next) => {
  try {
    const { query, filters } = req.body as ExplainRequest;

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      throw new AppError(400, "BAD_REQUEST", "query must be at least 3 characters");
    }
    if (query.length > 2000) {
      throw new AppError(400, "BAD_REQUEST", "query must be at most 2000 characters");
    }

    const trimmedQuery = query.trim();
    const queryHash = ragService.hashQuery(trimmedQuery, filters);

    // Check cache
    const cached = await ragService.getCachedExplanation(queryHash);
    if (cached) {
      res.json({
        success: true,
        data: {
          query: trimmedQuery,
          answer: cached.response,
          sources: [],
          cached: true,
        },
      });
      return;
    }

    // Full pipeline: search -> rerank -> build context -> explain
    const searchResults = await ragService.hybridSearch(trimmedQuery, filters ?? {}, 20);
    const reranked = await ragService.rerank(trimmedQuery, searchResults, 5);
    const context = ragService.buildContext(reranked);
    const answer = await ragService.explain(trimmedQuery, context);

    // Cache the result
    await ragService.cacheExplanation(
      queryHash,
      trimmedQuery,
      answer,
      reranked.map((c) => c.id)
    );

    res.json({
      success: true,
      data: {
        query: trimmedQuery,
        answer,
        sources: reranked,
        cached: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /cases — structured case law search with lazy population ──
router.post("/cases", requireCredits(1), async (req: Request, res: Response, next) => {
  try {
    const body = req.body as CaseLawSearchRequest;

    if (!body.keywords || typeof body.keywords !== "string" || body.keywords.trim().length < 3) {
      throw new AppError(400, "BAD_REQUEST", "keywords must be at least 3 characters");
    }
    if (body.keywords.length > 2000) {
      throw new AppError(400, "BAD_REQUEST", "keywords must be at most 2000 characters");
    }

    // Sanitize optional string fields
    const sanitize = (v: unknown, max = 200): string | undefined => {
      if (typeof v !== "string" || !v.trim()) return undefined;
      return v.trim().slice(0, max);
    };

    const result = await indianKanoonService.searchCaseLaw({
      keywords: body.keywords.trim(),
      court: sanitize(body.court),
      judge: sanitize(body.judge),
      statute: sanitize(body.statute),
      year_from: typeof body.year_from === "number" ? Math.max(1800, Math.min(body.year_from, 2100)) : undefined,
      year_to: typeof body.year_to === "number" ? Math.max(1800, Math.min(body.year_to, 2100)) : undefined,
      limit: body.limit,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /acts — browse all acts in knowledge base ──────────────────
router.get("/acts", async (_req: Request, res: Response, next) => {
  try {
    const acts = await indianKanoonService.browseActs();
    res.json({ success: true, data: { acts } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /acts/:title — get sections for a specific act ─────────────
router.get("/acts/:title", async (req: Request, res: Response, next) => {
  try {
    const title = decodeURIComponent(req.params.title).slice(0, 500);
    if (!title || title.length < 2) {
      throw new AppError(400, "BAD_REQUEST", "Invalid act title");
    }

    const result = await indianKanoonService.getActSections(title);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
