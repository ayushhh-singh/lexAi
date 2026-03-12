import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  RefreshCw,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { api } from "../lib/api-client";
import type { LegalDocument, Citation, CaseWithStats } from "@nyay/shared";
import { FeedbackWidget } from "../components/billing/FeedbackWidget";

interface GeneratedDocument {
  id: string;
  title: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  tokens_used: number;
}

// Map document_type back to template id for regeneration
const DOC_TYPE_TO_TEMPLATE: Record<string, string> = {
  legal_notice: "legal-notice",
  bail_application: "bail-application",
  writ_petition: "writ-petition",
  contract_nda: "contract-nda",
  affidavit: "affidavit",
};

// Skeleton for loading state
function ResultSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="h-8 w-64 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="h-96 rounded-xl bg-gray-100" />
        </div>
        <div className="space-y-4">
          <div className="h-40 rounded-xl bg-gray-100" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Case Selection Modal ──────────────────────────────────────────
function CaseSelectModal({
  onSelect,
  onClose,
}: {
  onSelect: (caseId: string) => void;
  onClose: () => void;
}) {
  const [cases, setCases] = useState<CaseWithStats[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.cases
      .list({ limit: 50 })
      .then((res) => {
        if (res.data) setCases(Array.isArray(res.data) ? res.data : []);
      })
      .finally(() => setLoadingCases(false));
  }, []);

  const filtered = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.case_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-heading text-sm font-semibold text-gray-900">
            Save to Case
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 font-heading text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="max-h-64 overflow-y-auto px-5 py-3">
          {loadingCases ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center font-heading text-xs text-gray-400">
              {cases.length === 0 ? "No cases found. Create a case first." : "No matching cases."}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-gray-50"
                >
                  <Briefcase className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-medium text-gray-800">
                      {c.title}
                    </p>
                    {c.case_number && (
                      <p className="font-heading text-[11px] text-gray-400">
                        {c.case_number}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 font-heading text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function DraftResultPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const stateDoc = (location.state as { document?: GeneratedDocument })?.document;
  const stateTemplate = (location.state as { template?: string })?.template;

  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(!stateDoc);
  const [citationsExpanded, setCitationsExpanded] = useState(true);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [savingToCase, setSavingToCase] = useState(false);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Mock citations — in production these come from the generation response
  const [citations] = useState<Citation[]>([
    {
      text: "State of Rajasthan v. Balchand, (1977) 4 SCC 308",
      source: "Supreme Court of India",
      source_type: "judgement",
      verified: true,
    },
    {
      text: "Section 483, Bharatiya Nagarik Suraksha Sanhita, 2023",
      source: "BNSS 2023",
      source_type: "act",
      verified: true,
    },
    {
      text: "Sanjay Chandra v. CBI, (2012) 1 SCC 40",
      source: "Supreme Court of India",
      source_type: "judgement",
      verified: true,
    },
    {
      text: "P. Chidambaram v. Directorate of Enforcement, (2019) 9 SCC 24",
      source: "Supreme Court of India",
      source_type: "judgement",
      verified: false,
    },
  ]);

  useEffect(() => {
    if (stateDoc) {
      setDocument({
        id: stateDoc.id,
        user_id: "",
        case_matter_id: null,
        title: stateDoc.title,
        document_type: "",
        content: null,
        file_url: stateDoc.file_url,
        file_id: null,
        file_size: stateDoc.file_size,
        mime_type: stateDoc.mime_type,
        generation_method: "ai_skill",
        ai_summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return;
    }

    if (!documentId) return;

    api.documents
      .get(documentId)
      .then((res) => {
        if (res.data) setDocument(res.data);
      })
      .finally(() => setLoading(false));
  }, [documentId, stateDoc]);

  // Build a blob URL for previewing the document (works for both PDF and DOCX via download)
  useEffect(() => {
    if (!document) return;

    // For PDFs, try direct URL first; for DOCX we need to download and create blob
    const isPdf = document.mime_type?.includes("pdf");

    if (isPdf && document.file_url) {
      // Use the download endpoint to get the file as a blob for preview (avoids CORS issues with Supabase)
      api.documents
        .download(document.id)
        .then((buffer) => {
          const blob = new Blob([buffer], { type: "application/pdf" });
          setPreviewUrl(URL.createObjectURL(blob));
        })
        .catch(() => {
          // Fall back to direct URL
          setPreviewUrl(document.file_url);
        });
    }

    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id]);

  const templateId = stateTemplate || (document?.document_type ? DOC_TYPE_TO_TEMPLATE[document.document_type] : undefined);

  const handleDownload = useCallback(async () => {
    if (!document) return;
    try {
      const response = await api.documents.download(document.id);
      const isPdf = document.mime_type?.includes("pdf");
      const blob = new Blob([response], {
        type: document.mime_type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.title}.${isPdf ? "pdf" : "docx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      if (document.file_url) {
        window.open(document.file_url, "_blank", "noopener,noreferrer");
      }
    }
  }, [document]);

  const handleSaveToCase = useCallback(
    async (caseId: string) => {
      if (!document) return;
      setSavingToCase(true);
      try {
        await api.documents.update(document.id, { case_matter_id: caseId });
        setSavedCaseId(caseId);
        setDocument((prev) => (prev ? { ...prev, case_matter_id: caseId } : prev));
        setShowCaseModal(false);
      } catch (err) {
        console.error("Failed to save to case:", err);
      } finally {
        setSavingToCase(false);
      }
    },
    [document]
  );

  if (loading) return <ResultSkeleton />;

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <FileText className="h-12 w-12 text-gray-300" />
        <p className="font-heading text-sm text-gray-500">Document not found.</p>
        <Link
          to="/drafts"
          className="font-heading text-sm font-medium text-accent hover:text-accent-dark"
        >
          Back to templates
        </Link>
      </div>
    );
  }

  const isPdf = document.mime_type?.includes("pdf");
  const fileSize = document.file_size
    ? `${(document.file_size / 1024).toFixed(1)} KB`
    : "—";

  const verifiedCount = citations.filter((c) => c.verified).length;
  const unverifiedCount = citations.filter((c) => !c.verified).length;
  const isLinkedToCase = !!document.case_matter_id || !!savedCaseId;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
      {/* Back link */}
      <Link
        to="/drafts"
        className="inline-flex items-center gap-1.5 font-heading text-sm text-gray-500 transition-colors duration-150 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All templates
      </Link>

      {/* Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">
            {document.title}
          </h1>
          <p className="mt-1 font-heading text-xs text-gray-500">
            Generated on{" "}
            {new Date(document.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Document Preview (left 2/3) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Preview header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-heading text-sm font-medium text-gray-700">
                  Document Preview
                </span>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-heading text-[11px] font-medium text-gray-500">
                {isPdf ? "PDF" : "DOCX"} &middot; {fileSize}
              </span>
            </div>

            {/* Preview body */}
            <div className="p-6">
              {isPdf && previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="h-[600px] w-full rounded-lg border border-gray-100"
                  title="Document preview"
                />
              ) : isPdf ? (
                <div className="flex h-[500px] flex-col items-center justify-center rounded-lg bg-gray-50">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-gray-300" />
                  <p className="font-heading text-sm text-gray-500">Loading preview...</p>
                </div>
              ) : (
                <div className="flex h-[500px] flex-col items-center justify-center gap-4 rounded-lg bg-gray-50">
                  <FileText className="h-16 w-16 text-gray-300" />
                  <div className="text-center">
                    <p className="font-heading text-sm text-gray-500">
                      DOCX preview not available in browser
                    </p>
                    <p className="mt-1 font-heading text-xs text-gray-400">
                      Download the file to view in Microsoft Word or Google Docs
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 font-heading text-sm font-medium text-white hover:bg-navy-800"
                  >
                    <Download className="h-4 w-4" />
                    Download DOCX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Actions card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-heading text-sm font-semibold text-gray-900">
              Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                className="flex w-full items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800"
              >
                <Download className="h-4 w-4" />
                Download {isPdf ? "PDF" : "DOCX"}
              </button>

              {templateId && (
                <button
                  onClick={() => navigate(`/drafts/${templateId}`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 font-heading text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </button>
              )}

              <button
                onClick={() => {
                  if (isLinkedToCase) {
                    navigate(`/cases/${document.case_matter_id || savedCaseId}`);
                  } else {
                    setShowCaseModal(true);
                  }
                }}
                disabled={savingToCase}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 font-heading text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:opacity-50"
              >
                {savingToCase ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLinkedToCase ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Briefcase className="h-4 w-4" />
                )}
                {isLinkedToCase ? "View Case" : "Save to Case"}
              </button>
            </div>
          </div>

          {/* Feedback */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-heading text-sm font-semibold text-gray-900">
              Feedback
            </h3>
            <FeedbackWidget
              feature="document_generation"
              responseId={document.id}
              metadata={{ template: templateId }}
            />
          </div>

          {/* Citations panel */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              onClick={() => setCitationsExpanded(!citationsExpanded)}
              className="flex w-full items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-sm font-semibold text-gray-900">
                  Citations
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-heading text-[11px] font-medium text-gray-500">
                  {citations.length}
                </span>
              </div>
              {citationsExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {citationsExpanded && (
              <div className="border-t border-gray-100 px-5 pb-4 pt-3">
                {/* Summary */}
                <div className="mb-3 flex gap-3">
                  <span className="inline-flex items-center gap-1 font-heading text-xs text-success-dark">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {verifiedCount} verified
                  </span>
                  {unverifiedCount > 0 && (
                    <span className="inline-flex items-center gap-1 font-heading text-xs text-warning-dark">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {unverifiedCount} unverified
                    </span>
                  )}
                </div>

                {/* Citation list */}
                <div className="space-y-2">
                  {citations.map((citation, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-gray-50 p-3"
                    >
                      {citation.verified ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      )}
                      <div className="flex-1">
                        <p className="font-mono text-xs leading-relaxed text-gray-800">
                          {citation.text}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-heading text-[10px] text-gray-400">
                            {citation.source}
                          </span>
                          <span className="rounded bg-gray-200 px-1.5 py-0.5 font-heading text-[9px] font-medium uppercase text-gray-500">
                            {citation.source_type}
                          </span>
                        </div>
                      </div>
                      <button className="shrink-0 text-gray-400 hover:text-accent">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Case Selection Modal */}
      {showCaseModal && (
        <CaseSelectModal
          onSelect={handleSaveToCase}
          onClose={() => setShowCaseModal(false)}
        />
      )}
    </div>
  );
}
