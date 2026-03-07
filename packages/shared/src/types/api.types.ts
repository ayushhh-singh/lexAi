export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  bar_council_id: string;
  practice_areas: string[];
  city: string;
  state: string;
}

// ─── RAG / Research ─────────────────────────────────────────────────

export type QueryIntent =
  | "general_query"
  | "case_law_research"
  | "statute_lookup"
  | "draft_document"
  | "summarize"
  | "procedural_question"
  | "opinion";

export interface SearchFilters {
  source_type?: "act" | "judgement" | "commentary" | "article";
  source_title?: string;
}

export interface ScoredChunk {
  id: string;
  source_type: string;
  source_title: string;
  section_ref: string | null;
  content: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  score: number;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
}

export interface SearchResponse {
  query: string;
  intent: QueryIntent;
  results: ScoredChunk[];
}

export interface ExplainRequest {
  query: string;
  filters?: SearchFilters;
}

export interface ExplainResponse {
  query: string;
  answer: string;
  sources: ScoredChunk[];
  cached: boolean;
}
