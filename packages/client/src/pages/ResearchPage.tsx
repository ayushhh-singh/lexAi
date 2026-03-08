import { useState, useCallback, useEffect } from "react";
import {
  Search,
  BookOpen,
  Scale,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  BookmarkPlus,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { COURT_LEVELS } from "@nyay/shared";
import type {
  ScoredChunk,
  ExplainResponse,
  CaseLawResult,
  CaseLawSearchRequest,
  ActEntry,
  ActSection,
} from "@nyay/shared";

// ─── Tab definitions ─────────────────────────────────────────────────

type Tab = "ai-research" | "browse-acts" | "case-law";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "ai-research", label: "AI Research", icon: Sparkles },
  { id: "browse-acts", label: "Browse Acts", icon: BookOpen },
  { id: "case-law", label: "Case Law Search", icon: Scale },
];

const SOURCE_FILTERS = [
  { id: "all", label: "All Sources" },
  { id: "act", label: "Statutes" },
  { id: "judgement", label: "Case Law" },
  { id: "commentary", label: "Commentary" },
  { id: "article", label: "Articles" },
] as const;

// ─── Main page ───────────────────────────────────────────────────────

export function ResearchPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ai-research");

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">
          Legal Research
        </h1>
        <p className="mt-1 font-heading text-sm text-gray-500">
          Search statutes, case law, and get AI-powered legal analysis.
        </p>
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
      {activeTab === "ai-research" && <AIResearchTab />}
      {activeTab === "browse-acts" && <BrowseActsTab />}
      {activeTab === "case-law" && <CaseLawTab />}
    </div>
  );
}

// ─── Tab 1: AI Research ──────────────────────────────────────────────

