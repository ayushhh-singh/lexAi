import { z } from "zod";

export const createCaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  case_type: z.string().min(1, "Case type is required"),
  court_level: z.string().min(1, "Court level is required"),
  court_name: z.string().optional(),
  practice_area: z.string().min(1, "Practice area is required"),
  filing_date: z.string().optional(),
});

export const updateCaseSchema = createCaseSchema.partial().extend({
  status: z
    .enum([
      "draft",
      "filed",
      "in_progress",
      "hearing_scheduled",
      "judgement_reserved",
      "disposed",
      "appealed",
      "closed",
    ])
    .optional(),
  case_number: z.string().optional(),
  next_hearing_date: z.string().optional(),
  lawyer_id: z.string().uuid().optional(),
  opposing_party: z.string().max(500).optional(),
  opposing_counsel: z.string().max(500).optional(),
});

export const caseFilterSchema = z.object({
  status: z.string().optional(),
  practice_area: z.string().optional(),
  court_level: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type CaseFilterInput = z.infer<typeof caseFilterSchema>;
