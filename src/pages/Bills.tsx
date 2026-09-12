import { useEffect, useRef, useState } from "react";
import { History, Lightbulb, Loader2, Receipt, Save, Trash2, Upload, X } from "lucide-react";
import { useI18n } from "../i18n";
import { useLLM } from "../theme/LLMContext";
import { api, type HealthResponse } from "../api/client";
import { SectionTitle } from "../components/Shared";
import { ErrorBanner, Field, SuccessBanner, Toggle, fieldCls, fieldStyle } from "../components/Forms";

interface ExtractResult {
  bill_id: string;
  filename: string;
  fields: Record<string, string | number | null>;
  insights: string[];
  raw_text_preview: string;
  llm_used?: boolean;
  llm_note?: string | null;
  total_fields?: number;
}

interface SavedBill {
  id: string;
  name: string;
  fields: Record<string, string | number | null>;
  ts: string;
}

export default function Bills() {
  const { t } = useI18n();
  const { llm } = useLLM();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [useLlm, setUseLlm] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [history, setHistory] = useState<SavedBill[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const maxMb = (health as (HealthResponse & { max_pdf_mb?: number }) | null)?.max_pdf_mb ?? 50;

  const loadHistory = async () => {
    try {
      const res = await api.billsHistory();
      setHistory(res.bills ?? []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    api.health().then(setHealth).catch(() => undefined);
    void loadHistory();
  }, []);

  const onPickFile = (f: File | null) => {
    setError("");
    setNotice("");
    setResult(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!/\.pdf$/i.test(f.name)) {
      setError(`“${f.name}” is not a PDF file — only .pdf uploads are supported.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (f.size > maxMb * 1024 * 1024) {
      setError(`“${f.name}” is ${(f.size / 1024 / 1024).toFixed(1)} MB — the limit is ${maxMb} MB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(f);
  };

  const extract = async () => {
    if (!file || extracting) return;
    setError("");
    setNotice("");
    setResult(null);
    setExtracting(true);
    try {
      const res: ExtractResult = await api.billsExtract(file, useLlm, llm);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setExtracting(false);
    }
  };

  const save = async () => {
    if (!result) return;
    try {
      await api.billsSave(result.bill_id, result.filename, result.fields);
      setNotice("Bill saved to history.");
      await loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  };

  const clear = async () => {
    try {
      await api.billsClear();
      setHistory([]);
      setConfirmClear(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  };

  const fieldEntries = result ? Object.entries(result.fields) : [];
  const foundCount = fieldEntries.filter(([, v]) => v !== null && v !== undefined).length;

  return (
    <div className="pb-16 md:pb-0 space-y-5">
      <SectionTitle icon={<Receipt size={18} />} title={t("bills_title")} />
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} />

      <div className="card px-5 py-5 space-y-4">
        <Field label={`${t("bills_upload")} (PDF, ≤ ${maxMb} MB)`}>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className={`${fieldCls} file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold`}
              style={{ ...fieldStyle, color: "var(--text-muted)" }}
            />
            {file && (
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="px-3 rounded-lg border focus-ring shrink-0"
                style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}
                title="Clear"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </Field>
        <Toggle label={t("bills_use_llm")} checked={useLlm} onChange={setUseLlm} />
        <button
          onClick={() => void extract()}
          disabled={!file || extracting}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold focus-ring disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {extracting ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {extracting ? t("common_loading") : t("bills_upload")}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="card px-5 py-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="font-display font-bold text-[15px]" style={{ color: "var(--text)" }}>
                {t("bills_extracted")} ({foundCount}/{result.total_fields ?? 11})
              </h3>
              <button
                onClick={() => void save()}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold focus-ring"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <Save size={13} /> {t("bills_save")}
              </button>
            </div>
            {fieldEntries.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                {t("bills_no_fields")}
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {fieldEntries.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 rounded-lg px-3 py-2 text-[13px] border" style={{ borderColor: "var(--card-border)", background: "var(--bg-2)" }}>
                    <span style={{ color: "var(--text-muted)" }}>{k}</span>
                    {v === null || v === undefined ? (
                      <span title="Not found on this bill" style={{ color: "var(--text-muted)" }}>—</span>
                    ) : (
                      <b style={{ color: "var(--text)" }}>
                        {typeof v === "number" ? v.toLocaleString("en-US") : v}
                      </b>
                    )}
                  </div>
                ))}
              </div>
            )}
            {result.llm_note && (
              <p className="text-[12.5px] mt-2" style={{ color: "var(--amber)" }}>
                {result.llm_note}
              </p>
            )}
          </div>

          {result.insights.length > 0 && (
            <div className="card px-5 py-5">
              <h3 className="font-display font-bold text-[15px] mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <Lightbulb size={16} style={{ color: "var(--amber)" }} /> {t("bills_insights")}
              </h3>
              <ul className="space-y-2 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {result.insights.map((ins, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: "var(--accent)" }}>•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="card px-5 py-4">
            <summary className="text-[13px] font-medium cursor-pointer" style={{ color: "var(--text-muted)" }}>
              {t("bills_raw_text")}
            </summary>
            <pre className="mt-2 text-[11.5px] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto rounded-lg p-3" style={{ background: "var(--bg-2)", color: "var(--text-muted)" }}>
              {result.raw_text_preview}
            </pre>
          </details>
        </div>
      )}

      <div className="card px-5 py-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-display font-bold text-[15px] flex items-center gap-2" style={{ color: "var(--text)" }}>
            <History size={16} /> {t("bills_history")} ({history.length})
          </h3>
          {confirmClear ? (
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <span style={{ color: "var(--red)" }}>{t("common_confirm_delete")}</span>
              <button onClick={() => void clear()} className="px-2 py-1 rounded-lg font-semibold" style={{ background: "var(--red-soft)", color: "var(--red)" }}>
                {t("common_delete")}
              </button>
              <button onClick={() => setConfirmClear(false)} className="px-2 py-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                {t("common_cancel")}
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={history.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] border focus-ring disabled:opacity-50"
              style={{ borderColor: "var(--card-border)", color: "var(--red)" }}
            >
              <Trash2 size={13} /> {t("bills_clear")}
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{t("bills_empty")}</p>
        ) : (
          <div className="space-y-2">
            {history.map((b) => (
              <details key={b.id + b.ts} className="rounded-xl border px-4 py-2.5" style={{ borderColor: "var(--card-border)", background: "var(--bg-2)" }}>
                <summary className="text-[13px] font-medium cursor-pointer" style={{ color: "var(--text)" }}>
                  {b.name} <span style={{ color: "var(--text-muted)" }}>· {b.ts}</span>
                </summary>
                <div className="grid sm:grid-cols-2 gap-1.5 mt-2">
                  {Object.entries(b.fields ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 text-[12.5px]">
                      <span style={{ color: "var(--text-muted)" }}>{k}</span>
                      {v === null || v === undefined ? <span title="Not found on this bill" style={{ color: "var(--text-muted)" }}>—</span> : <b style={{ color: "var(--text)" }}>{typeof v === "number" ? v.toLocaleString("en-US") : v}</b>}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
