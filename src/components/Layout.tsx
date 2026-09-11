import { NavLink, Outlet } from "react-router-dom";
import {
  Sun, MessageCircle, LayoutDashboard, FileText, Receipt, Zap, Moon, Languages,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "../i18n";
import { useTheme } from "../theme/ThemeContext";

const NAV: { to: string; key: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", key: "nav_home", icon: Sun, end: true },
  { to: "/chat", key: "nav_chat", icon: MessageCircle },
  { to: "/dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { to: "/documents", key: "nav_documents", icon: FileText },
  { to: "/bills", key: "nav_bills", icon: Receipt },
  { to: "/solar", key: "nav_solar", icon: Zap },
];

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <aside
        className="hidden md:flex md:flex-col md:w-64 shrink-0 border-r px-4 py-6"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2 px-2 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            <Sun size={18} color="white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-[15px]" style={{ color: "var(--text)" }}>
              SolarGrid
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Advisor
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-ring ${
                  isActive ? "" : "hover:opacity-80"
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? "var(--accent-soft)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
              })}
            >
              <Icon size={17} strokeWidth={2} />
              {t(key as any)}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2 pt-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm focus-ring hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            {theme === "light" ? t("theme_dark") : t("theme_light")}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm focus-ring hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            <Languages size={16} />
            {lang === "en" ? "اردو" : "English"}
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            <Sun size={14} color="white" />
          </div>
          <span className="font-display font-bold text-sm">SolarGrid</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className="p-2 rounded-lg focus-ring" style={{ color: "var(--text-muted)" }}>
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="p-2 rounded-lg focus-ring"
            style={{ color: "var(--text-muted)" }}
          >
            <Languages size={16} />
          </button>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8" lang={lang === "ur" ? "ur" : undefined}>
          <Outlet />
        </div>
      </main>

      {/* mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-stretch border-t"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
      >
        {NAV.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] focus-ring"
            style={({ isActive }) => ({ color: isActive ? "var(--accent)" : "var(--text-muted)" })}
          >
            <Icon size={18} />
            {t(key as any)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