function AIResearchTab() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [results, setResults] = useState<ScoredChunk[]>([]);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const filters = sourceFilter !== "all" ? { source_type: sourceFilter } : undefined;

      const [searchRes, explainRes] = await Promise.all([
        api.research.search({ query: query.trim(), filters, limit: 10 }),
        api.research.explain({ query: query.trim(), filters }),
      ]);

      setResults(searchRes.data?.results ?? []);
      setExplanation(explainRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query, sourceFilter]);

  const handleCite = useCallback(async (chunk: ScoredChunk) => {
    const citation = `${chunk.source_title}${chunk.section_ref ? `, ${chunk.section_ref}` : ""}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedId(chunk.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API unavailable (insecure context)
    }
  }, []);

  const handleGenerateDoc = useCallback(() => {
    const citationContext = results
      .slice(0, 5)
      .map((r) => `${r.source_title}${r.section_ref ? ` — ${r.section_ref}` : ""}`)
      .join("; ");
    navigate(`/drafts?context=${encodeURIComponent(citationContext)}`);
  }, [results, navigate]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Indian legal statutes, case law, and commentary..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || query.trim().length < 3}
          className="flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-3 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Research
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSourceFilter(f.id)}
            className={`rounded-full px-3 py-1.5 font-heading text-xs font-medium transition-colors duration-150 ${
              sourceFilter === f.id
                ? "bg-navy-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-error" />
          <p className="font-heading text-sm text-error">{error}</p>
        </div>
      )}

      {/* AI Explanation */}
      {explanation && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="font-heading text-sm font-semibold text-accent">AI Analysis</span>
            {explanation.cached && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-heading text-[10px] text-gray-500">cached</span>
            )}
          </div>
          <div className="font-body text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {explanation.answer}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-gray-700">
              {results.length} Sources Found
            </h2>
            <button
              onClick={handleGenerateDoc}
              className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 font-heading text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
            >
              <FileText className="h-3.5 w-3.5" />
              Generate Document Citing This
            </button>
          </div>

          {results.map((chunk) => (
            <SearchResultCard
              key={chunk.id}
              chunk={chunk}
              onCite={handleCite}
              copied={copiedId === chunk.id}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && !explanation && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-heading text-sm font-medium text-gray-500">
            Search for any legal topic to get AI-powered analysis
          </p>
          <p className="mt-1 font-heading text-xs text-gray-400">
            Try "Section 498A IPC ingredients" or "grounds for anticipatory bail"
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
              <div className="mb-1 h-3 w-full rounded bg-gray-100" />
              <div className="h-3 w-4/5 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({
  chunk,
  onCite,
  copied,
}: {
  chunk: ScoredChunk;
  onCite: (chunk: ScoredChunk) => void;
  copied: boolean;
}) {
  const sourceColors: Record<string, string> = {
    act: "bg-accent/10 text-accent",
    judgement: "bg-error/10 text-error",
    commentary: "bg-warning/10 text-warning-dark",
    article: "bg-success/10 text-success-dark",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-semibold text-gray-900">
            {chunk.source_title}
          </h3>
          {chunk.section_ref && (
            <p className="mt-0.5 font-mono text-xs text-gray-500">{chunk.section_ref}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 font-heading text-[11px] font-medium ${
            sourceColors[chunk.source_type] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {chunk.source_type}
        </span>
      </div>

      <p className="mb-3 font-body text-sm leading-relaxed text-gray-600 line-clamp-3">
        {chunk.summary ?? chunk.content}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onCite(chunk)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-heading text-xs font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Cite This"}
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-heading text-xs font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50">
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save to Case
        </button>
      </div>
    </div>
  );
}

// ─── Tab 2: Browse Acts ──────────────────────────────────────────────

function BrowseActsTab() {
  const [acts, setActs] = useState<ActEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAct, setSelectedAct] = useState<string | null>(null);
  const [sections, setSections] = useState<ActSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const loadActs = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.research.browseActs();
      setActs(res.data?.acts ?? []);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load acts");
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  // Load on mount
  useEffect(() => { loadActs(); }, [loadActs]);

  const loadSections = useCallback(async (actTitle: string) => {
    if (selectedAct === actTitle) {
      setSelectedAct(null);
      setSections([]);
      return;
    }
    setSelectedAct(actTitle);
    setSectionsLoading(true);
    setExpandedSection(null);
    try {
      const res = await api.research.getActSections(actTitle);
      setSections(res.data?.sections ?? []);
    } catch {
      setSections([]);
    } finally {
      setSectionsLoading(false);
    }
  }, [selectedAct]);

  const handleExplain = useCallback(async (sectionId: string, content: string) => {
    if (explanations[sectionId]) return;
    setExplaining(sectionId);
    try {
      const res = await api.research.explain({
        query: `Explain the following legal provision in simple terms:\n\n${content.slice(0, 1000)}`,
      });
      setExplanations((prev) => ({ ...prev, [sectionId]: res.data?.answer ?? "No explanation available." }));
    } catch {
      setExplanations((prev) => ({ ...prev, [sectionId]: "Failed to generate explanation." }));
    } finally {
      setExplaining(null);
    }
  }, [explanations]);

  const filtered = acts.filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.short_title.toLowerCase().includes(search.toLowerCase())
  );

  // Group alphabetically
  const grouped = new Map<string, ActEntry[]>();
  for (const act of filtered) {
    const letter = act.title[0]?.toUpperCase() ?? "#";
    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter)!.push(act);
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search acts by name or abbreviation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-error" />
          <p className="font-heading text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {/* Acts list grouped alphabetically */}
      {!loading && Array.from(grouped.entries()).map(([letter, letterActs]) => (
        <div key={letter}>
          <div className="sticky top-0 z-10 mb-2 bg-gray-50 px-1 py-1">
            <span className="font-heading text-xs font-bold text-navy-600">{letter}</span>
          </div>
          <div className="space-y-1">
            {letterActs.map((act) => (
              <div key={act.id}>
                <button
                  onClick={() => loadSections(act.title)}
                  className={`flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left transition-all duration-150 hover:shadow-sm ${
                    selectedAct === act.title
                      ? "border-accent/30 bg-accent/5"
                      : "border-gray-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-heading text-sm font-medium text-gray-900">
                      {act.title}
                    </span>
                    {act.year > 0 && (
                      <span className="ml-2 font-heading text-xs text-gray-400">({act.year})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
                      {act.short_title}
                    </span>
                    {selectedAct === act.title ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Sections TOC */}
                {selectedAct === act.title && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-accent/20 pl-4">
                    {sectionsLoading ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        <span className="font-heading text-xs text-gray-500">Loading sections...</span>
                      </div>
                    ) : sections.length === 0 ? (
                      <p className="py-3 font-heading text-xs text-gray-400">No sections found.</p>
                    ) : (
                      sections.map((section) => (
                        <div key={section.id}>
                          <button
                            onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors duration-150 hover:bg-gray-50"
                          >
                            <ChevronRight
                              className={`h-3 w-3 shrink-0 text-gray-400 transition-transform duration-150 ${
                                expandedSection === section.id ? "rotate-90" : ""
                              }`}
                            />
                            <span className="font-mono text-xs font-medium text-accent">
                              {section.section_ref}
                            </span>
                            <span className="font-heading text-xs text-gray-700 line-clamp-1">
                              {section.title}
                            </span>
                          </button>

                          {expandedSection === section.id && (
                            <div className="ml-5 mt-1 rounded-lg border border-gray-100 bg-gray-50 p-4">
                              <p className="font-body text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                                {section.content}
                              </p>

                              {/* AI Explain button */}
                              <div className="mt-3 border-t border-gray-200 pt-3">
                                {explanations[section.id] ? (
                                  <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                                    <div className="mb-1 flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                                      <span className="font-heading text-xs font-semibold text-accent">
                                        AI Explanation
                                      </span>
                                    </div>
                                    <p className="font-body text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                                      {explanations[section.id]}
                                    </p>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleExplain(section.id, section.content)}
                                    disabled={explaining === section.id}
                                    className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 font-heading text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/20 disabled:opacity-50"
                                  >
                                    {explaining === section.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-3.5 w-3.5" />
                                    )}
                                    AI Explain
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && filtered.length === 0 && loaded && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-heading text-sm text-gray-500">No acts match your search.</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Case Law Search ──────────────────────────────────────────

function CaseLawTab() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CaseLawSearchRequest>({
    keywords: "",
    court: "",
    judge: "",
    year_from: undefined,
    year_to: undefined,
    statute: "",
  });
  const [results, setResults] = useState<CaseLawResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (form.keywords.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await api.research.searchCases({
        ...form,
        keywords: form.keywords.trim(),
        court: form.court || undefined,
        judge: form.judge || undefined,
        statute: form.statute || undefined,
      });
      setResults(res.data?.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleCite = useCallback(async (caseResult: CaseLawResult) => {
    try {
      await navigator.clipboard.writeText(caseResult.citation);
      setCopiedId(caseResult.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API unavailable (insecure context)
    }
  }, []);

  const handleGenerateDoc = useCallback(() => {
    const citationContext = results
      .slice(0, 5)
      .map((r) => r.citation)
      .join("; ");
    navigate(`/drafts?context=${encodeURIComponent(citationContext)}`);
  }, [results, navigate]);

  const updateField = <K extends keyof CaseLawSearchRequest>(key: K, value: CaseLawSearchRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Structured search form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Keywords */}
          <div className="sm:col-span-2">
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
              Keywords *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="e.g., anticipatory bail, Section 438, dowry harassment"
                value={form.keywords}
                onChange={(e) => updateField("keywords", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Court */}
          <div>
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
              Court
            </label>
            <select
              value={form.court ?? ""}
              onChange={(e) => updateField("court", e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 px-3 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">All Courts</option>
              {COURT_LEVELS.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Judge */}
          <div>
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
              Judge
            </label>
            <input
              type="text"
              placeholder="e.g., D.Y. Chandrachud"
              value={form.judge ?? ""}
              onChange={(e) => updateField("judge", e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 px-3 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Year range */}
          <div>
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
              Year From
            </label>
            <input
              type="number"
              placeholder="e.g., 2000"
              min={1947}
              max={2026}
              value={form.year_from ?? ""}
              onChange={(e) => updateField("year_from", e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-gray-300 py-2.5 px-3 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
              Year To
            </label>
            <input
              type="number"
              placeholder="e.g., 2026"
              min={1947}
              max={2026}
              value={form.year_to ?? ""}
              onChange={(e) => updateField("year_to", e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-gray-300 py-2.5 px-3 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Statute */}
          <div className="sm:col-span-2">
            <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
              Statute
            </label>
            <input
              type="text"
              placeholder="e.g., Indian Penal Code, Bharatiya Nyaya Sanhita"
              value={form.statute ?? ""}
              onChange={(e) => updateField("statute", e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 px-3 font-heading text-sm text-gray-900 outline-none transition-colors duration-150 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={loading || form.keywords.trim().length < 3}
            className="flex items-center gap-2 rounded-lg bg-navy-900 px-6 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            Search Case Law
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

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-gray-700">
              {results.length} Cases Found
            </h2>
            <button
              onClick={handleGenerateDoc}
              className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 font-heading text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
            >
              <FileText className="h-3.5 w-3.5" />
              Generate Document Citing This
            </button>
          </div>

          {results.map((caseResult) => (
            <CaseLawCard
              key={caseResult.id}
              caseResult={caseResult}
              onCite={handleCite}
              copied={copiedId === caseResult.id}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && results.length === 0 && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Scale className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-heading text-sm text-gray-500">No cases found matching your criteria.</p>
          <p className="mt-1 font-heading text-xs text-gray-400">Try broadening your search terms.</p>
        </div>
      )}

      {/* Pre-search state */}
      {!loading && !searched && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Scale className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-heading text-sm font-medium text-gray-500">
            Search Indian case law across all courts
          </p>
          <p className="mt-1 font-heading text-xs text-gray-400">
            Filter by court, judge, year range, and relevant statute
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
              <div className="mb-1 h-3 w-1/2 rounded bg-gray-100" />
              <div className="h-3 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseLawCard({
  caseResult,
  onCite,
  copied,
}: {
  caseResult: CaseLawResult;
  onCite: (c: CaseLawResult) => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold text-gray-900">
          {caseResult.title}
        </h3>
        <span className="shrink-0 rounded-full bg-navy-50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-navy-700">
          {caseResult.source === "indian_kanoon" ? "IK" : "KB"}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 font-heading text-xs text-gray-500">
        <span className="font-mono font-medium text-accent">{caseResult.citation}</span>
        <span>{caseResult.court}</span>
        {caseResult.date && <span>{caseResult.date}</span>}
      </div>

      {caseResult.judges.length > 0 && (
        <p className="mb-2 font-heading text-xs text-gray-400">
          Bench: {caseResult.judges.join(", ")}
        </p>
      )}

      <p className="mb-3 font-body text-sm leading-relaxed text-gray-600 line-clamp-3">
        {caseResult.headnote}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onCite(caseResult)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-heading text-xs font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Cite This"}
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-heading text-xs font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-50">
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save to Case
        </button>
      </div>
    </div>
  );
}
