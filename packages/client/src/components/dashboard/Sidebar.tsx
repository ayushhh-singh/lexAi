import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  FileEdit,
  Briefcase,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Scale,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/research", icon: Search, label: "Research" },
  { to: "/drafts", icon: FileEdit, label: "Drafts" },
  { to: "/cases", icon: Briefcase, label: "Cases" },
  { to: "/documents", icon: FolderOpen, label: "Documents" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { pathname } = useLocation();

  const sidebarContent = (
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
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading text-sm font-medium transition-colors duration-150 ${
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

      {/* Collapse Toggle — desktop only */}
      <div className="hidden border-t border-white/10 p-3 lg:block">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-white/60 transition-colors duration-150 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!collapsed && <span className="font-heading text-sm">Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Slide-out sheet */}
          <div className="relative h-full w-[260px] animate-slide-right">
            {sidebarContent}
            <button
              onClick={onMobileClose}
              aria-label="Close navigation menu"
              className="absolute right-3 top-4 rounded-xl p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
