import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  PaginationParams,
  Profile,
  Conversation,
  Message,
  CaseMatter,
  CaseWithStats,
  CaseDeadline,
  CaseNote,
  LegalDocument,
  LegalChunk,
  SkillGeneration,
  SearchResponse,
  ExplainResponse,
  CaseLawSearchRequest,
  CaseLawSearchResponse,
  BrowseActsResponse,
  ActSectionsResponse,
  LimitationPeriod,
  LimitationCalculation,
  LimitationSuggestion,
  LimitationCategory,
  DeadlineNotification,
  CalculateLimitationInput,
  LimitationSuggestInput,
  AnalyzeDocumentResponse,
  DocumentAnalysisResult,
  GenerateDocumentResponse,
} from "@nyay/shared";
import { supabase } from "./supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(id: string): string {
  if (!UUID_RE.test(id)) throw new Error("Invalid ID format");
  return id;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach Supabase JWT to every request
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

// Handle 401 (unauthorized) and 402 (upgrade required)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // Skip redirect for requests explicitly marked as auth-init
    const skipRedirect = error.config?.headers?.["X-Auth-Init"] === "true";
    if (status === 401 && !skipRedirect) {
      supabase.auth.signOut();
      window.location.href = "/login";
    } else if (status === 402) {
      window.location.href = "/settings?tab=billing&upgrade=true";
    }
    return Promise.reject(error);
  },
);

type CaseUpdateFields = Pick<
  CaseMatter,
  | "title"
  | "description"
  | "case_type"
  | "court_level"
  | "court_name"
  | "practice_area"
  | "status"
  | "case_number"
  | "filing_date"
  | "next_hearing_date"
  | "opposing_party"
  | "opposing_counsel"
>;

type ProfileUpdateFields = Pick<
  Profile,
  | "full_name"
  | "phone"
  | "avatar_url"
  | "bar_council_id"
  | "practice_areas"
  | "experience_years"
  | "bio"
  | "languages"
  | "courts_practiced"
  | "consultation_fee"
  | "city"
  | "state"
  | "default_court"
  | "preferred_language"
  | "onboarding_completed"
>;

