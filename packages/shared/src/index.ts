export * from "./types/database.types.ts";
export * from "./types/api.types.ts";
export * from "./types/legal.types.ts";
export type { Database, Tables, TablesInsert, TablesUpdate } from "./types/supabase.ts";

export * from "./schemas/auth.schema.ts";
export * from "./schemas/case.schema.ts";
export * from "./schemas/document.schema.ts";
export * from "./schemas/limitation.schema.ts";
export * from "./schemas/payment.schema.ts";

export * from "./constants/practice-areas.ts";
export * from "./constants/court-levels.ts";
export * from "./constants/document-types.ts";
export * from "./constants/feature-flags.ts";
export * from "./constants/indian-states.ts";
export * from "./constants/i18n.ts";
export * from "./constants/hindi-legal-terms.ts";

export * from "./utils/citation-patterns.ts";
