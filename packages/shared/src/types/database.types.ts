// Types matching Supabase schema (supabase/migrations/20240101000000_initial_schema.sql)
// Regenerate with: npx supabase gen types typescript --local > packages/shared/src/types/database.types.ts

export type SubscriptionTier = "free" | "starter" | "professional";

export type CreditAction = "chat" | "research" | "analysis" | "text_draft" | "skills_doc";

export const CREDIT_COSTS: Record<CreditAction, number> = {
  chat: 1,
  research: 2,
  analysis: 5,
  text_draft: 8,
  skills_doc: 15,
} as const;

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price_inr: number;
  credits_per_month: number;
  queries_per_day: number | null;
  skills_docs_per_month: number | null;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "free",
    name: "Free",
    price_inr: 0,
    credits_per_month: 500,
    queries_per_day: null,
    skills_docs_per_month: null,
    features: [
      "500 AI credits/month",
      "Basic legal chat",
      "Case management",
      "Limited research",
    ],
  },
  {
    tier: "starter",
    name: "Starter",
    price_inr: 499,
    credits_per_month: 2000,
    queries_per_day: 50,
    skills_docs_per_month: 10,
    features: [
      "50 queries/day",
      "10 Skills documents/month",
      "Priority research",
      "Document analysis",
      "Email support",
    ],
  },
  {
    tier: "professional",
    name: "Professional",
    price_inr: 1499,
    credits_per_month: 10000,
    queries_per_day: null,
    skills_docs_per_month: 50,
    features: [
      "Unlimited queries",
      "50 Skills documents/month",
      "Advanced research + analytics",
      "Bulk document analysis",
      "Priority support",
      "API access",
    ],
  },
];

export type CaseStatus =
  | "draft"
  | "filed"
  | "in_progress"
  | "hearing_scheduled"
  | "judgement_reserved"
  | "disposed"
  | "appealed"
  | "closed";

export type DeadlineType = "hearing" | "filing" | "limitation" | "compliance" | "other";

export type GenerationMethod = "manual" | "ai_chat" | "ai_skill";

export type SkillGenerationStatus = "pending" | "processing" | "completed" | "failed";

export type SourceType = "act" | "judgement" | "commentary" | "article";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "client" | "lawyer" | "admin";
  avatar_url: string | null;
  bar_council_id: string | null;
  practice_areas: string[] | null;
  experience_years: number | null;
  bio: string | null;
  languages: string[] | null;
  courts_practiced: string[] | null;
  consultation_fee: number | null;
  city: string | null;
  state: string | null;
  default_court: string | null;
  preferred_language: string | null;
  onboarding_completed: boolean | null;
  rating: number | null;
  total_cases: number | null;
  win_rate: number | null;
  is_verified: boolean | null;
  subscription_tier: SubscriptionTier | null;
  ai_credits: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseMatter {
  id: string;
  user_id: string;
  lawyer_id: string | null;
  title: string;
  description: string | null;
  case_number: string | null;
  case_type: string;
  court_level: string;
  court_name: string | null;
  practice_area: string;
  status: CaseStatus;
  filing_date: string | null;
  next_hearing_date: string | null;
  opposing_party: string | null;
  opposing_counsel: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalDocument {
  id: string;
  user_id: string;
  case_matter_id: string | null;
  title: string;
  document_type: string;
  content: string | null;
  file_url: string | null;
  file_id: string | null;
  file_size: number | null;
  mime_type: string | null;
  generation_method: GenerationMethod | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  case_matter_id: string | null;
  title: string | null;
  practice_area: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[];
  ai_model: string | null;
  tokens_used: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Citation {
  text: string;
  source: string;
  source_type: SourceType;
  chunk_id?: string;
  verified?: boolean;
}

export interface LegalChunk {
  id: string;
  source_type: SourceType;
  source_title: string;
  section_ref: string | null;
  content: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CaseDeadline {
  id: string;
  case_matter_id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline_date: string;
  deadline_type: DeadlineType;
  reminder_days: number[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillGeneration {
  id: string;
  user_id: string;
  case_matter_id: string | null;
  skill_ids: string[];
  prompt: string;
  anthropic_file_id: string | null;
  output_format: string | null;
  tokens_used: number | null;
  generation_time_ms: number | null;
  status: SkillGenerationStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeadlineNotificationRow {
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

export interface BetaUsageAnalytic {
  id: string;
  user_id: string;
  action_type: string;
  feature: string | null;
  credits_would_cost: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  feature: string;
  rating: number | null;
  comment: string | null;
  response_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  razorpay_subscription_id: string | null;
  razorpay_customer_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageSummary {
  credits_used: number;
  credits_limit: number;
  queries_today: number;
  queries_limit: number | null;
  skills_docs_this_month: number;
  skills_docs_limit: number | null;
  equivalent_plan: SubscriptionTier;
  equivalent_cost_inr: number;
}