export const api = {
  auth: {
    getProfile: (opts?: { skipRedirect?: boolean }) =>
      axiosInstance
        .get<ApiResponse<Profile>>("/auth/profile", {
          headers: opts?.skipRedirect ? { "X-Auth-Init": "true" } : undefined,
        })
        .then((r) => r.data),
    updateProfile: (data: Partial<ProfileUpdateFields>) =>
      axiosInstance.patch<ApiResponse<Profile>>("/auth/profile", data).then((r) => r.data),
  },

  chat: {
    stream: async (body: { message: string; conversation_id: string; practice_area?: string; language?: string }, signal?: AbortSignal) => {
      const token = await getAccessToken();
      const response = await fetch(`${BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
      if (response.status === 401) {
        await supabase.auth.signOut();
        window.location.href = "/login";
      } else if (response.status === 402) {
        window.location.href = "/settings?tab=billing&upgrade=true";
      }
      return response;
    },
    listConversations: (params?: PaginationParams) =>
      axiosInstance
        .get<ApiResponse<Conversation[]>>("/chat/conversations", { params })
        .then((r) => r.data),
    createConversation: (data: { title?: string; practice_area?: string; case_matter_id?: string }) =>
      axiosInstance
        .post<ApiResponse<Conversation>>("/chat/conversations", data)
        .then((r) => r.data),
    getMessages: (conversationId: string, params?: PaginationParams) =>
      axiosInstance
        .get<ApiResponse<Message[]>>(
          `/chat/conversations/${validateId(conversationId)}/messages`,
          { params },
        )
        .then((r) => r.data),
    deleteConversation: (conversationId: string) =>
      axiosInstance
        .delete<ApiResponse<void>>(`/chat/conversations/${validateId(conversationId)}`)
        .then((r) => r.data),
  },

  documents: {
    generate: (body: {
      case_id?: string;
      document_type: string;
      prompt: string;
      output_format?: string;
    }) =>
      axiosInstance
        .post<ApiResponse<SkillGeneration>>("/documents/generate", body)
        .then((r) => r.data),
    generateSSE: async (body: {
      template: string;
      format: string;
      fields: Record<string, string>;
      case_matter_id?: string;
      court?: string;
      language?: string;
    }) => {
      const token = await getAccessToken();
      const response = await fetch(`${BASE_URL}/documents/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (response.status === 401) {
        await supabase.auth.signOut();
        window.location.href = "/login";
      } else if (response.status === 402) {
        window.location.href = "/settings?tab=billing&upgrade=true";
      }
      return response;
    },
    download: async (id: string): Promise<ArrayBuffer> => {
      const response = await axiosInstance.get(`/documents/${validateId(id)}/download`, {
        responseType: "arraybuffer",
      });
      return response.data;
    },
    list: (params?: PaginationParams & { case_id?: string; document_type?: string; search?: string }) =>
      axiosInstance.get<ApiResponse<LegalDocument[]>>("/documents", { params }).then((r) => r.data),
    get: (id: string) =>
      axiosInstance
        .get<ApiResponse<LegalDocument>>(`/documents/${validateId(id)}`)
        .then((r) => r.data),
    delete: (id: string) =>
      axiosInstance
        .delete<ApiResponse<void>>(`/documents/${validateId(id)}`)
        .then((r) => r.data),
    analyze: async (file: File, options?: { case_matter_id?: string; language?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (options?.case_matter_id) formData.append("case_matter_id", options.case_matter_id);
      if (options?.language) formData.append("language", options.language);
      const token = await getAccessToken();
      const response = await axiosInstance.post<ApiResponse<AnalyzeDocumentResponse>>(
        "/documents/analyze",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 120_000, // 2 min for extraction + analysis
        }
      );
      return response.data;
    },
    getAnalysis: (id: string) =>
      axiosInstance
        .get<ApiResponse<DocumentAnalysisResult>>(`/documents/${validateId(id)}/analysis`)
        .then((r) => r.data),
    generateReport: (id: string) =>
      axiosInstance
        .post<ApiResponse<GenerateDocumentResponse>>(`/documents/${validateId(id)}/analysis/report`)
        .then((r) => r.data),
  },

  research: {
    search: (body: { query: string; filters?: { source_type?: string; source_title?: string }; limit?: number }) =>
      axiosInstance
        .post<ApiResponse<SearchResponse>>("/research/search", body)
        .then((r) => r.data),
    explain: (body: { query: string; filters?: { source_type?: string } }) =>
      axiosInstance
        .post<ApiResponse<ExplainResponse>>("/research/explain", body)
        .then((r) => r.data),
    searchCases: (body: CaseLawSearchRequest) =>
      axiosInstance
        .post<ApiResponse<CaseLawSearchResponse>>("/research/cases", body)
        .then((r) => r.data),
    browseActs: () =>
      axiosInstance
        .get<ApiResponse<BrowseActsResponse>>("/research/acts")
        .then((r) => r.data),
    getActSections: (title: string) =>
      axiosInstance
        .get<ApiResponse<ActSectionsResponse>>(`/research/acts/${encodeURIComponent(title)}`)
        .then((r) => r.data),
    verifyCitation: (id: string) =>
      axiosInstance
        .get<ApiResponse<{ verified: boolean; source: LegalChunk }>>(
          `/research/citations/${validateId(id)}`,
        )
        .then((r) => r.data),
  },

  cases: {
    create: (data: {
      title: string;
      description?: string;
      case_type: string;
      court_level: string;
      court_name?: string;
      practice_area: string;
      filing_date?: string;
    }) =>
      axiosInstance.post<ApiResponse<CaseWithStats>>("/cases", data).then((r) => r.data),
    list: (params?: PaginationParams & { status?: string; practice_area?: string; court_level?: string; search?: string }) =>
      axiosInstance.get<ApiResponse<CaseWithStats[]>>("/cases", { params }).then((r) => r.data),
    get: (id: string) =>
      axiosInstance
        .get<ApiResponse<CaseWithStats>>(`/cases/${validateId(id)}`)
        .then((r) => r.data),
    update: (id: string, data: Partial<CaseUpdateFields>) =>
      axiosInstance
        .patch<ApiResponse<CaseMatter>>(`/cases/${validateId(id)}`, data)
        .then((r) => r.data),
    delete: (id: string) =>
      axiosInstance
        .delete<ApiResponse<void>>(`/cases/${validateId(id)}`)
        .then((r) => r.data),
    getDeadlines: (id: string) =>
      axiosInstance
        .get<ApiResponse<CaseDeadline[]>>(`/cases/${validateId(id)}/deadlines`)
        .then((r) => r.data),
    createDeadline: (id: string, data: { title: string; description?: string; deadline_date: string; deadline_type: string; reminder_days?: number[] }) =>
      axiosInstance
        .post<ApiResponse<CaseDeadline>>(`/cases/${validateId(id)}/deadlines`, data)
        .then((r) => r.data),
    toggleDeadline: (deadlineId: string) =>
      axiosInstance
        .patch<ApiResponse<CaseDeadline>>(`/cases/deadlines/${validateId(deadlineId)}/toggle`)
        .then((r) => r.data),
    getNotes: (id: string) =>
      axiosInstance
        .get<ApiResponse<CaseNote[]>>(`/cases/${validateId(id)}/notes`)
        .then((r) => r.data),
    createNote: (id: string, content: string) =>
      axiosInstance
        .post<ApiResponse<CaseNote>>(`/cases/${validateId(id)}/notes`, { content })
        .then((r) => r.data),
    deleteNote: (noteId: string) =>
      axiosInstance
        .delete<ApiResponse<void>>(`/cases/notes/${validateId(noteId)}`)
        .then((r) => r.data),
    generateSummarySSE: async (id: string) => {
      const token = await getAccessToken();
      const response = await fetch(`${BASE_URL}/cases/${validateId(id)}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.status === 401) {
        await supabase.auth.signOut();
        window.location.href = "/login";
      } else if (response.status === 402) {
        window.location.href = "/settings?tab=billing&upgrade=true";
      }
      return response;
    },
  },

  limitation: {
    getPeriods: (category?: LimitationCategory) =>
      axiosInstance
        .get<ApiResponse<LimitationPeriod[]>>("/limitation/periods", { params: category ? { category } : undefined })
        .then((r) => r.data),
    getCategories: () =>
      axiosInstance
        .get<ApiResponse<Array<{ id: LimitationCategory; label: string }>>>("/limitation/categories")
        .then((r) => r.data),
    calculate: (data: CalculateLimitationInput) =>
      axiosInstance
        .post<ApiResponse<LimitationCalculation>>("/limitation/calculate", data)
        .then((r) => r.data),
    suggest: (data: LimitationSuggestInput) =>
      axiosInstance
        .post<ApiResponse<LimitationSuggestion[]>>("/limitation/suggest", data)
        .then((r) => r.data),
    getPeriod: (id: string) =>
      axiosInstance
        .get<ApiResponse<LimitationPeriod>>(`/limitation/periods/${encodeURIComponent(id)}`)
        .then((r) => r.data),
  },

  notifications: {
    list: (params?: { unread_only?: boolean }) =>
      axiosInstance
        .get<ApiResponse<DeadlineNotification[]>>("/notifications", { params })
        .then((r) => r.data),
    markRead: (id: string) =>
      axiosInstance
        .patch<ApiResponse<void>>(`/notifications/${validateId(id)}/read`)
        .then((r) => r.data),
  },
};
