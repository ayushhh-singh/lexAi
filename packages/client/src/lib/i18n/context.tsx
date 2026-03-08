import { useCallback } from "react";
import type { AppLanguage } from "@nyay/shared";
import { useUIStore } from "../../stores/ui.store";
import {
  getTranslation,
  getTranslationWithParams,
  type TranslationKey,
} from "./translations";

const VALID_LANGUAGES = new Set<AppLanguage>(["en", "hi"]);

/**
 * useTranslation hook — reads language from Zustand UI store.
 *
 * Usage:
 *   const { t, language, setLanguage } = useTranslation();
 *   t("nav.dashboard")                // → "Dashboard" | "डैशबोर्ड"
 *   t("dashboard.welcome", { name })  // → "Welcome back, Ayush"
 */
export function useTranslation() {
  const rawLanguage = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  // Guard against corrupted localStorage values
  const language: AppLanguage = VALID_LANGUAGES.has(rawLanguage as AppLanguage)
    ? (rawLanguage as AppLanguage)
    : "en";

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      if (params) {
        return getTranslationWithParams(key, language, params);
      }
      return getTranslation(key, language);
    },
    [language],
  );

  return { t, language, setLanguage } as const;
}

export type { TranslationKey };
