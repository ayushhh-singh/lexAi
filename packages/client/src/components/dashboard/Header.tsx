import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, Search, ChevronRight, LogOut, User, Settings } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store";

interface HeaderProps {
  onMobileMenuOpen: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  chat: "Chat",
  research: "Research",
  drafts: "Drafts",
  cases: "Cases",
  documents: "Documents",
  settings: "Settings",
};

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const { pathname } = useLocation();
  const { profile, logout } = useAuthStore();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const segments = pathname.split("/").filter(Boolean);
  const credits = profile?.ai_credits ?? 0;

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setAvatarOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (avatarRef.current && !avatarRef.current.contains(target)) {
        setAvatarOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const creditColor =
    credits >= 100
      ? "bg-success/10 text-success-dark"
      : credits >= 20
        ? "bg-warning/10 text-warning-dark"
        : "bg-error/10 text-error-dark";

  const initials =
    profile?.full_name
      ?.split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuOpen}
        aria-label="Open navigation menu"
        className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 font-heading text-sm text-gray-500">
        <Link to="/" className="hover:text-navy-600 transition-colors duration-150">
          Dashboard
        </Link>
        {segments.map((seg, i) => (
          <span key={`${seg}-${i}`} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              to={"/" + segments.slice(0, i + 1).join("/")}
              className={`hover:text-navy-600 transition-colors duration-150 ${
                i === segments.length - 1 ? "text-navy-600 font-medium" : ""
              }`}
            >
              {ROUTE_LABELS[seg] ?? seg}
            </Link>
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search */}
      <div ref={searchRef} className="relative">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-heading text-sm text-gray-400 transition-colors duration-150 hover:border-gray-300 hover:bg-white"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden rounded-lg border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-400 sm:inline">
            {/Mac|iPhone|iPad/.test(navigator.userAgent) ? "\u2318" : "Ctrl"}K
          </kbd>
        </button>

        {searchOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search cases, documents, chats..."
                className="flex-1 bg-transparent font-heading text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
            <p className="mt-2 text-center font-heading text-xs text-gray-400">
              Start typing to search
            </p>
          </div>
        )}
      </div>

      {/* Language Toggle */}
      <div className="flex items-center rounded-xl border border-gray-200 font-heading text-sm">
        <button
          onClick={() => setLang("en")}
          className={`rounded-l-xl px-2.5 py-1 transition-colors duration-150 ${
            lang === "en" ? "bg-navy-600 text-white" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("hi")}
          className={`rounded-r-xl px-2.5 py-1 transition-colors duration-150 ${
            lang === "hi" ? "bg-navy-600 text-white" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          {"\u0939\u093F"}
        </button>
      </div>

      {/* Credits Pill */}
      <div className={`rounded-xl px-3 py-1 font-heading text-xs font-semibold ${creditColor}`}>
        {credits} credits
      </div>

      {/* Avatar Dropdown */}
      <div ref={avatarRef} className="relative">
        <button
          onClick={() => setAvatarOpen((v) => !v)}
          aria-label="User menu"
          aria-expanded={avatarOpen}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-600 font-heading text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            initials
          )}
        </button>

        {avatarOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg animate-fade-in">
            <div className="border-b border-gray-100 px-4 py-2.5">
              <p className="font-heading text-sm font-semibold text-gray-900">
                {profile?.full_name ?? "User"}
              </p>
              <p className="font-heading text-xs text-gray-500">{profile?.email}</p>
            </div>
            <Link
              to="/settings"
              onClick={() => setAvatarOpen(false)}
              className="flex items-center gap-2 px-4 py-2 font-heading text-sm text-gray-700 hover:bg-gray-50"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setAvatarOpen(false)}
              className="flex items-center gap-2 px-4 py-2 font-heading text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => {
                setAvatarOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 font-heading text-sm text-error hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
