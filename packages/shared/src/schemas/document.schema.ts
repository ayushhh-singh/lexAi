import { z } from "zod";

export const uploadDocumentSchema = z.object({
  case_id: z.string().uuid("Invalid case ID"),
  title: z.string().min(1, "Document title is required"),
  document_type: z.string().min(1, "Document type is required"),
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
