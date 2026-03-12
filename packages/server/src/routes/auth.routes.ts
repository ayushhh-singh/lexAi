import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { AppError } from "../middleware/error.middleware.js";

const router = Router();

// GET /api/auth/profile
router.get("/profile", requireAuth, async (req, res) => {
  res.json({ success: true, data: req.user });
});

// PATCH /api/auth/profile
router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const allowedFields = [
      "full_name",
      "phone",
      "avatar_url",
      "bar_council_id",
      "practice_areas",
      "experience_years",
      "bio",
      "languages",
      "courts_practiced",
      "consultation_fee",
      "city",
      "state",
      "default_court",
      "preferred_language",
      "onboarding_completed",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "BAD_REQUEST", "No valid fields to update");
    }

    // Type-check boolean fields to prevent injection of non-boolean values
    if ("onboarding_completed" in updates && typeof updates.onboarding_completed !== "boolean") {
      throw new AppError(400, "BAD_REQUEST", "onboarding_completed must be a boolean");
    }

    console.log("[auth] PATCH /profile updates:", JSON.stringify(updates), "userId:", user.id);

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[auth] profile update failed:", error);
      throw new AppError(500, "UPDATE_FAILED", "Failed to update profile");
    }

    console.log("[auth] profile updated, onboarding_completed:", (data as Record<string, unknown>)?.onboarding_completed);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
