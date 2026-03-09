import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  FileEdit,
  Briefcase,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { FolderOpen, CreditCard, Settings } from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import type { TranslationKey } from "../../lib/i18n";
import type { LucideIcon } from "lucide-react";

const PRIMARY_NAV: { to: string; icon: LucideIcon; labelKey: TranslationKey }[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { to: "/research", icon: Search, labelKey: "nav.research" },
  { to: "/drafts", icon: FileEdit, labelKey: "nav.drafts" },
  { to: "/more", icon: MoreHorizontal, labelKey: "nav.more" },
];

const MORE_NAV: { to: string; icon: LucideIcon; labelKey: TranslationKey }[] = [
  { to: "/cases", icon: Briefcase, labelKey: "nav.cases" },
  { to: "/documents", icon: FolderOpen, labelKey: "nav.documents" },
  { to: "/billing", icon: CreditCard, labelKey: "nav.billing" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More menu bottom sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+64px)] animate-slide-up rounded-t-2xl bg-white px-2 py-3 shadow-lg">
            <div className="mb-2 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            {MORE_NAV.map(({ to, icon: Icon, labelKey }) => {
              const isActive = pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 font-heading text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-navy-50 text-navy-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{t(labelKey)}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-stretch">
          {PRIMARY_NAV.map(({ to, icon: Icon, labelKey }) => {
            const isMore = to === "/more";
            const isActive = isMore
              ? MORE_NAV.some((item) => pathname.startsWith(item.to))
              : to === "/"
                ? pathname === "/"
                : pathname.startsWith(to);

            if (isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`flex min-h-[64px] flex-1 flex-col items-center justify-center gap-0.5 font-heading text-[10px] font-medium transition-colors duration-150 ${
                    isActive || moreOpen ? "text-navy-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span>{t(labelKey)}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                className={`flex min-h-[64px] flex-1 flex-col items-center justify-center gap-0.5 font-heading text-[10px] font-medium transition-colors duration-150 ${
                  isActive ? "text-navy-600" : "text-gray-400"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span>{t(labelKey)}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
