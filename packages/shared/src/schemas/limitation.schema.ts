import { z } from "zod";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const exclusionEntry = z.object({
  days: z.number().int().min(0).max(36500),
  reason: z.string().min(1).max(500),
});

export const calculateLimitationSchema = z.object({
  cause_date: z
    .string()
    .min(1, "Date of cause of action is required")
    .regex(ISO_DATE_RE, "Date must be in YYYY-MM-DD format")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  period_id: z.string().min(1, "Limitation period is required").max(50),
  exclusions: z
    .object({
      section_12: exclusionEntry.optional(),
      section_14: exclusionEntry.optional(),
      section_15: exclusionEntry.optional(),
    })
    .optional(),
});

export const limitationSuggestSchema = z.object({
  case_type: z.string().min(1, "Case type is required").max(200),
  description: z.string().max(2000).optional(),
});

export type CalculateLimitationInput = z.infer<typeof calculateLimitationSchema>;
export type LimitationSuggestInput = z.infer<typeof limitationSuggestSchema>;
