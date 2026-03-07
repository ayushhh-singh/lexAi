import { z } from "zod";

export const uploadDocumentSchema = z.object({
  case_id: z.string().uuid("Invalid case ID"),
  title: z.string().min(1, "Document title is required"),
  document_type: z.string().min(1, "Document type is required"),
});

export const generateDocumentSchema = z.object({
  template: z.enum([
    "legal-notice",
    "bail-application",
    "writ-petition",
    "contract-nda",
    "affidavit",
  ]),
  format: z.enum(["docx", "pdf"]).default("docx"),
  fields: z.record(z.string()).refine((f) => Object.keys(f).length > 0, {
    message: "At least one field is required",
  }),
  case_matter_id: z.string().uuid().optional(),
  court: z.string().optional(),
  language: z.enum(["en", "hi"]).default("en"),
});

export const documentFilterSchema = z.object({
  case_id: z.string().uuid().optional(),
  document_type: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;
export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
