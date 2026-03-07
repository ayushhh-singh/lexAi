import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { AppError } from "./error.middleware.js";
import type { Profile } from "@nyay/shared";

declare global {
  namespace Express {
    interface Request {
      user?: Profile;
      token?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new AppError(401, "UNAUTHORIZED", "User profile not found");
    }

    req.user = profile as Profile;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}
