import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireCredits } from "../middleware/credits.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import { ragService } from "../services/rag.service.js";
import type { SearchRequest, ExplainRequest } from "@nyay/shared";

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

export default router;
