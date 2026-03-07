import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { config } from "../lib/config.js";
import { AppError } from "./error.middleware.js";

export function requireCredits(cost: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required");
      }

      const credits = user.ai_credits ?? 0;

      if (credits < cost) {
        if (config.ENFORCE_CREDITS) {
          throw new AppError(
            402,
            "INSUFFICIENT_CREDITS",
            `This action requires ${cost} credits. You have ${credits} remaining.`
          );
        }
        console.warn(
          `[credits] User ${user.id} has ${credits} credits, action costs ${cost} — allowing (enforcement disabled)`
        );
      }

      // Deduct credits atomically when response finishes successfully
      res.on("finish", async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Atomic decrement via RPC to prevent TOCTOU race conditions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabaseAdmin.rpc as any)("deduct_credits", {
            p_user_id: user.id,
            p_cost: cost,
          });
          if (error) {
            console.error(`[credits] Failed to deduct credits for user ${user.id}:`, error);
          }
        }
      });

      next();
    } catch (err) {
      next(err);
    }
  };
}
