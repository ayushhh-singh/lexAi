import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import { limitationService } from "../services/limitation.service.js";
import { calculateLimitationSchema, limitationSuggestSchema } from "@nyay/shared";
import type { LimitationCategory } from "@nyay/shared";

const router = Router();

router.use(requireAuth);

const VALID_CATEGORIES = new Set<string>([
  "suits_relating_to_contracts",
  "suits_relating_to_declarations",
  "suits_relating_to_decrees_and_instruments",
  "suits_relating_to_movable_property",
  "suits_relating_to_immovable_property",
  "suits_relating_to_torts",
  "appeals",
  "applications",
  "criminal",
  "special_statutes",
]);

// ─── GET /periods — list all limitation periods ──────────────────
router.get("/periods", async (req: Request, res: Response, next) => {
  try {
    const raw = req.query.category as string | undefined;
    const category = raw && VALID_CATEGORIES.has(raw) ? (raw as LimitationCategory) : undefined;
    if (raw && !category) {
      throw new AppError(400, "VALIDATION_ERROR", `Invalid category: ${raw}`);
    }
    const periods = limitationService.getPeriods(category);
    res.json({ success: true, data: periods });
  } catch (err) {
    next(err);
  }
});

// ─── GET /categories — list limitation categories ────────────────
router.get("/categories", async (_req: Request, res: Response, next) => {
  try {
    const categories = limitationService.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// ─── POST /calculate — calculate deadline with exclusions ────────
router.post("/calculate", async (req: Request, res: Response, next) => {
  try {
    const parsed = calculateLimitationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0].message);
    }
    const result = limitationService.calculateDeadline(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else if (err instanceof Error && (err.message.startsWith("Unknown limitation") || err.message.startsWith("Invalid cause"))) {
      next(new AppError(400, "VALIDATION_ERROR", err.message));
    } else {
      next(err);
    }
  }
});

// ─── POST /suggest — get suggested periods for a case ────────────
router.post("/suggest", async (req: Request, res: Response, next) => {
  try {
    const parsed = limitationSuggestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0].message);
    }
    const suggestions = limitationService.getSuggestions(parsed.data);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
});

// ─── GET /periods/:id — get a single period ─────────────────────
router.get("/periods/:id", async (req: Request, res: Response, next) => {
  try {
    const period = limitationService.getPeriodById(req.params.id);
    if (!period) {
      throw new AppError(404, "NOT_FOUND", "Limitation period not found");
    }
    res.json({ success: true, data: period });
  } catch (err) {
    next(err);
  }
});

export default router;
