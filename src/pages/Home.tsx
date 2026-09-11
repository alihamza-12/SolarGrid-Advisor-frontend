import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, FileText, LayoutDashboard, Loader2, MessageCircle, Receipt, Zap,
} from "lucide-react";
import heroImg from "../assets/hero.png";
import { useI18n } from "../i18n";
import { api, type HealthResponse } from "../api/client";
import { MetricCard, TimeOfDayBar } from "../components/Shared";

export default function Home() {
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"));
  }, []);

  const cards = [
    { to: "/chat", icon: MessageCircle, title: t("nav_chat"), cap: t("cap_chat") },
    { to: "/dashboard", icon: LayoutDashboard, title: t("nav_dashboard"), cap: t("cap_dashboard") },
    { to: "/documents", icon: FileText, title: t("nav_documents"), cap: t("cap_documents") },
    { to: "/bills", icon: Receipt, title: t("nav_bills"), cap: t("cap_bills") },
    { to: "/solar", icon: Zap, title: t("nav_solar"), cap: t("cap_solar") },
  ];

  return (
    <div className="space-y-8 pb-16 md:pb-0">
      {/* hero */}
      <div className="card px-6 sm:px-8 py-8 sm:py-10 grid gap-6 sm:grid-cols-[1fr_auto] items-center">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-display font-bold leading-snug"
            style={{ color: "var(--text)" }}
          >
            {t("home_title")}
          </h1>
          <p className="text-[14px] mt-3 max-w-2xl" style={{ color: "var(--text-muted)" }}>
            {t("home_sub")}
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold focus-ring"
              style={{ background: "var(--accent)", color: "white" }}
            >
              <MessageCircle size={16} />
              {t("home_cta_chat")}
            </Link>
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border focus-ring"
              style={{ borderColor: "var(--card-border)", color: "var(--text)" }}
            >
              <FileText size={16} />
              {t("home_cta_docs")}
            </Link>
          </div>
        </div>
        <img
          src={heroImg}
          alt=""
          className="hidden sm:block w-40 h-40 object-contain justify-self-center"
        />
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {error ? (
          <div
            className="card px-5 py-4 col-span-2 text-[13px]"
            style={{ background: "var(--red-soft)", color: "var(--red)" }}
          >
            Backend unreachable: {error} — start it with `uvicorn main:app --reload` in the
            backend folder.
          </div>
        ) : health ? (
          <>
            <MetricCard label={t("metric_docs")} value={health.n_docs} />
            <MetricCard label={t("metric_chunks")} value={health.n_chunks} />
          </>
        ) : (
          <div className="card px-5 py-4 col-span-2 flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={15} className="animate-spin" /> {t("common_loading")}
          </div>
        )}
      </div>

      {/* day timeline motif */}
      <div className="card px-5 py-4">
        <TimeOfDayBar />
      </div>

      {/* start here */}
      <div>
        <h2 className="text-lg font-display font-bold" style={{ color: "var(--text)" }}>
          {t("start_here")}
        </h2>
        <p className="text-[13px] mb-4" style={{ color: "var(--text-muted)" }}>
          {t("start_here_sub")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ to, icon: Icon, title, cap }) => (
            <Link key={to} to={to} className="card px-5 py-4 block focus-ring hover:opacity-95">
              <div className="flex items-center gap-2 mb-2" style={{ color: "var(--accent)" }}>
                <Icon size={17} />
                <span className="font-semibold text-[14px]" style={{ color: "var(--text)" }}>
                  {title}
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {cap}
              </p>
              <span
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold mt-3"
                style={{ color: "var(--accent)" }}
              >
                {t("open_page")} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* how RAG works */}
      <div className="card px-5 py-4 flex gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <BookOpen size={18} />
        </div>
        <div>
          <h3 className="font-display font-bold text-[15px]" style={{ color: "var(--text)" }}>
            {t("rag_heading")}
          </h3>
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {t("rag_text")}
          </p>
        </div>
      </div>
    </div>
  );
}
