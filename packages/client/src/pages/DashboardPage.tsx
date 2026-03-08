import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  FileEdit,
  MessageSquare,
  Briefcase,
  CheckCircle2,
  Circle,
  X,
  ArrowRight,
  Calendar,
  Clock,
  Scale,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "../stores/auth.store";
import { DashboardSkeleton } from "../components/dashboard/Skeletons";
import { useTranslation } from "../lib/i18n";
import type { TranslationKey } from "../lib/i18n";
import type { LucideIcon } from "lucide-react";

interface ChecklistStep {
  id: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  done: boolean;
  link: string;
}

const INITIAL_STEPS: ChecklistStep[] = [
  { id: "profile", labelKey: "dashboard.step.profile.label", descKey: "dashboard.step.profile.desc", done: false, link: "/settings" },
  { id: "case", labelKey: "dashboard.step.case.label", descKey: "dashboard.step.case.desc", done: false, link: "/cases" },
  { id: "chat", labelKey: "dashboard.step.chat.label", descKey: "dashboard.step.chat.desc", done: false, link: "/chat" },
  { id: "draft", labelKey: "dashboard.step.draft.label", descKey: "dashboard.step.draft.desc", done: false, link: "/drafts" },
];

interface QuickAction {
  to: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  color: string;
  iconBg: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { to: "/research", icon: Search, labelKey: "dashboard.action.research", descKey: "dashboard.action.research.desc", color: "bg-accent/10 text-accent", iconBg: "bg-accent/10" },
  { to: "/drafts", icon: FileEdit, labelKey: "dashboard.action.draft", descKey: "dashboard.action.draft.desc", color: "bg-success/10 text-success-dark", iconBg: "bg-success/10" },
  { to: "/chat", icon: MessageSquare, labelKey: "dashboard.action.chat", descKey: "dashboard.action.chat.desc", color: "bg-navy-100 text-navy-600", iconBg: "bg-navy-100" },
  { to: "/cases", icon: Briefcase, labelKey: "dashboard.action.cases", descKey: "dashboard.action.cases.desc", color: "bg-warning/10 text-warning-dark", iconBg: "bg-warning/10" },
];

// Mock data — will be replaced with API calls
const MOCK_CONVERSATIONS = [
  { id: "1", title: "IPC Section 420 analysis", practice_area: "Criminal", updated_at: "2 hours ago" },
  { id: "2", title: "Property dispute in Dwarka", practice_area: "Civil", updated_at: "5 hours ago" },
  { id: "3", title: "GST compliance review", practice_area: "Tax", updated_at: "1 day ago" },
  { id: "4", title: "Trademark infringement notice", practice_area: "IP", updated_at: "2 days ago" },
  { id: "5", title: "Bail application drafting", practice_area: "Criminal", updated_at: "3 days ago" },
];

const MOCK_DEADLINES = [
  { id: "1", title: "Filing reply — Sharma vs State", date: "Mar 10, 2026", type: "filing" as const, urgent: true },
  { id: "2", title: "Hearing — Patel Property Dispute", date: "Mar 14, 2026", type: "hearing" as const, urgent: false },
  { id: "3", title: "Limitation expiry — Singh Contract", date: "Mar 18, 2026", type: "limitation" as const, urgent: false },
  { id: "4", title: "Compliance — GST Return Q4", date: "Mar 25, 2026", type: "compliance" as const, urgent: false },
  { id: "5", title: "Hearing — IP Trademark case", date: "Apr 2, 2026", type: "hearing" as const, urgent: false },
];

const DEADLINE_ICON_MAP = {
  filing: FileText,
  hearing: Scale,
  limitation: Clock,
  compliance: Calendar,
  other: Calendar,
};

