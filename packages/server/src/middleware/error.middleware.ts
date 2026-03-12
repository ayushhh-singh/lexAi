import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    console.error(`[error] ${err.statusCode} ${err.code} — ${req.method} ${req.originalUrl} — ${err.message}`);
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error(`[error] 500 INTERNAL_ERROR — ${req.method} ${req.originalUrl} — ${err.message}`, err.stack?.split("\n").slice(0, 3).join(" | "));
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}
