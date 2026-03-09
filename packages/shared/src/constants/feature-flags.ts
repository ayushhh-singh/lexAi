/**
 * Feature flags — controlled by environment variables.
 *
 * Server reads from process.env, client reads from VITE_* env vars.
 * During beta: SHOW_PRICING=false, ENFORCE_CREDITS=false, BETA_MODE=true.
 * To go live:  SHOW_PRICING=true,  ENFORCE_CREDITS=true,  BETA_MODE=false.
 */
export const FEATURE_FLAGS = {
  AI_CHAT: true,
  AI_DOCUMENT_ANALYSIS: true,
  AI_CASE_PREDICTION: false,
  PAYMENT_GATEWAY: true,
  LAWYER_MARKETPLACE: false,
  VIDEO_CONSULTATION: false,
  MULTI_LANGUAGE: true,
  DOCUMENT_E_SIGN: false,

  // ─── Payment / Beta Flags ───────────────────────────────────────
  SHOW_PRICING: boolEnv("SHOW_PRICING", "VITE_SHOW_PRICING", false),
  ENFORCE_CREDITS: boolEnv("ENFORCE_CREDITS", "VITE_ENFORCE_CREDITS", false),
  SHOW_UPGRADE_PROMPTS: boolEnv("SHOW_UPGRADE_PROMPTS", "VITE_SHOW_UPGRADE_PROMPTS", false),
  BETA_MODE: boolEnv("BETA_MODE", "VITE_BETA_MODE", true),
  FREE_TRIAL_DAYS: numEnv("FREE_TRIAL_DAYS", "VITE_FREE_TRIAL_DAYS", 30),
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// ─── Helpers ────────────────────────────────────────────────────────

function getEnv(serverKey: string, clientKey: string): string | undefined {
  // Server (Node)
  if (typeof process !== "undefined" && process.env) {
    return process.env[serverKey];
  }
  // Client (Vite)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (import.meta as any).env?.[clientKey];
  } catch {
    return undefined;
  }
}

function boolEnv(serverKey: string, clientKey: string, fallback: boolean): boolean {
  const v = getEnv(serverKey, clientKey);
  if (v === undefined) return fallback;
  return v === "true";
}

function numEnv(serverKey: string, clientKey: string, fallback: number): number {
  const v = getEnv(serverKey, clientKey);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}
