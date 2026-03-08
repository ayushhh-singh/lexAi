import { useState, useCallback, useEffect } from "react";
import {
  Timer,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Sparkles,
  Info,
  Shield,
  ShieldOff,
  Calendar,
} from "lucide-react";
import { api } from "../../lib/api-client";
import type {
  LimitationPeriod,
  LimitationCalculation,
  LimitationSuggestion,
  LimitationCategory,
  ExclusionInput,
} from "@nyay/shared";

interface LimitationCalculatorProps {
  caseId: string;
  caseType?: string;
  caseDescription?: string;
  onAddDeadline?: (data: { title: string; deadline_date: string; deadline_type: string; description: string }) => void;
}

const CATEGORY_LABELS: Record<LimitationCategory, string> = {
  suits_relating_to_contracts: "Contracts",
  suits_relating_to_declarations: "Declarations",
  suits_relating_to_decrees_and_instruments: "Decrees & Instruments",
  suits_relating_to_movable_property: "Movable Property",
  suits_relating_to_immovable_property: "Immovable Property",
  suits_relating_to_torts: "Torts",
  appeals: "Appeals",
  applications: "Applications",
  criminal: "Criminal",
  special_statutes: "Special Statutes",
};

export function LimitationCalculator({ caseId, caseType, caseDescription, onAddDeadline }: LimitationCalculatorProps) {
  // State
  const [periods, setPeriods] = useState<LimitationPeriod[]>([]);
  const [categories, setCategories] = useState<Array<{ id: LimitationCategory; label: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<LimitationCategory | "">("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [causeDate, setCauseDate] = useState("");
  const [calculation, setCalculation] = useState<LimitationCalculation | null>(null);
  const [suggestions, setSuggestions] = useState<LimitationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showExclusions, setShowExclusions] = useState(false);
  const [addingDeadline, setAddingDeadline] = useState(false);

  // Exclusions
  const [s12Days, setS12Days] = useState(0);
  const [s12Reason, setS12Reason] = useState("");
  const [s14Days, setS14Days] = useState(0);
  const [s14Reason, setS14Reason] = useState("");
  const [s15Days, setS15Days] = useState(0);
  const [s15Reason, setS15Reason] = useState("");

  // Load periods and categories
  useEffect(() => {
    (async () => {
      try {
        const [periodsRes, catsRes] = await Promise.all([
          api.limitation.getPeriods(),
          api.limitation.getCategories(),
        ]);
        setPeriods((periodsRes.data ?? []) as LimitationPeriod[]);
        setCategories((catsRes.data ?? []) as Array<{ id: LimitationCategory; label: string }>);
      } catch {
        // Silently fail
      }
    })();
  }, []);

  // Filter periods by selected category
  const filteredPeriods = selectedCategory
    ? periods.filter((p) => p.category === selectedCategory)
    : periods;

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Calculate
  const handleCalculate = useCallback(async () => {
    if (!causeDate || !selectedPeriodId) return;
    setLoading(true);
    try {
      const exclusions: ExclusionInput = {};
      if (s12Days > 0 && s12Reason) {
        exclusions.section_12 = { days: s12Days, reason: s12Reason };
      }
      if (s14Days > 0 && s14Reason) {
        exclusions.section_14 = { days: s14Days, reason: s14Reason };
      }
      if (s15Days > 0 && s15Reason) {
        exclusions.section_15 = { days: s15Days, reason: s15Reason };
      }

      const res = await api.limitation.calculate({
        cause_date: causeDate,
        period_id: selectedPeriodId,
        exclusions: Object.keys(exclusions).length > 0 ? exclusions : undefined,
      });
      setCalculation((res.data ?? null) as LimitationCalculation | null);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [causeDate, selectedPeriodId, s12Days, s12Reason, s14Days, s14Reason, s15Days, s15Reason]);

  // AI Suggest
  const handleSuggest = useCallback(async () => {
    if (!caseType) return;
    setSuggestLoading(true);
    try {
      const res = await api.limitation.suggest({
        case_type: caseType,
        description: caseDescription,
      });
      setSuggestions((res.data ?? []) as LimitationSuggestion[]);
    } catch {
      // Silently fail
    } finally {
      setSuggestLoading(false);
    }
  }, [caseType, caseDescription]);

  // Add to case deadlines
  const handleAddDeadline = useCallback(async () => {
    if (!calculation || !onAddDeadline || calculation.final_deadline === "N/A — No fixed limitation") return;
    setAddingDeadline(true);
    try {
      await onAddDeadline({
        title: `Limitation: ${calculation.limitation_period.description.slice(0, 80)}`,
        deadline_date: calculation.final_deadline,
        deadline_type: "limitation",
        description: `${calculation.limitation_period.act} — Art. ${calculation.limitation_period.article}. ${
          calculation.total_excluded_days > 0
            ? `Exclusions applied: ${calculation.total_excluded_days} days.`
            : ""
        }`,
      });
    } catch {
      // Silently fail
    } finally {
      setAddingDeadline(false);
    }
  }, [calculation, onAddDeadline]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-base font-semibold text-gray-900">
            Limitation Period Calculator
          </h3>
        </div>
        {caseType && (
          <button
            onClick={handleSuggest}
            disabled={suggestLoading}
            className="flex items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-1.5 font-heading text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/5 disabled:opacity-50"
          >
            {suggestLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI Analyze
          </button>
        )}
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="mb-2 font-heading text-xs font-semibold text-accent">
            Suggested Limitation Periods
          </p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <button
                key={s.period.id}
                onClick={() => {
                  setSelectedPeriodId(s.period.id);
                  setSelectedCategory(s.period.category);
                }}
                className={`w-full rounded-lg border p-3 text-left transition-all duration-150 ${
                  selectedPeriodId === s.period.id
                    ? "border-accent bg-white shadow-sm"
                    : "border-transparent hover:border-accent/30 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading text-sm font-medium text-gray-900">
                    Art. {s.period.article} — {s.period.period_label}
                  </span>
                  <span className="rounded bg-accent/10 px-2 py-0.5 font-heading text-[10px] font-medium text-accent">
                    {s.relevance}
                  </span>
                </div>
                <p className="mt-0.5 font-body text-xs leading-relaxed text-gray-600">
                  {s.period.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calculator Form */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Category filter */}
        <div>
          <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as LimitationCategory | "");
              setSelectedPeriodId("");
              setCalculation(null);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Period selector */}
        <div>
          <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
            Cause of Action / Article
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => {
              setSelectedPeriodId(e.target.value);
              setCalculation(null);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">Select limitation period...</option>
            {filteredPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                Art. {p.article} — {p.period_label} — {p.description.slice(0, 60)}
                {p.description.length > 60 ? "..." : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Cause date */}
        <div>
          <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
            Date of Cause of Action
          </label>
          <input
            type="date"
            value={causeDate}
            onChange={(e) => {
              setCauseDate(e.target.value);
              setCalculation(null);
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Period info */}
        <div>
          <label className="mb-1 block font-heading text-xs font-medium text-gray-700">
            Period
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5">
            <span className="font-heading text-sm font-medium text-gray-900">
              {selectedPeriod ? selectedPeriod.period_label : "—"}
            </span>
            {selectedPeriod && (
              <span className="ml-auto flex items-center gap-1">
                {selectedPeriod.condonable ? (
                  <Shield className="h-3.5 w-3.5 text-success" />
                ) : (
                  <ShieldOff className="h-3.5 w-3.5 text-error" />
                )}
                <span className={`font-heading text-[10px] font-medium ${selectedPeriod.condonable ? "text-success" : "text-error"}`}>
                  {selectedPeriod.condonable ? "Condonable" : "Not Condonable"}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selected period details */}
      {selectedPeriod && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="font-body text-xs leading-relaxed text-gray-700">
            <strong className="font-heading">Art. {selectedPeriod.article}</strong> —{" "}
            {selectedPeriod.description}
          </p>
          {selectedPeriod.notes && (
            <p className="mt-1 flex items-start gap-1 font-body text-xs text-gray-500">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {selectedPeriod.notes}
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] text-gray-400">
            {selectedPeriod.act}
            {selectedPeriod.section ? ` — ${selectedPeriod.section}` : ""}
          </p>
        </div>
      )}

      {/* Exclusions toggle */}
      {selectedPeriod && selectedPeriod.period_days > 0 && (
        <div>
          <button
            onClick={() => setShowExclusions(!showExclusions)}
            className="flex items-center gap-1.5 font-heading text-xs font-medium text-accent hover:text-accent-dark"
          >
            {showExclusions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Exclusions (S.12 / S.14 / S.15)
          </button>

          {showExclusions && (
            <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-white p-4">
              {/* S.12 — Certified copies */}
              <div>
                <p className="mb-2 font-heading text-xs font-semibold text-gray-700">
                  S.12 — Time for obtaining certified copies
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    min={0}
                    value={s12Days || ""}
                    onChange={(e) => setS12Days(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="Days to exclude"
                    className="rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="text"
                    value={s12Reason}
                    onChange={(e) => setS12Reason(e.target.value)}
                    placeholder="Reason (e.g., Obtaining certified copy of decree)"
                    className="rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* S.14 — Prior proceeding */}
              <div>
                <p className="mb-2 font-heading text-xs font-semibold text-gray-700">
                  S.14 — Time in prior proceeding in good faith
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    min={0}
                    value={s14Days || ""}
                    onChange={(e) => setS14Days(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="Days to exclude"
                    className="rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="text"
                    value={s14Reason}
                    onChange={(e) => setS14Reason(e.target.value)}
                    placeholder="Reason (e.g., Prior suit in wrong court)"
                    className="rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* S.15 — Stay/Injunction */}
              <div>
                <p className="mb-2 font-heading text-xs font-semibold text-gray-700">
                  S.15 — Time during stay / injunction
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    min={0}
                    value={s15Days || ""}
                    onChange={(e) => setS15Days(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="Days to exclude"
                    className="rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="text"
                    value={s15Reason}
                    onChange={(e) => setS15Reason(e.target.value)}
                    placeholder="Reason (e.g., Court-ordered stay)"
                    className="rounded-lg border border-gray-300 px-3 py-2 font-heading text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={!causeDate || !selectedPeriodId || loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 py-2.5 font-heading text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-800 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
        Calculate Deadline
      </button>

      {/* Result */}
      {calculation && (
        <div className="space-y-4">
          {/* Main result card */}
          <div
            className={`rounded-xl border p-5 ${
              calculation.final_deadline === "N/A — No fixed limitation"
                ? "border-accent/20 bg-accent/5"
                : calculation.is_expired
                  ? "border-error/30 bg-error/5"
                  : calculation.days_remaining <= 30
                    ? "border-warning/30 bg-warning/5"
                    : "border-success/30 bg-success/5"
            }`}
          >
            {calculation.final_deadline === "N/A — No fixed limitation" ? (
              <div className="flex items-center gap-3">
                <Info className="h-6 w-6 text-accent" />
                <div>
                  <p className="font-heading text-lg font-bold text-accent">No Fixed Limitation</p>
                  <p className="font-body text-sm text-gray-600">
                    {calculation.condonation_note}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading text-xs font-medium text-gray-500">Final Deadline</p>
                  <p className="mt-0.5 font-heading text-2xl font-bold text-gray-900">
                    {new Date(calculation.final_deadline).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {calculation.is_expired ? (
                      <span className="flex items-center gap-1 font-heading text-sm font-semibold text-error">
                        <AlertCircle className="h-4 w-4" />
                        EXPIRED {Math.abs(calculation.days_remaining)} days ago
                      </span>
                    ) : (
                      <span
                        className={`flex items-center gap-1 font-heading text-sm font-semibold ${
                          calculation.days_remaining <= 7
                            ? "text-error"
                            : calculation.days_remaining <= 30
                              ? "text-warning-dark"
                              : "text-success-dark"
                        }`}
                      >
                        {calculation.days_remaining <= 7 ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {calculation.days_remaining} days remaining
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {calculation.is_condonable ? (
                      <Shield className="h-4 w-4 text-success" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-error" />
                    )}
                    <span className={`font-heading text-xs font-medium ${calculation.is_condonable ? "text-success" : "text-error"}`}>
                      {calculation.is_condonable ? "Condonable" : "Not Condonable"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Details breakdown */}
          {calculation.final_deadline !== "N/A — No fixed limitation" && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="font-heading text-xs text-gray-500">Base Period</dt>
                  <dd className="font-heading text-xs font-medium text-gray-900">
                    {calculation.limitation_period.period_label} (Art. {calculation.limitation_period.article})
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-heading text-xs text-gray-500">Cause Date</dt>
                  <dd className="font-heading text-xs font-medium text-gray-900">
                    {new Date(calculation.cause_date).toLocaleDateString("en-IN")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-heading text-xs text-gray-500">Raw Deadline</dt>
                  <dd className="font-heading text-xs font-medium text-gray-900">
                    {new Date(calculation.raw_deadline).toLocaleDateString("en-IN")}
                  </dd>
                </div>
                {calculation.total_excluded_days > 0 && (
                  <>
                    <div className="flex justify-between border-t border-gray-100 pt-2">
                      <dt className="font-heading text-xs text-accent">Excluded Days</dt>
                      <dd className="font-heading text-xs font-medium text-accent">
                        +{calculation.total_excluded_days} days
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-heading text-xs text-gray-500">Adjusted Deadline</dt>
                      <dd className="font-heading text-xs font-bold text-gray-900">
                        {new Date(calculation.final_deadline).toLocaleDateString("en-IN")}
                      </dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <dt className="font-heading text-xs text-gray-500">Act</dt>
                  <dd className="font-mono text-[10px] text-gray-500">
                    {calculation.limitation_period.act}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Warnings */}
          {calculation.warnings.length > 0 && (
            <div className="space-y-2">
              {calculation.warnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg px-4 py-3 ${
                    w.includes("CRITICAL") || w.includes("STRICT")
                      ? "border border-error/20 bg-error/5"
                      : w.includes("URGENT")
                        ? "border border-warning/20 bg-warning/5"
                        : "border border-accent/10 bg-accent/5"
                  }`}
                >
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${
                    w.includes("CRITICAL") || w.includes("STRICT") ? "text-error" : "text-warning-dark"
                  }`} />
                  <p className="font-body text-xs leading-relaxed text-gray-700">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Condonation note */}
          {calculation.condonation_note && calculation.final_deadline !== "N/A — No fixed limitation" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="flex items-start gap-1.5 font-body text-xs leading-relaxed text-gray-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                {calculation.condonation_note}
              </p>
            </div>
          )}

          {/* Add to Case Deadlines */}
          {onAddDeadline && calculation.final_deadline !== "N/A — No fixed limitation" && (
            <button
              onClick={handleAddDeadline}
              disabled={addingDeadline}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-5 py-2.5 font-heading text-sm font-medium text-accent transition-colors duration-150 hover:bg-accent/10 disabled:opacity-50"
            >
              {addingDeadline ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add to Case Deadlines
            </button>
          )}
        </div>
      )}
    </div>
  );
}
