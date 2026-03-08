import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Scale,
  Shield,
  ArrowRight,
  MessageSquare,
  FileEdit,
  Loader2,
  Clock,
  Zap,
} from "lucide-react";
import type { DocumentAnalysisResult } from "@nyay/shared";

interface AnalysisResultProps {
  analysis: DocumentAnalysisResult;
  documentTitle: string;
  onAskFollowUp?: () => void;
  onDraftResponse?: () => void;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
}

const SEVERITY_STYLES = {
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-100 text-red-700" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
  low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badge: "bg-green-100 text-green-700" },
};

export function AnalysisResult({
  analysis,
  documentTitle,
  onAskFollowUp,
  onDraftResponse,
  onGenerateReport,
  isGeneratingReport = false,
}: AnalysisResultProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["summary", "issues", "statutes", "risks", "next_steps"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-navy-600">
              {documentTitle}
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(analysis.analysis_time_ms / 1000).toFixed(1)}s
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {analysis.tokens_used.toLocaleString()} tokens
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onAskFollowUp && (
            <button
              onClick={onAskFollowUp}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 font-heading text-xs font-medium text-navy-600 transition-colors hover:bg-gray-50"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Ask Follow-up
            </button>
          )}
          {onDraftResponse && (
            <button
              onClick={onDraftResponse}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 font-heading text-xs font-medium text-navy-600 transition-colors hover:bg-gray-50"
            >
              <FileEdit className="h-3.5 w-3.5" />
              Draft Response
            </button>
          )}
          {onGenerateReport && (
            <button
              onClick={onGenerateReport}
              disabled={isGeneratingReport}
              className="flex items-center gap-1.5 rounded-lg bg-navy-600 px-3 py-2 font-heading text-xs font-medium text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {isGeneratingReport ? "Generating..." : "Generate Report (PDF)"}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <CollapsibleSection
        title="Executive Summary"
        icon={<FileText className="h-4 w-4 text-accent" />}
        section="summary"
        isExpanded={isExpanded("summary")}
        onToggle={toggleSection}
      >
        <p className="font-body text-sm leading-relaxed text-gray-700 whitespace-pre-line">
          {analysis.summary}
        </p>
      </CollapsibleSection>

      {/* Key Issues */}
      <CollapsibleSection
        title={`Key Issues (${analysis.key_issues.length})`}
        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        section="issues"
        isExpanded={isExpanded("issues")}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          {analysis.key_issues.map((issue, idx) => {
            const styles = SEVERITY_STYLES[issue.severity];
            return (
              <div
                key={idx}
                className={`rounded-lg border ${styles.border} ${styles.bg} p-4`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${styles.badge}`}>
                    {issue.severity}
                  </span>
                  <h4 className="font-heading text-sm font-semibold text-navy-600">
                    {issue.title}
                  </h4>
                </div>
                <p className="mb-2 font-body text-sm text-gray-600">
                  {issue.description}
                </p>
                <div className="flex items-start gap-1.5 text-sm">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                  <span className="font-body text-gray-700">
                    {issue.recommendation}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Relevant Statutes */}
      <CollapsibleSection
        title={`Relevant Statutes (${analysis.relevant_statutes.length})`}
        icon={<Scale className="h-4 w-4 text-navy-600" />}
        section="statutes"
        isExpanded={isExpanded("statutes")}
        onToggle={toggleSection}
      >
        <div className="divide-y divide-gray-100">
          {analysis.relevant_statutes.map((statute, idx) => (
            <div key={idx} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs font-medium text-accent">
                  {statute.section}
                </span>
                <span className="font-heading text-sm font-semibold text-navy-600">
                  {statute.name}
                </span>
              </div>
              <p className="mt-1 font-body text-sm text-gray-600">
                {statute.relevance}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Risk Assessment */}
      <CollapsibleSection
        title={`Risk Assessment (${analysis.risk_assessment.length})`}
        icon={<Shield className="h-4 w-4 text-red-500" />}
        section="risks"
        isExpanded={isExpanded("risks")}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          {analysis.risk_assessment.map((risk, idx) => {
            const styles = SEVERITY_STYLES[risk.level];
            return (
              <div
                key={idx}
                className={`rounded-lg border ${styles.border} ${styles.bg} p-4`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${styles.badge}`}>
                    {risk.level}
                  </span>
                  <h4 className="font-heading text-sm font-semibold text-navy-600">
                    {risk.area}
                  </h4>
                </div>
                <p className="mb-2 font-body text-sm text-gray-600">
                  {risk.description}
                </p>
                <div className="flex items-start gap-1.5 text-sm">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="font-body text-gray-700">
                    {risk.mitigation}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Next Steps */}
      <CollapsibleSection
        title={`Recommended Next Steps (${analysis.next_steps.length})`}
        icon={<ArrowRight className="h-4 w-4 text-green-600" />}
        section="next_steps"
        isExpanded={isExpanded("next_steps")}
        onToggle={toggleSection}
      >
        <ol className="space-y-2">
          {analysis.next_steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 font-heading text-xs font-bold text-accent">
                {idx + 1}
              </span>
              <p className="font-body text-sm text-gray-700 pt-0.5">{step}</p>
            </li>
          ))}
        </ol>
      </CollapsibleSection>
    </div>
  );
}

// ─── Collapsible Section ────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  section,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  section: string;
  isExpanded: boolean;
  onToggle: (s: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={() => onToggle(section)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {icon}
        <span className="flex-1 font-heading text-sm font-semibold text-navy-600">
          {title}
        </span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-4">{children}</div>
      )}
    </div>
  );
}
