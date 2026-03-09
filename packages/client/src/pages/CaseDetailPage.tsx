import { useState, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  MessageSquare,
  Clock,
  StickyNote,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Download,
  FileDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { LimitationCalculator } from "../components/cases/LimitationCalculator";
import { api } from "../lib/api-client";
import { PRACTICE_AREAS, COURT_LEVELS } from "@nyay/shared";
import type {
  CaseWithStats,
  CaseDeadline,
  CaseNote,
  LegalDocument,
} from "@nyay/shared";

// ─── Constants ────────────────────────────────────────────────────

type Tab = "overview" | "documents" | "research" | "deadlines" | "notes";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: Briefcase },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "research", label: "Research", icon: MessageSquare },
  { id: "deadlines", label: "Deadlines", icon: Clock },
  { id: "notes", label: "Notes", icon: StickyNote },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  filed: "Filed",
  in_progress: "Active",
  hearing_scheduled: "Hearing Scheduled",
  judgement_reserved: "Judgement Reserved",
  disposed: "Disposed",
  appealed: "Appealed",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  filed: "bg-accent/10 text-accent",
  in_progress: "bg-success/10 text-success-dark",
  hearing_scheduled: "bg-warning/10 text-warning-dark",
  judgement_reserved: "bg-navy-100 text-navy-600",
  disposed: "bg-gray-200 text-gray-600",
  appealed: "bg-error/10 text-error",
  closed: "bg-gray-300 text-gray-700",
};

