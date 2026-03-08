/** Supported UI languages */
export type AppLanguage = "en" | "hi";

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

export const DEFAULT_LANGUAGE: AppLanguage = "en";
