import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  PaginationParams,
  Profile,
  Conversation,
  Message,
  CaseMatter,
  LegalDocument,
  LegalChunk,
  SkillGeneration,
  SearchResponse,
  ExplainResponse,
  CaseLawSearchRequest,
  CaseLawSearchResponse,
  BrowseActsResponse,
  ActSectionsResponse,
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
    stream: async (body: { message: string; conversation_id: string; practice_area?: string }, signal?: AbortSignal) => {
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
      axiosInstance.post<ApiResponse<CaseMatter>>("/cases", data).then((r) => r.data),
    list: (params?: PaginationParams & { status?: string; practice_area?: string; court_level?: string; search?: string }) =>
      axiosInstance.get<ApiResponse<CaseMatter[]>>("/cases", { params }).then((r) => r.data),
    get: (id: string) =>
      axiosInstance
        .get<ApiResponse<CaseMatter>>(`/cases/${validateId(id)}`)
        .then((r) => r.data),
    update: (id: string, data: Partial<CaseUpdateFields>) =>
      axiosInstance
        .patch<ApiResponse<CaseMatter>>(`/cases/${validateId(id)}`, data)
        .then((r) => r.data),
    delete: (id: string) =>
      axiosInstance
        .delete<ApiResponse<void>>(`/cases/${validateId(id)}`)
        .then((r) => r.data),
  },
};