export function DashboardPage() {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [loading] = useState(false);

  if (loading) return <DashboardSkeleton />;

  const allDone = steps.every((s) => s.done);
  const completedCount = steps.filter((s) => s.done).length;

  const toggleStep = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  };

  const firstName = profile?.full_name?.split(" ").filter(Boolean)[0] ?? "Counsellor";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">
          {t("dashboard.welcome", { name: firstName })}
        </h1>
        <p className="mt-1 font-heading text-sm text-gray-500">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Getting Started Checklist */}
      {!checklistDismissed && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold text-gray-900">
                {t("dashboard.gettingStarted")}
              </h2>
              <p className="mt-0.5 font-heading text-xs text-gray-500">
                {t("dashboard.completedOf", { done: completedCount, total: steps.length })}
              </p>
            </div>
            {allDone && (
              <button
                onClick={() => setChecklistDismissed(true)}
                className="rounded-xl p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-4 h-1.5 rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-success transition-all duration-300 ease-out"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>

          <div className="space-y-2">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-gray-50"
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-gray-300" />
                )}
                <div className="flex-1">
                  <span
                    className={`font-heading text-sm font-medium ${
                      step.done ? "text-gray-400 line-through" : "text-gray-900"
                    }`}
                  >
                    {t(step.labelKey)}
                  </span>
                  <p className="font-heading text-xs text-gray-400">{t(step.descKey)}</p>
                </div>
                {!step.done && (
                  <Link
                    to={step.link}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-xl px-2.5 py-1 font-heading text-xs font-medium text-accent hover:bg-accent/10"
                  >
                    {t("dashboard.start")}
                  </Link>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions 2x2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map(({ to, icon: Icon, labelKey, descKey, color, iconBg }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${color.split(" ")[1]}`} />
            </div>
            <h3 className="font-heading text-sm font-semibold text-gray-900">{t(labelKey)}</h3>
            <p className="mt-0.5 font-heading text-xs text-gray-500">{t(descKey)}</p>
            <div className="mt-3 flex items-center gap-1 font-heading text-xs font-medium text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {t("dashboard.getStarted")} <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Conversations + Upcoming Deadlines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Conversations */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-gray-900">
              {t("dashboard.recentConversations")}
            </h2>
            <Link
              to="/chat"
              className="font-heading text-xs font-medium text-accent hover:text-accent-dark"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <div className="space-y-1">
            {MOCK_CONVERSATIONS.map((conv) => (
              <Link
                key={conv.id}
                to={`/chat/${conv.id}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-gray-50"
              >
                <div>
                  <p className="font-heading text-sm font-medium text-gray-900">{conv.title}</p>
                  <p className="font-heading text-xs text-gray-400">{conv.practice_area}</p>
                </div>
                <span className="shrink-0 font-heading text-xs text-gray-400">
                  {conv.updated_at}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-gray-900">
              {t("dashboard.upcomingDeadlines")}
            </h2>
            <Link
              to="/cases"
              className="font-heading text-xs font-medium text-accent hover:text-accent-dark"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <div className="space-y-1">
            {MOCK_DEADLINES.map((dl) => {
              const DlIcon = DEADLINE_ICON_MAP[dl.type];
              return (
                <div
                  key={dl.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-gray-50"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      dl.urgent ? "bg-error/10" : "bg-gray-100"
                    }`}
                  >
                    <DlIcon
                      className={`h-4 w-4 ${dl.urgent ? "text-error" : "text-gray-500"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading text-sm font-medium text-gray-900">{dl.title}</p>
                    <p
                      className={`font-heading text-xs ${
                        dl.urgent ? "font-medium text-error" : "text-gray-400"
                      }`}
                    >
                      {dl.date}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([
          { labelKey: "dashboard.stat.activeCases" as const, value: profile?.total_cases ?? 0, icon: Briefcase },
          { labelKey: "dashboard.stat.aiCredits" as const, value: profile?.ai_credits ?? 0, icon: TrendingUp },
          { labelKey: "dashboard.stat.winRate" as const, value: `${profile?.win_rate ?? 0}%`, icon: Scale },
          { labelKey: "dashboard.stat.documents" as const, value: "—", icon: FileText },
        ]).map(({ labelKey, value, icon: StatIcon }) => (
          <div
            key={labelKey}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-heading text-xs font-medium text-gray-500">{t(labelKey)}</p>
              <StatIcon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-1 font-heading text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
