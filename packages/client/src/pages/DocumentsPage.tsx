import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Grid,
  List,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  Filter,
  X,
  ChevronLeft,
  FolderOpen,
} from "lucide-react";
import { api } from "../lib/api-client";
import { DocumentUploader } from "../components/documents/DocumentUploader";
import { AnalysisResult } from "../components/documents/AnalysisResult";
import { useTranslation } from "../lib/i18n";
import type {
  LegalDocument,
  AnalyzeDocumentResponse,
} from "@nyay/shared";

type ViewMode = "grid" | "list";
type PageView = "library" | "upload" | "analysis";

const DOC_TYPE_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  "legal-notice": "Legal Notice",
  "bail-application": "Bail Application",
  "writ-petition": "Writ Petition",
  "contract-nda": "Contract / NDA",
  affidavit: "Affidavit",
  analysis_report: "Analysis Report",
};

export function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Library state
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Page view state
  const [pageView, setPageView] = useState<PageView>("library");

  // Upload / analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeDocumentResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.documents.list({
        search: searchQuery || undefined,
        document_type: typeFilter || undefined,
      });
      setDocuments(res.data || []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle file upload + analysis
  const handleUpload = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setPageView("analysis");

    try {
      const res = await api.documents.analyze(file);
      if (!res.data) {
        setAnalysisError("Analysis returned no data. Please try again.");
        return;
      }
      setAnalysisResult(res.data);
      fetchDocuments();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
              ?.error?.message || "Analysis failed. Please try again.";
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!analysisResult) return;
    setIsGeneratingReport(true);
    try {
      const res = await api.documents.generateReport(analysisResult.document.id);
      if (res.data?.file_url) {
        window.open(res.data.file_url, "_blank");
      }
      fetchDocuments();
    } catch {
      // error handled by interceptor
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handle document download
  const handleDownload = async (doc: LegalDocument) => {
    try {
      const data = await api.documents.download(doc.id);
      const blob = new Blob([data], {
        type: doc.mime_type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}.${doc.mime_type?.includes("pdf") ? "pdf" : "docx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handled
    }
  };

  // Handle document delete
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.documents.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // handled
    }
  };

  // Handle view analysis for existing document
  const handleViewAnalysis = async (doc: LegalDocument) => {
    try {
      const res = await api.documents.getAnalysis(doc.id);
      if (res.data) {
        setAnalysisResult({
          analysis: res.data,
          document: {
            id: doc.id,
            title: doc.title,
            document_type: doc.document_type,
            mime_type: doc.mime_type,
            file_size: doc.file_size,
            generation_method: doc.generation_method,
            created_at: doc.created_at,
          },
        });
        setPageView("analysis");
      }
    } catch {
      // No analysis found — could show a message
    }
  };

  // Ask Follow-up: navigate to chat with document analysis context
  const handleAskFollowUp = () => {
    if (!analysisResult) return;
    const { analysis, document: doc } = analysisResult;
    const context = [
      `I just analyzed a document titled "${doc.title}". Here is the analysis:`,
      ``,
      `**Summary:** ${analysis.summary}`,
      ``,
      `**Key Issues:** ${analysis.key_issues.map((i) => `${i.title} (${i.severity}): ${i.description}`).join("; ")}`,
      ``,
      `**Relevant Statutes:** ${analysis.relevant_statutes.map((s) => `${s.name} ${s.section} — ${s.relevance}`).join("; ")}`,
      ``,
      `**Risks:** ${analysis.risk_assessment.map((r) => `${r.area} (${r.level}): ${r.description}`).join("; ")}`,
      ``,
      `Based on this analysis, I have some follow-up questions.`,
    ].join("\n");
    sessionStorage.setItem("nyay_chat_context", context);
    navigate("/chat");
  };

  // Draft Response: navigate to template picker with analysis context attached
  const handleDraftResponse = () => {
    if (!analysisResult) return;
    const { analysis, document: doc } = analysisResult;
    const context = JSON.stringify({
      documentTitle: doc.title,
      summary: analysis.summary,
      key_issues: analysis.key_issues,
      relevant_statutes: analysis.relevant_statutes,
      next_steps: analysis.next_steps,
    });
    sessionStorage.setItem("nyay_draft_context", context);
    navigate("/drafts?from=analysis");
  };

  // ─── Render ────────────────────────────────────────────────────────

  if (pageView === "upload") {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <button
          onClick={() => setPageView("library")}
          className="mb-6 flex items-center gap-1.5 font-heading text-sm font-medium text-gray-500 transition-colors hover:text-navy-600"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("common.back")}
        </button>

        <h1 className="mb-2 font-heading text-xl font-bold text-navy-600">
          Analyze Document
        </h1>
        <p className="mb-6 font-body text-sm text-gray-500">
          Upload a legal document to extract text and get AI-powered analysis with key issues, relevant statutes, and risk assessment.
        </p>

        <DocumentUploader onUpload={handleUpload} isUploading={isAnalyzing} />

        {analysisError && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {analysisError}
          </div>
        )}
      </div>
    );
  }

  if (pageView === "analysis" && (analysisResult || isAnalyzing)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button
          onClick={() => {
            setPageView("library");
            setAnalysisResult(null);
          }}
          className="mb-6 flex items-center gap-1.5 font-heading text-sm font-medium text-gray-500 transition-colors hover:text-navy-600"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Documents
        </button>

        {isAnalyzing ? (
          <div className="space-y-4">
            {/* Skeleton for analysis result */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
            {["Summary", "Key Issues", "Statutes", "Risks", "Next Steps"].map((s) => (
              <div key={s} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-4/6 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : analysisResult ? (
          <AnalysisResult
            analysis={analysisResult.analysis}
            documentTitle={analysisResult.document.title}
            onAskFollowUp={handleAskFollowUp}
            onDraftResponse={handleDraftResponse}
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
          />
        ) : null}
      </div>
    );
  }

  // ─── Library View ─────────────────────────────────────────────────

  const filteredDocs = documents;
  const uniqueTypes = [...new Set(documents.map((d) => d.document_type))];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-navy-600">
            {t("nav.documents")}
          </h1>
          <p className="font-body text-sm text-gray-500">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setPageView("upload")}
          className="flex items-center gap-2 rounded-lg bg-navy-600 px-4 py-2.5 font-heading text-sm font-medium text-white transition-colors hover:bg-navy-700"
        >
          <Upload className="h-4 w-4" />
          Analyze Document
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 font-body text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 font-heading text-sm font-medium transition-colors ${
            typeFilter
              ? "border-accent bg-accent/5 text-accent"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Filter className="h-4 w-4" />
          {typeFilter ? DOC_TYPE_LABELS[typeFilter] || typeFilter : "Filter"}
        </button>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-l-lg p-2 transition-colors ${
              viewMode === "grid" ? "bg-navy-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-r-lg p-2 transition-colors ${
              viewMode === "list" ? "bg-navy-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !typeFilter ? "bg-navy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {uniqueTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type === typeFilter ? "" : type)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === type
                  ? "bg-navy-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {DOC_TYPE_LABELS[type] || type}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <DocumentsSkeleton viewMode={viewMode} />
      ) : filteredDocs.length === 0 ? (
        <EmptyState onUpload={() => setPageView("upload")} />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDownload={() => handleDownload(doc)}
              onDelete={() => handleDelete(doc.id)}
              onViewAnalysis={() => handleViewAnalysis(doc)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              onDownload={() => handleDownload(doc)}
              onDelete={() => handleDelete(doc.id)}
              onViewAnalysis={() => handleViewAnalysis(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function DocumentCard({
  document: doc,
  onDownload,
  onDelete,
  onViewAnalysis,
}: {
  document: LegalDocument;
  onDownload: () => void;
  onDelete: () => void;
  onViewAnalysis: () => void;
}) {
  const isUploaded = doc.generation_method === "manual";
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <FileText className="h-5 w-5 text-accent" />
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
        </span>
      </div>

      <h3 className="mb-1 font-heading text-sm font-semibold text-navy-600 line-clamp-2">
        {doc.title}
      </h3>

      <p className="mb-3 text-xs text-gray-400">
        {new Date(doc.created_at).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
        {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
      </p>

      {doc.ai_summary && (
        <p className="mb-3 font-body text-xs text-gray-500 line-clamp-2">
          {doc.ai_summary}
        </p>
      )}

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isUploaded && (
          <button
            onClick={onViewAnalysis}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-accent"
            title="View Analysis"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDownload}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-accent"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DocumentRow({
  document: doc,
  onDownload,
  onDelete,
  onViewAnalysis,
}: {
  document: LegalDocument;
  onDownload: () => void;
  onDelete: () => void;
  onViewAnalysis: () => void;
}) {
  const isUploaded = doc.generation_method === "manual";
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
        <FileText className="h-4 w-4 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-heading text-sm font-semibold text-navy-600 truncate">
          {doc.title}
        </h3>
        <p className="text-xs text-gray-400">
          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
          {" · "}
          {new Date(doc.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isUploaded && (
          <button
            onClick={onViewAnalysis}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-accent"
            title="View Analysis"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDownload}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-accent"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16">
      <FolderOpen className="mb-4 h-12 w-12 text-gray-300" />
      <h3 className="mb-1 font-heading text-sm font-semibold text-navy-600">
        No documents yet
      </h3>
      <p className="mb-4 text-xs text-gray-500">
        Upload a document to get started with AI analysis
      </p>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 rounded-lg bg-navy-600 px-4 py-2.5 font-heading text-sm font-medium text-white transition-colors hover:bg-navy-700"
      >
        <Upload className="h-4 w-4" />
        Upload Document
      </button>
    </div>
  );
}

function DocumentsSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
            <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="mb-3 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