// ─── Main page ───────────────────────────────────────────────────

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseMatter, setCaseMatter] = useState<CaseWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const loadCase = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.cases.get(id);
      setCaseMatter((res.data ?? null) as CaseWithStats | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCase(); }, [loadCase]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
          <div className="mb-2 h-4 w-1/2 rounded bg-gray-100" />
          <div className="h-4 w-1/4 rounded bg-gray-100" />
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
      </div>
    );
  }

  if (error || !caseMatter) {
    return (
      <div className="p-4 lg:p-6">
        <div className="rounded-xl border border-error/20 bg-error/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-error" />
          <p className="font-heading text-sm text-error">{error ?? "Case not found"}</p>
          <Link to="/cases" className="mt-4 inline-flex items-center gap-1.5 font-heading text-sm font-medium text-accent hover:text-accent-dark">
            <ArrowLeft className="h-4 w-4" /> Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  const practiceArea = PRACTICE_AREAS.find((pa) => pa.id === caseMatter.practice_area);
  const courtLevel = COURT_LEVELS.find((cl) => cl.id === caseMatter.court_level);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Back link + header */}
      <div>
        <Link to="/cases" className="mb-3 inline-flex items-center gap-1.5 font-heading text-xs font-medium text-gray-500 hover:text-accent">
          <ArrowLeft className="h-3.5 w-3.5" /> All Cases
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">{caseMatter.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              {caseMatter.case_number && (
                <span className="font-mono text-xs text-gray-500">{caseMatter.case_number}</span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 font-heading text-[11px] font-medium ${STATUS_COLORS[caseMatter.status]}`}>
                {STATUS_LABELS[caseMatter.status] ?? caseMatter.status}
              </span>
              {practiceArea && (
                <span className="rounded bg-accent/10 px-2 py-0.5 font-heading text-[10px] font-medium text-accent">
                  {practiceArea.label}
                </span>
              )}
              <span className="font-heading text-xs text-gray-400">
                {courtLevel?.label ?? caseMatter.court_level}
                {caseMatter.court_name ? ` — ${caseMatter.court_name}` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-heading text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab caseMatter={caseMatter} onUpdated={loadCase} />}
      {activeTab === "documents" && <DocumentsTab caseId={caseMatter.id} caseMatter={caseMatter} />}
      {activeTab === "research" && <ResearchTab caseId={caseMatter.id} caseMatter={caseMatter} />}
      {activeTab === "deadlines" && <DeadlinesTab caseId={caseMatter.id} caseMatter={caseMatter} />}
      {activeTab === "notes" && <NotesTab caseId={caseMatter.id} />}
    </div>
  );
}

// ─── Tab 1: Overview ────────────────────────────────────────────

function OverviewTab({ caseMatter }: { caseMatter: CaseWithStats; onUpdated: () => void }) {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportDoc, setReportDoc] = useState<{ id: string; title: string; file_url: string } | null>(null);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportError(null);
    setReportProgress("Preparing...");
    setReportDoc(null);

    try {
      const response = await api.cases.generateSummarySSE(caseMatter.id);
      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setReportProgress(event.message);
            } else if (event.type === "done") {
              setReportDoc(event.document);
              setReportProgress("");
            } else if (event.type === "error") {
              setReportError(event.message);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Documents", value: caseMatter.stats.total_documents, icon: FileText },
          { label: "Conversations", value: caseMatter.stats.total_conversations, icon: MessageSquare },
          { label: "Upcoming Deadlines", value: caseMatter.stats.upcoming_deadlines, icon: Clock },
          { label: "Overdue", value: caseMatter.stats.overdue_deadlines, icon: AlertTriangle, danger: caseMatter.stats.overdue_deadlines > 0 },
        ].map(({ label, value, icon: Icon, danger }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-heading text-xs font-medium text-gray-500">{label}</p>
              <Icon className={`h-4 w-4 ${danger ? "text-error" : "text-gray-400"}`} />
            </div>
            <p className={`mt-1 font-heading text-2xl font-bold ${danger ? "text-error" : "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Case details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-base font-semibold text-gray-900">Case Details</h3>
          <dl className="space-y-3">
            {[
              { label: "Case Type", value: caseMatter.case_type },
              { label: "Filing Date", value: caseMatter.filing_date ? new Date(caseMatter.filing_date).toLocaleDateString("en-IN") : "Not filed" },
              { label: "Next Hearing", value: caseMatter.next_hearing_date ? new Date(caseMatter.next_hearing_date).toLocaleDateString("en-IN") : "Not scheduled" },
              { label: "Opposing Party", value: caseMatter.opposing_party ?? "Not specified" },
              { label: "Opposing Counsel", value: caseMatter.opposing_counsel ?? "Not specified" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="font-heading text-sm text-gray-500">{label}</dt>
                <dd className="font-heading text-sm font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-base font-semibold text-gray-900">Description</h3>
          <p className="font-body text-sm leading-relaxed text-gray-700">
            {caseMatter.description ?? "No description provided."}
          </p>
        </div>
      </div>

      {/* Summary Report */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold text-gray-900">Case Summary Report</h3>
            <p className="mt-0.5 font-heading text-xs text-gray-500">
              Generate a comprehensive PDF report with AI analysis. Costs 15 credits.
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800 disabled:opacity-50"
          >
            {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Generate Report
          </button>
        </div>

        {generatingReport && reportProgress && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/5 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="font-heading text-sm text-accent">{reportProgress}</p>
          </div>
        )}

        {reportError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-error" />
            <p className="font-heading text-sm text-error">{reportError}</p>
          </div>
        )}

        {reportDoc && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="font-heading text-sm text-success-dark">Report generated: {reportDoc.title}</p>
            </div>
            <a
              href={reportDoc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 font-heading text-xs font-medium text-success-dark transition-colors duration-150 hover:bg-success/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Documents ───────────────────────────────────────────

function DocumentsTab({ caseId, caseMatter }: { caseId: string; caseMatter: CaseWithStats }) {
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.documents.list({ case_id: caseId });
        setDocs((res.data ?? []) as LegalDocument[]);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-gray-700">
          Linked Documents ({docs.length})
        </h3>
        <Link
          to={`/drafts?case_id=${caseId}&case_title=${encodeURIComponent(caseMatter.title)}`}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 font-heading text-xs font-medium text-white transition-colors duration-150 hover:bg-navy-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Draft New
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="font-heading text-sm text-gray-500">No documents linked to this case yet.</p>
          <Link
            to={`/drafts?case_id=${caseId}&case_title=${encodeURIComponent(caseMatter.title)}`}
            className="mt-3 inline-flex items-center gap-1.5 font-heading text-xs font-medium text-accent hover:text-accent-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Draft a document
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <FileText className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-heading text-sm font-medium text-gray-900">{doc.title}</p>
                  <p className="font-heading text-xs text-gray-500">
                    {doc.document_type} &middot; {new Date(doc.created_at).toLocaleDateString("en-IN")}
                    {doc.file_size ? ` &middot; ${(doc.file_size / 1024).toFixed(0)}KB` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const data = await api.documents.download(doc.id);
                  const blob = new Blob([data], { type: doc.mime_type ?? "application/octet-stream" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = doc.title;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-gray-200 p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-50 hover:text-accent"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Research (scoped chat) ──────────────────────────────

function ResearchTab({ caseId, caseMatter }: { caseId: string; caseMatter: CaseWithStats }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Array<{ id: string; title: string | null; practice_area: string | null; updated_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.chat.listConversations();
        // Filter to case-scoped conversations (matching case_matter_id)
        const all = (res.data ?? []) as Array<{ id: string; title: string | null; practice_area: string | null; updated_at: string; case_matter_id: string | null }>;
        setConversations(all.filter((c) => c.case_matter_id === caseId));
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId]);

  const handleNewConversation = async () => {
    try {
      const res = await api.chat.createConversation({
        title: `Research — ${caseMatter.title}`,
        practice_area: caseMatter.practice_area,
        case_matter_id: caseId,
      });
      if (res.data) navigate(`/chat/${res.data.id}`);
    } catch {
      // Navigate to chat page as fallback
      navigate("/chat");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-gray-700">
          Research Conversations ({conversations.length})
        </h3>
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 font-heading text-xs font-medium text-white transition-colors duration-150 hover:bg-navy-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New Research Chat
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="font-heading text-sm text-gray-500">No research conversations for this case yet.</p>
          <button
            onClick={handleNewConversation}
            className="mt-3 inline-flex items-center gap-1.5 font-heading text-xs font-medium text-accent hover:text-accent-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Start a research chat
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/chat/${conv.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-100">
                  <MessageSquare className="h-4 w-4 text-navy-600" />
                </div>
                <div>
                  <p className="font-heading text-sm font-medium text-gray-900">{conv.title ?? "Untitled"}</p>
                  <p className="font-heading text-xs text-gray-500">
                    {conv.practice_area ?? "General"} &middot; {new Date(conv.updated_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Deadlines ───────────────────────────────────────────

function DeadlinesTab({ caseId, caseMatter }: { caseId: string; caseMatter: CaseWithStats }) {
  const [deadlines, setDeadlines] = useState<CaseDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDeadline, setNewDeadline] = useState({ title: "", description: "", deadline_date: "", deadline_type: "filing" });
  const [saving, setSaving] = useState(false);

  const loadDeadlines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.cases.getDeadlines(caseId);
      setDeadlines((res.data ?? []) as CaseDeadline[]);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadDeadlines(); }, [loadDeadlines]);

  const handleCreate = async () => {
    if (!newDeadline.title || !newDeadline.deadline_date || !newDeadline.deadline_type) return;
    setSaving(true);
    try {
      await api.cases.createDeadline(caseId, {
        title: newDeadline.title,
        description: newDeadline.description || undefined,
        deadline_date: newDeadline.deadline_date,
        deadline_type: newDeadline.deadline_type,
      });
      setNewDeadline({ title: "", description: "", deadline_date: "", deadline_type: "filing" });
      setShowForm(false);
      loadDeadlines();
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  const handleAddLimitationDeadline = async (data: { title: string; deadline_date: string; deadline_type: string; description: string }) => {
    await api.cases.createDeadline(caseId, {
      title: data.title,
      description: data.description || undefined,
      deadline_date: data.deadline_date,
      deadline_type: data.deadline_type,
    });
    loadDeadlines();
  };

  const handleToggle = async (deadlineId: string) => {
    try {
      await api.cases.toggleDeadline(deadlineId);
      loadDeadlines();
    } catch {
      // Silently fail
    }
  };

  const now = new Date();
  const DEADLINE_TYPES = ["hearing", "filing", "limitation", "compliance", "other"];

  return (
    <div className="space-y-6">
      {/* Deadline list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-gray-700">
            Deadlines ({deadlines.length})
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 font-heading text-xs font-medium text-white transition-colors duration-150 hover:bg-navy-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Deadline
          </button>
        </div>

        {/* Add deadline form */}
        {showForm && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  value={newDeadline.title}
                  onChange={(e) => setNewDeadline((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Filing reply to written statement"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  value={newDeadline.deadline_date}
                  onChange={(e) => setNewDeadline((p) => ({ ...p, deadline_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Type *</label>
                <select
                  value={newDeadline.deadline_type}
                  onChange={(e) => setNewDeadline((p) => ({ ...p, deadline_type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  {DEADLINE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={newDeadline.description}
                  onChange={(e) => setNewDeadline((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional details..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 font-heading text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newDeadline.title || !newDeadline.deadline_date}
                className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 font-heading text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : deadlines.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="font-heading text-sm text-gray-500">No deadlines set for this case.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deadlines.map((dl) => {
              const date = new Date(dl.deadline_date);
              const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = !dl.is_completed && daysLeft < 0;
              const isUrgent = !dl.is_completed && daysLeft >= 0 && daysLeft <= 3;

              return (
                <div
                  key={dl.id}
                  className={`flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md ${
                    isOverdue ? "border-error/30" : isUrgent ? "border-warning/30" : "border-gray-200"
                  }`}
                >
                  <button
                    onClick={() => handleToggle(dl.id)}
                    className="shrink-0"
                  >
                    {dl.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 hover:text-accent" />
                    )}
                  </button>

                  <div className="flex-1">
                    <p className={`font-heading text-sm font-medium ${dl.is_completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {dl.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3">
                      <span className="font-heading text-xs text-gray-500">
                        {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-heading text-[10px] font-medium text-gray-500">
                        {dl.deadline_type}
                      </span>
                    </div>
                  </div>

                  {!dl.is_completed && (
                    <div className="text-right">
                      {isOverdue ? (
                        <span className="font-heading text-xs font-semibold text-error">
                          {Math.abs(daysLeft)}d overdue
                        </span>
                      ) : (
                        <span className={`font-heading text-xs font-medium ${isUrgent ? "text-warning-dark" : "text-gray-500"}`}>
                          {daysLeft}d left
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Limitation Calculator */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <LimitationCalculator
          caseId={caseId}
          caseType={caseMatter.case_type}
          caseDescription={caseMatter.description ?? undefined}
          onAddDeadline={handleAddLimitationDeadline}
        />
      </div>
    </div>
  );
}

// ─── Tab 5: Notes ───────────────────────────────────────────────

function NotesTab({ caseId }: { caseId: string }) {
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.cases.getNotes(caseId);
      setNotes((res.data ?? []) as CaseNote[]);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleCreate = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await api.cases.createNote(caseId, newNote.trim());
      setNewNote("");
      loadNotes();
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await api.cases.deleteNote(noteId);
      loadNotes();
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <textarea
          rows={3}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this case..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-body text-sm leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={saving || !newNote.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 font-heading text-xs font-medium text-white transition-colors duration-150 hover:bg-navy-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 h-4 w-full rounded bg-gray-200" />
              <div className="h-3 w-1/3 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <StickyNote className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="font-heading text-sm text-gray-500">No notes yet. Add your first note above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <p className="font-body text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {note.content}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-heading text-xs text-gray-400">
                  {new Date(note.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all duration-150 hover:bg-error/10 hover:text-error group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
