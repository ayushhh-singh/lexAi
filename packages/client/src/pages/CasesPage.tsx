import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Briefcase,
  Calendar,

  FileText,
  MessageSquare,
  AlertCircle,
  Loader2,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { api } from "../lib/api-client";
import { PRACTICE_AREAS, COURT_LEVELS } from "@nyay/shared";
import type { CaseWithStats, CaseStatus } from "@nyay/shared";

// ─── Constants ────────────────────────────────────────────────────

type ViewMode = "table" | "kanban";

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

const KANBAN_COLUMNS: { id: string; label: string; statuses: CaseStatus[] }[] = [
  { id: "active", label: "Active", statuses: ["filed", "in_progress", "hearing_scheduled"] },
  { id: "pending", label: "Pending", statuses: ["draft", "judgement_reserved"] },
  { id: "hold", label: "On Hold", statuses: ["appealed"] },
  { id: "closed", label: "Closed", statuses: ["disposed", "closed"] },
];

// ─── Main page ───────────────────────────────────────────────────

export function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [practiceAreaFilter, setPracticeAreaFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (practiceAreaFilter) params.practice_area = practiceAreaFilter;
      const res = await api.cases.list(params);
      setCases((res.data ?? []) as CaseWithStats[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, practiceAreaFilter]);

  useEffect(() => { loadCases(); }, [loadCases]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Cases</h1>
          <p className="mt-1 font-heading text-sm text-gray-500">
            Manage your case matters and track progress.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800"
        >
          <Plus className="h-4 w-4" />
          New Case
        </button>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 py-2.5 px-3 font-heading text-sm text-gray-700 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <select
          value={practiceAreaFilter}
          onChange={(e) => setPracticeAreaFilter(e.target.value)}
          className="rounded-lg border border-gray-300 py-2.5 px-3 font-heading text-sm text-gray-700 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          <option value="">All Practice Areas</option>
          {PRACTICE_AREAS.map((pa) => (
            <option key={pa.id} value={pa.id}>{pa.label}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setView("table")}
            className={`rounded-md p-2 transition-all duration-150 ${view === "table" ? "bg-white text-navy-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`rounded-md p-2 transition-all duration-150 ${view === "kanban" ? "bg-white text-navy-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            title="Kanban view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-error" />
          <p className="font-heading text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
              <div className="mb-1 h-3 w-1/2 rounded bg-gray-100" />
              <div className="h-3 w-1/4 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {cases.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-heading text-sm font-medium text-gray-500">
                {search || statusFilter || practiceAreaFilter ? "No cases match your filters." : "No cases yet."}
              </p>
              <p className="mt-1 font-heading text-xs text-gray-400">
                Create your first case to organize your legal work.
              </p>
              {!search && !statusFilter && !practiceAreaFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800"
                >
                  <Plus className="h-4 w-4" />
                  Create Case
                </button>
              )}
            </div>
          ) : view === "table" ? (
            <TableView cases={cases} />
          ) : (
            <KanbanView cases={cases} />
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            navigate(`/cases/${id}`);
          }}
        />
      )}
    </div>
  );
}

// ─── Table View ──────────────────────────────────────────────────

