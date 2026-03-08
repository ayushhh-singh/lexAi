import type { CaseMatter } from "./database.types";

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

// ─── Document Generation ────────────────────────────────────────────

export type DocumentTemplate =
  | "legal-notice"
  | "bail-application"
  | "writ-petition"
  | "contract-nda"
  | "affidavit";

export type DocumentOutputFormat = "docx" | "pdf";

export interface GenerateDocumentRequest {
  template: DocumentTemplate;
  format: DocumentOutputFormat;
  fields: Record<string, string>;
  case_matter_id?: string;
  court?: string;
  language?: "en" | "hi";
}

export interface GenerateDocumentResponse {
  id: string;
  title: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  tokens_used: number;
}

export interface DocumentListItem {
  id: string;
  title: string;
  document_type: string;
  mime_type: string | null;
  file_size: number | null;
  generation_method: string | null;
  created_at: string;
}

// ─── Research Module ─────────────────────────────────────────────────

export interface CaseLawSearchRequest {
  keywords: string;
  court?: string;
  judge?: string;
  year_from?: number;
  year_to?: number;
  statute?: string;
  limit?: number;
}

export interface CaseLawResult {
  id: string;
  title: string;
  citation: string;
  court: string;
  date: string;
  judges: string[];
  headnote: string;
  source: "knowledge_base" | "indian_kanoon";
  chunk_ids?: string[];
}

export interface CaseLawSearchResponse {
  query: CaseLawSearchRequest;
  results: CaseLawResult[];
  total: number;
}

export interface ActEntry {
  id: string;
  title: string;
  year: number;
  short_title: string;
}

export interface ActSection {
  id: string;
  section_ref: string;
  title: string;
  content: string;
}

export interface BrowseActsResponse {
  acts: ActEntry[];
}

export interface ActSectionsResponse {
  act: ActEntry;
  sections: ActSection[];
}

// ─── Cases Module ──────────────────────────────────────────────────

export interface CaseStats {
  total_documents: number;
  total_conversations: number;
  total_deadlines: number;
  upcoming_deadlines: number;
  overdue_deadlines: number;
}

export interface CaseWithStats extends CaseMatter {
  stats: CaseStats;
}

export interface CaseNote {
  id: string;
  case_matter_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CaseSummaryRequest {
  case_id: string;
}

export interface CaseSummaryResponse {
  id: string;
  title: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  tokens_used: number;
}

// ─── Limitation Calculator ─────────────────────────────────────

export interface LimitationPeriod {
  id: string;
  article: string;
  description: string;
  period_days: number;
  period_label: string;
  act: string;
  section: string | null;
  category: LimitationCategory;
  condonable: boolean;
  condonation_section: string | null;
  notes: string | null;
}

export type LimitationCategory =
  | "suits_relating_to_contracts"
  | "suits_relating_to_declarations"
  | "suits_relating_to_decrees_and_instruments"
  | "suits_relating_to_movable_property"
  | "suits_relating_to_immovable_property"
  | "suits_relating_to_torts"
  | "appeals"
  | "applications"
  | "criminal"
  | "special_statutes";

export interface ExclusionInput {
  section_12?: { days: number; reason: string };
  section_14?: { days: number; reason: string };
  section_15?: { days: number; reason: string };
}

export interface LimitationCalculation {
  cause_date: string;
  limitation_period: LimitationPeriod;
  raw_deadline: string;
  exclusions_applied: ExclusionInput;
  total_excluded_days: number;
  final_deadline: string;
  days_remaining: number;
  is_expired: boolean;
  is_condonable: boolean;
  condonation_note: string | null;
  warnings: string[];
}

export interface LimitationSuggestion {
  period: LimitationPeriod;
  relevance: string;
}

export interface DeadlineNotification {
  id: string;
  user_id: string;
  case_matter_id: string;
  deadline_id: string;
  title: string;
  message: string;
  notification_type: "upcoming" | "overdue" | "reminder";
  days_until_deadline: number;
  is_read: boolean;
  created_at: string;
}
