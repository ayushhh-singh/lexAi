import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  FileEdit,
  Briefcase,
  FolderOpen,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scale,
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import type { TranslationKey } from "../../lib/i18n";
import type { LucideIcon } from "lucide-react";

const NAV_ITEMS: { to: string; icon: LucideIcon; labelKey: TranslationKey }[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { to: "/research", icon: Search, labelKey: "nav.research" },
  { to: "/drafts", icon: FileEdit, labelKey: "nav.drafts" },
  { to: "/cases", icon: Briefcase, labelKey: "nav.cases" },
  { to: "/documents", icon: FolderOpen, labelKey: "nav.documents" },
  { to: "/billing", icon: CreditCard, labelKey: "nav.billing" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <aside className="hidden lg:block">
      <div
        className={`flex h-full flex-col bg-navy-600 text-white transition-[width] duration-200 ease-out ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Scale className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold tracking-tight whitespace-nowrap">
              Nyay Sahayak
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => {
            const label = t(labelKey);
            const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`group flex h-12 items-center gap-3 rounded-xl px-3 font-heading text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "border-l-[3px] border-accent bg-white/10 text-white"
                    : "border-l-[3px] border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={onToggle}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl px-3 text-white/60 transition-colors duration-150 hover:bg-white/5 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && <span className="font-heading text-sm">{t("nav.collapse")}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