function TableView({ cases }: { cases: CaseWithStats[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wide text-gray-500">Case</th>
              <th className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wide text-gray-500">Court</th>
              <th className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wide text-gray-500">Next Hearing</th>
              <th className="px-5 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wide text-gray-500">Docs</th>
              <th className="px-5 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wide text-gray-500">Deadlines</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases.map((c) => (
              <tr key={c.id} className="transition-colors duration-150 hover:bg-gray-50">
                <td className="px-5 py-4">
                  <Link to={`/cases/${c.id}`} className="block">
                    <p className="font-heading text-sm font-semibold text-gray-900 hover:text-accent">
                      {c.title}
                    </p>
                    <p className="mt-0.5 font-heading text-xs text-gray-500">
                      {c.case_number ?? c.practice_area}
                    </p>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <p className="font-heading text-sm text-gray-700">
                    {c.court_name ?? COURT_LEVELS.find((cl) => cl.id === c.court_level)?.label ?? c.court_level}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 font-heading text-[11px] font-medium ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {c.next_hearing_date ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-heading text-sm text-gray-700">
                        {new Date(c.next_hearing_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ) : (
                    <span className="font-heading text-xs text-gray-400">Not set</span>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-heading text-sm text-gray-700">{c.stats.total_documents}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {c.stats.overdue_deadlines > 0 ? (
                      <span className="font-heading text-sm font-medium text-error">{c.stats.overdue_deadlines} overdue</span>
                    ) : c.stats.upcoming_deadlines > 0 ? (
                      <>
                        <Clock className="h-3.5 w-3.5 text-warning" />
                        <span className="font-heading text-sm text-gray-700">{c.stats.upcoming_deadlines}</span>
                      </>
                    ) : (
                      <span className="font-heading text-xs text-gray-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Link
                    to={`/cases/${c.id}`}
                    className="rounded-md p-1 text-gray-400 transition-colors duration-150 hover:text-accent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Kanban View ─────────────────────────────────────────────────

function KanbanView({ cases }: { cases: CaseWithStats[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KANBAN_COLUMNS.map((col) => {
        const columnCases = cases.filter((c) => col.statuses.includes(c.status));
        return (
          <div key={col.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="font-heading text-sm font-semibold text-gray-700">{col.label}</h3>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 font-heading text-[11px] font-medium text-gray-600">
                {columnCases.length}
              </span>
            </div>
            <div className="space-y-2">
              {columnCases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center">
                  <p className="font-heading text-xs text-gray-400">No cases</p>
                </div>
              ) : (
                columnCases.map((c) => <KanbanCard key={c.id} caseMatter={c} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ caseMatter: c }: { caseMatter: CaseWithStats }) {
  const practiceArea = PRACTICE_AREAS.find((pa) => pa.id === c.practice_area);

  return (
    <Link
      to={`/cases/${c.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-heading text-sm font-semibold text-gray-900 line-clamp-2">{c.title}</h4>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-heading text-[10px] font-medium ${STATUS_COLORS[c.status]}`}>
          {STATUS_LABELS[c.status] ?? c.status}
        </span>
      </div>

      {c.case_number && (
        <p className="mb-2 font-mono text-xs text-gray-500">{c.case_number}</p>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {practiceArea && (
          <span className="rounded bg-accent/10 px-2 py-0.5 font-heading text-[10px] font-medium text-accent">
            {practiceArea.label}
          </span>
        )}
        <span className="rounded bg-gray-100 px-2 py-0.5 font-heading text-[10px] text-gray-500">
          {c.court_name ?? c.court_level}
        </span>
      </div>

      {c.next_hearing_date && (
        <div className="mb-2 flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="font-heading text-[11px] text-gray-500">
            {new Date(c.next_hearing_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-gray-100 pt-2">
        <div className="flex items-center gap-1" title="Documents">
          <FileText className="h-3 w-3 text-gray-400" />
          <span className="font-heading text-[11px] text-gray-500">{c.stats.total_documents}</span>
        </div>
        <div className="flex items-center gap-1" title="Conversations">
          <MessageSquare className="h-3 w-3 text-gray-400" />
          <span className="font-heading text-[11px] text-gray-500">{c.stats.total_conversations}</span>
        </div>
        {c.stats.overdue_deadlines > 0 && (
          <div className="flex items-center gap-1 ml-auto" title="Overdue deadlines">
            <AlertCircle className="h-3 w-3 text-error" />
            <span className="font-heading text-[11px] font-medium text-error">{c.stats.overdue_deadlines}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Create Case Modal ──────────────────────────────────────────

function CreateCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    case_type: "",
    court_level: "",
    court_name: "",
    practice_area: "",
    filing_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.cases.create({
        title: form.title,
        description: form.description || undefined,
        case_type: form.case_type,
        court_level: form.court_level,
        court_name: form.court_name || undefined,
        practice_area: form.practice_area,
        filing_date: form.filing_date || undefined,
      });
      if (res.data) onCreated(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setSaving(false);
    }
  };

  const CASE_TYPES = ["Civil Suit", "Criminal Case", "Writ Petition", "Appeal", "Revision", "Arbitration", "Mediation", "Family Matter", "Consumer Complaint", "Labour Dispute", "Tax Appeal", "Other"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-gray-900">New Case</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              minLength={5}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g., Sharma vs State of Maharashtra"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Description *</label>
            <textarea
              required
              minLength={20}
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief description of the case matter..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Case Type *</label>
              <select
                required
                value={form.case_type}
                onChange={(e) => updateField("case_type", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm text-gray-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">Select...</option>
                {CASE_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Practice Area *</label>
              <select
                required
                value={form.practice_area}
                onChange={(e) => updateField("practice_area", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm text-gray-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">Select...</option>
                {PRACTICE_AREAS.map((pa) => <option key={pa.id} value={pa.id}>{pa.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Court Level *</label>
              <select
                required
                value={form.court_level}
                onChange={(e) => updateField("court_level", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm text-gray-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">Select...</option>
                {COURT_LEVELS.map((cl) => <option key={cl.id} value={cl.id}>{cl.label}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-heading text-xs font-medium text-gray-700">Filing Date</label>
              <input
                type="date"
                value={form.filing_date}
                onChange={(e) => updateField("filing_date", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm text-gray-900 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-error" />
              <p className="font-heading text-xs text-error">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2.5 font-heading text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-navy-900 px-6 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
