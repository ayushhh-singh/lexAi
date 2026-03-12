import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  MailWarning,
  ShieldCheck,
  Landmark,
  FileLock2,
  Stamp,
  ArrowRight,
  FileText,
  X,
} from "lucide-react";
import { TEMPLATES, getTemplatesByPracticeArea } from "../lib/templates";
import type { TemplateDefinition } from "../lib/templates";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "mail-warning": MailWarning,
  "shield-check": ShieldCheck,
  "landmark": Landmark,
  "file-lock-2": FileLock2,
  "stamp": Stamp,
};

const PRACTICE_AREA_COLORS: Record<string, string> = {
  "Criminal Law": "bg-error/10 text-error",
  "Civil Law": "bg-accent/10 text-accent",
  "Constitutional Law": "bg-warning/10 text-warning-dark",
  "Corporate Law": "bg-success/10 text-success-dark",
};

function TemplateCard({ template }: { template: TemplateDefinition }) {
  const Icon = ICON_MAP[template.icon] || Stamp;
  const badgeColor = PRACTICE_AREA_COLORS[template.practiceAreaLabel] || "bg-gray-100 text-gray-600";

  return (
    <Link
      to={`/drafts/${template.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="inline-flex rounded-xl bg-navy-50 p-2.5">
          <Icon className="h-5 w-5 text-navy-600" />
        </div>
        <span className={`rounded-full px-2.5 py-0.5 font-heading text-[11px] font-medium ${badgeColor}`}>
          {template.practiceAreaLabel}
        </span>
      </div>
      <h3 className="font-heading text-sm font-semibold text-gray-900">
        {template.name}
      </h3>
      <p className="mt-1 flex-1 font-heading text-xs leading-relaxed text-gray-500">
        {template.description}
      </p>
      <div className="mt-4 flex items-center gap-1 font-heading text-xs font-medium text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        Start drafting <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

export function DraftsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [activeArea, setActiveArea] = useState<string | null>(null);

  // Check if we arrived from document analysis
  const fromAnalysis = searchParams.get("from") === "analysis";
  const analysisContext = useMemo(() => {
    if (!fromAnalysis) return null;
    try {
      const raw = sessionStorage.getItem("nyay_draft_context");
      if (raw) return JSON.parse(raw) as { documentTitle?: string; summary?: string };
    } catch { /* ignore */ }
    return null;
  }, [fromAnalysis]);

  const dismissAnalysisContext = () => {
    sessionStorage.removeItem("nyay_draft_context");
    setSearchParams({}, { replace: true });
  };

  const grouped = getTemplatesByPracticeArea();
  const practiceAreas = Object.keys(grouped);

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesArea = !activeArea || t.practiceAreaLabel === activeArea;
    return matchesSearch && matchesArea;
  });

  const filteredGrouped: Record<string, TemplateDefinition[]> = {};
  for (const t of filtered) {
    if (!filteredGrouped[t.practiceAreaLabel]) {
      filteredGrouped[t.practiceAreaLabel] = [];
    }
    filteredGrouped[t.practiceAreaLabel].push(t);
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">
          Draft Documents
        </h1>
        <p className="mt-1 font-heading text-sm text-gray-500">
          Select a template to generate AI-powered legal documents.
        </p>
      </div>

      {/* Analysis context banner */}
      {fromAnalysis && analysisContext && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm font-semibold text-navy-600">
              Drafting from document analysis
            </p>
            <p className="mt-0.5 font-body text-xs text-gray-600 truncate">
              {analysisContext.documentTitle || "Analyzed Document"} — select a template below and fields will be pre-filled from the analysis.
            </p>
          </div>
          <button
            onClick={dismissAnalysisContext}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveArea(null)}
            className={`rounded-full px-3 py-1.5 font-heading text-xs font-medium transition-colors duration-150 ${
              !activeArea
                ? "bg-navy-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {practiceAreas.map((area) => (
            <button
              key={area}
              onClick={() => setActiveArea(activeArea === area ? null : area)}
              className={`rounded-full px-3 py-1.5 font-heading text-xs font-medium transition-colors duration-150 ${
                activeArea === area
                  ? "bg-navy-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid grouped by practice area */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="font-heading text-sm text-gray-500">
            No templates match your search.
          </p>
        </div>
      ) : (
        Object.entries(filteredGrouped).map(([area, templates]) => (
          <div key={area}>
            <h2 className="mb-3 font-heading text-sm font-semibold text-gray-700">
              {area}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
