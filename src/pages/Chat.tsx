import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ChevronDown, Loader2, MessageCircle, Send, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { useI18n } from "../i18n";
import { useLLM } from "../theme/LLMContext";
import { api, type HealthResponse } from "../api/client";
import { ConfidenceChip, SectionTitle } from "../components/Shared";
import LLMSettingsPanel from "../components/LLMSettingsPanel";
import { ErrorBanner, SliderRow, Toggle, fieldCls, fieldStyle, mutedStyle, renderRich } from "../components/Forms";

interface Source {
  doc_title: string;
  disco: string;
  page: number;
  effective_date: string;
  text: string;
  score: number;
}

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  confidence?: { score: number; label: string };
  verified?: boolean;
  rewritten?: string[] | null;
}

export default function Chat() {
  const { t } = useI18n();
  const { llm } = useLLM();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [openSrc, setOpenSrc] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // search options
  const [discosSel, setDiscosSel] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["official"]);
  const [latestOnly, setLatestOnly] = useState(true);
  const [topK, setTopK] = useState(5);
  const [vector, setVector] = useState(true);
  const [bm25, setBm25] = useState(true);
  const [rewrite, setRewrite] = useState(false);
  const [rerank, setRerank] = useState(false);
  const [memory, setMemory] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = (t("chat_suggestions") as string[]) ?? [];

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const toggleIn = (list: string[], v: string, set: (l: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const send = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || sending) return;
    setInput("");
    setError("");
    setOpenSrc(null);
    const next: Msg[] = [...messages, { role: "user", text: question }];
    setMessages(next);
    setSending(true);
    try {
      const res = await api.chat({
        question,
        discos: discosSel,
        statuses,
        min_effective: "",
        latest_only: latestOnly,
        top_k: topK,
        vector,
        bm25,
        rewrite,
        rerank,
        memory_enabled: memory,
        history: next.map((m) => ({ role: m.role, text: m.text })),
        llm,
      });
      setMessages([
        ...next,
        {
          role: "assistant",
          text: res.answer,
          sources: res.sources,
          confidence: res.confidence,
          verified: res.verified,
          rewritten: res.rewritten,
        },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
      setMessages(next);
    } finally {
      setSending(false);
    }
  };

  const settingsPanel = (
    <div className="space-y-5">
      <div className="card px-4 py-4">
        <h3 className="text-[13.5px] font-bold mb-3" style={{ color: "var(--text)" }}>
          {t("model_settings")}
        </h3>
        <LLMSettingsPanel providers={health?.llm_providers ?? null} />
      </div>
      <div className="card px-4 py-4 space-y-3">
        <h3 className="text-[13.5px] font-bold" style={{ color: "var(--text)" }}>
          {t("rag_options")}
        </h3>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={mutedStyle}>
            {t("disco_filter")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(health?.discos ?? []).map((d) => (
              <button
                key={d}
                onClick={() => toggleIn(discosSel, d, setDiscosSel)}
                className="px-2.5 py-1 rounded-full text-[11.5px] font-medium border focus-ring"
                style={
                  discosSel.includes(d)
                    ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" }
                    : { color: "var(--text-muted)", borderColor: "var(--card-border)" }
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={mutedStyle}>
            {t("include_status")}
          </label>
          <div className="flex gap-4">
            <Toggle label={t("official")} checked={statuses.includes("official")} onChange={() => toggleIn(statuses, "official", setStatuses)} />
            <Toggle label={t("archived")} checked={statuses.includes("archived")} onChange={() => toggleIn(statuses, "archived", setStatuses)} />
          </div>
        </div>
        <Toggle label={t("latest_only")} checked={latestOnly} onChange={setLatestOnly} />
        <SliderRow label={t("top_k")} value={topK} min={1} max={12} step={1} display={String(topK)} onChange={setTopK} />
        <Toggle label={t("vector_search")} checked={vector} onChange={setVector} />
        <Toggle label={t("keyword_search")} checked={bm25} onChange={setBm25} />
        <details className="pt-1">
          <summary className="text-[12.5px] font-medium cursor-pointer" style={{ color: "var(--text-muted)" }}>
            {t("advanced_options")}
          </summary>
          <div className="space-y-2 mt-2">
            <Toggle label={t("query_rewrite")} checked={rewrite} onChange={setRewrite} />
            <Toggle label={t("reranking")} checked={rerank} onChange={setRerank} />
            <Toggle label={t("conversation_memory")} checked={memory} onChange={setMemory} />
          </div>
        </details>
      </div>
    </div>
  );

  return (
    <div className="pb-16 md:pb-0">
      <SectionTitle icon={<MessageCircle size={18} />} title={t("chat_title")} />
      {health && health.n_docs === 0 && (
        <div
          className="flex gap-2 items-start text-[13px] px-4 py-3 rounded-xl mb-4"
          style={{ background: "var(--amber-soft)", color: "var(--amber)" }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            {t("chat_empty_docs")}{" "}
            <Link to="/documents" className="underline font-semibold">
              {t("nav_documents")}
            </Link>
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start">
        <div className="card flex flex-col overflow-hidden" style={{ minHeight: 480 }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: 560 }}>
            {/* welcome */}
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <Sparkles size={15} />
              </div>
              <div className="rounded-2xl rounded-tl-md px-4 py-3 text-[13.5px] leading-relaxed max-w-[85%]" style={{ background: "var(--bg-2)", color: "var(--text)" }}>
                {t("chat_welcome")}
                {messages.length === 0 && (
                  <div className="mt-3">
                    <div className="text-[12px] font-medium mb-1.5" style={mutedStyle}>{t("chat_try")}:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => void send(s)}
                          className="px-2.5 py-1 rounded-full text-[12px] border focus-ring hover:opacity-80"
                          style={{ borderColor: "var(--card-border)", color: "var(--accent)" }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] max-w-[85%]" style={{ background: "var(--accent)", color: "white" }}>
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Sparkles size={15} />
                  </div>
                  <div className="rounded-2xl rounded-tl-md px-4 py-3 text-[13.5px] leading-relaxed max-w-[85%] space-y-2" style={{ background: "var(--bg-2)", color: "var(--text)" }}>
                    <div>{renderRich(m.text)}</div>
                    {m.confidence && (
                      <div>
                        <ConfidenceChip score={m.confidence.score} label={m.confidence.label} verified={m.verified} />
                      </div>
                    )}
                    {!!m.sources?.length && (
                      <div>
                        <button
                          onClick={() => setOpenSrc(openSrc === i ? null : i)}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold focus-ring"
                          style={{ color: "var(--accent)" }}
                        >
                          <ChevronDown size={13} className={openSrc === i ? "rotate-180" : ""} />
                          {m.sources.length} {t("chat_sources")}
                        </button>
                        {openSrc === i && (
                          <div className="space-y-2 mt-2">
                            {m.sources.map((s, j) => (
                              <div key={j} className="rounded-lg px-3 py-2 text-[12px] border" style={{ borderColor: "var(--card-border)", background: "var(--card)" }}>
                                <div className="font-semibold" style={{ color: "var(--text)" }}>
                                  [{j + 1}] {s.doc_title} <span style={mutedStyle}>· {s.disco} · p.{s.page}{s.effective_date ? ` · ${s.effective_date}` : ""}</span>
                                </div>
                                <p className="mt-1 leading-relaxed" style={mutedStyle}>{s.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <Loader2 size={15} className="animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-md px-4 py-3 text-[13px]" style={{ background: "var(--bg-2)", color: "var(--text-muted)" }}>
                  {t("common_loading")}
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: "var(--card-border)" }}>
            <ErrorBanner message={error} />
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={t("chat_placeholder") as string}
                rows={1}
                className={`${fieldCls} resize-none`}
                style={{ ...fieldStyle, minHeight: 42 }}
              />
              <button
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="rounded-xl px-4 flex items-center gap-1.5 text-sm font-semibold focus-ring disabled:opacity-50 shrink-0"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <Send size={15} />
                <span className="hidden sm:inline">{t("chat_send")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* settings: sidebar on desktop, collapsible on mobile */}
        <div className="hidden lg:block">{settingsPanel}</div>
        <div className="lg:hidden">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full card px-4 py-3 flex items-center justify-between text-[13.5px] font-semibold focus-ring"
            style={{ color: "var(--text)" }}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal size={15} /> {t("model_settings")} + {t("rag_options")}
            </span>
            <ChevronDown size={15} className={showSettings ? "rotate-180" : ""} />
          </button>
          {showSettings && <div className="mt-3">{settingsPanel}</div>}
        </div>
      </div>
    </div>
  );
}
