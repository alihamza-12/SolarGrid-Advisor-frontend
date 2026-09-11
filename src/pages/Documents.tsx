import { useEffect, useRef, useState } from "react";
import {
  CalendarDays, Check, FileText, FileUp, Loader2, Pencil, RefreshCw, Trash2, X,
} from "lucide-react";
import { useI18n } from "../i18n";
import { api, type HealthResponse } from "../api/client";
import { SectionTitle } from "../components/Shared";
import { ErrorBanner, Field, SuccessBanner, fieldCls, fieldStyle } from "../components/Forms";

interface Preview {
  filename: string;
  size_kb: number;
  n_pages: number;
  total_chars: number;
  ocr_pages: number;
  ocr_available: boolean;
  usable: boolean;
  detected_issue_date: string;
  detected_effective_date: string;
}

interface Doc {
  id: string;
  filename: string;
  title: string;
  disco: string;
  doc_type: string;
  status: string;
  issue_date: string;
  effective_date: string;
  notes: string;
  pages: number;
  ocr_pages: number;
  added: string;
  superseded?: boolean;
}

const isoDate = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? s : "");

export default function Documents() {
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [manifest, setManifest] = useState<{ updated?: string; model?: string; n?: number } | null>(null);
  const [nChunks, setNChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // upload form
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [disco, setDisco] = useState("Other");
  const [docType, setDocType] = useState("Circular / Other");
  const [status, setStatus] = useState("official");
  const [issueDate, setIssueDate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");

  // edit / delete
  const [editing, setEditing] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ issue_date: "", effective_date: "", disco: "", status: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  const maxMb = (health as (HealthResponse & { max_pdf_mb?: number }) | null)?.max_pdf_mb ?? 50;

  const refresh = async () => {
    try {
      const res = await api.documentsList();
      setDocs(res.documents ?? []);
      setManifest(res.manifest ?? null);
      setNChunks(res.n_chunks ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setHealth(await api.health());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Request failed");
      }
      await refresh();
      setLoading(false);
    })();
  }, []);

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDisco("Other");
    setDocType("Circular / Other");
    setStatus("official");
    setIssueDate("");
    setEffectiveDate("");
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickFile = async (f: File | null) => {
    setError("");
    setNotice("");
    setPreview(null);
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
    setTitle(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    setPreviewing(true);
    try {
      const p: Preview = await api.documentPreview(f);
      setPreview(p);
      if (isoDate(p.detected_issue_date)) setIssueDate(p.detected_issue_date);
      if (isoDate(p.detected_effective_date)) setEffectiveDate(p.detected_effective_date);
      if (!p.usable) {
        setError(
          p.ocr_available
            ? `“${f.name}” has almost no readable text (only ${p.total_chars} characters on ${p.n_pages} page(s)). It may be a scanned image — try a clearer scan.`
            : `“${f.name}” has almost no readable text (only ${p.total_chars} characters on ${p.n_pages} page(s)). If it is scanned, the server needs tesseract-ocr installed.`
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setPreviewing(false);
    }
  };

  const upload = async () => {
    if (!file || !preview?.usable || uploading) return;
    setError("");
    setNotice("");
    setUploading(true);
    try {
      const res = await api.documentUpload(file, {
        title,
        disco,
        doc_type: docType,
        status,
        issue_date: issueDate,
        effective_date: effectiveDate,
        notes,
      });
      setNotice(
        res.duplicate
          ? `“${res.doc.title}” was already indexed — its metadata was updated (${res.n_chunks} passages).`
          : `“${res.doc.title}” indexed successfully (${res.n_chunks} passages from ${res.doc.pages} pages).`
      );
      resetForm();
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (d: Doc) => {
    setEditing(d.id);
    setEditFields({
      issue_date: isoDate(d.issue_date),
      effective_date: isoDate(d.effective_date),
      disco: d.disco,
      status: d.status,
      notes: d.notes ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    setError("");
    try {
      await api.documentUpdate(id, { ...editFields });
      setEditing(null);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const del = async (id: string) => {
    setError("");
    try {
      await api.documentDelete(id);
      setConfirmDelete(null);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  };

  const rebuild = async () => {
    setRebuilding(true);
    setError("");
    setNotice("");
    try {
      await api.documentsRebuild();
      setNotice("Index rebuilt.");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div className="pb-16 md:pb-0 space-y-5">
      <SectionTitle icon={<FileText size={18} />} title={t("docs_title")} />

      <ErrorBanner message={error} />
      <SuccessBanner message={notice} />

      {/* upload card */}
      <div className="card px-5 py-5 space-y-4">
        <h2 className="font-display font-bold text-[15px]" style={{ color: "var(--text)" }}>
          {t("docs_add")}
        </h2>
        <Field label={`${t("docs_file")} (PDF, ≤ ${maxMb} MB)`}>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              className={`${fieldCls} file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold`}
              style={{ ...fieldStyle, color: "var(--text-muted)" }}
            />
            {file && (
              <button
                onClick={resetForm}
                className="px-3 rounded-lg border focus-ring shrink-0"
                style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}
                title="Clear"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </Field>

        {previewing && (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={15} className="animate-spin" /> {t("common_loading")}
          </div>
        )}

        {preview && (
          <div
            className="rounded-xl px-4 py-3 text-[12.5px] grid sm:grid-cols-4 gap-2 border"
            style={{ background: "var(--bg-2)", borderColor: "var(--card-border)", color: "var(--text)" }}
          >
            <span><b>{preview.n_pages}</b> pages</span>
            <span><b>{preview.total_chars.toLocaleString()}</b> characters</span>
            <span><b>{preview.size_kb.toLocaleString()}</b> KB</span>
            <span>
              {preview.ocr_pages > 0 ? (
                <span style={{ color: "var(--amber)" }}>OCR used on {preview.ocr_pages} page(s)</span>
              ) : (
                <span className="inline-flex items-center gap-1" style={{ color: "var(--green)" }}>
                  <Check size={13} /> native text
                </span>
              )}
            </span>
            {(preview.detected_issue_date || preview.detected_effective_date) && (
              <span className="sm:col-span-4 inline-flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <CalendarDays size={13} />
                detected — issue: {preview.detected_issue_date || "—"} · effective: {preview.detected_effective_date || "—"}
              </span>
            )}
          </div>
        )}

        {file && preview?.usable && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label={t("docs_doc_title")}>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} style={fieldStyle} />
                </Field>
              </div>
              <Field label={t("docs_disco")}>
                <select value={disco} onChange={(e) => setDisco(e.target.value)} className={fieldCls} style={fieldStyle}>
                  {(health?.discos ?? ["Other"]).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("docs_type")}>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className={fieldCls} style={fieldStyle}>
                  {(health?.doc_types ?? ["Circular / Other"]).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("docs_status")}>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldCls} style={fieldStyle}>
                  <option value="official">{t("official")}</option>
                  <option value="archived">{t("archived")}</option>
                </select>
              </Field>
              <Field label={t("docs_notes")}>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldCls} style={fieldStyle} />
              </Field>
              <Field label={t("docs_issue_date")}>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={fieldCls} style={fieldStyle} />
              </Field>
              <Field label={t("docs_effective_date")}>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={fieldCls} style={fieldStyle} />
              </Field>
            </div>
            <button
              onClick={() => void upload()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold focus-ring disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
              {uploading ? t("docs_uploading") : t("docs_upload")}
            </button>
          </>
        )}
      </div>

      {/* list */}
      <div className="card px-5 py-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="font-display font-bold text-[15px]" style={{ color: "var(--text)" }}>
            {t("docs_list_title")} ({docs.length} · {nChunks} passages)
          </h2>
          <button
            onClick={() => void rebuild()}
            disabled={rebuilding}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium border focus-ring disabled:opacity-60"
            style={{ borderColor: "var(--card-border)", color: "var(--text)" }}
          >
            <RefreshCw size={13} className={rebuilding ? "animate-spin" : ""} />
            {t("docs_rebuild")}
          </button>
        </div>

        {manifest?.updated && (
          <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
            {t("metric_index_updated")}: {manifest.updated}
            {manifest.model ? ` · ${t("metric_embed_model")}: ${manifest.model}` : ""}
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={15} className="animate-spin" /> {t("common_loading")}
          </div>
        ) : docs.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{t("docs_empty")}</p>
        ) : (
          <div className="space-y-2.5">
            {docs.map((d) => (
              <div key={d.id} className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--card-border)", background: "var(--bg-2)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] flex items-center gap-2 flex-wrap" style={{ color: "var(--text)" }}>
                      {d.title}
                      {d.superseded && (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>
                          {t("docs_superseded")}
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                        style={d.status === "official"
                          ? { background: "var(--green-soft)", color: "var(--green)" }
                          : { background: "var(--bg-2)", color: "var(--text-muted)" }}
                      >
                        {d.status}
                      </span>
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
                      {d.disco} · {d.doc_type} · {d.pages} pages
                      {d.effective_date ? ` · eff. ${d.effective_date}` : ""}
                      {d.ocr_pages > 0 ? ` · OCR ${d.ocr_pages}p` : ""}
                    </div>
                    {d.notes && <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{d.notes}</div>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => (editing === d.id ? setEditing(null) : startEdit(d))}
                      className="p-2 rounded-lg border focus-ring"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}
                      title={t("docs_edit") as string}
                    >
                      <Pencil size={14} />
                    </button>
                    {confirmDelete === d.id ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <span style={{ color: "var(--red)" }}>{t("common_confirm_delete")}</span>
                        <button onClick={() => void del(d.id)} className="px-2 py-1 rounded-lg font-semibold" style={{ background: "var(--red-soft)", color: "var(--red)" }}>
                          {t("common_delete")}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                          {t("common_cancel")}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(d.id)}
                        className="p-2 rounded-lg border focus-ring"
                        style={{ borderColor: "var(--card-border)", color: "var(--red)" }}
                        title={t("docs_delete") as string}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {editing === d.id && (
                  <div className="grid sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
                    <Field label={t("docs_disco")}>
                      <select value={editFields.disco} onChange={(e) => setEditFields({ ...editFields, disco: e.target.value })} className={fieldCls} style={{ ...fieldStyle, background: "var(--card)" }}>
                        {(health?.discos ?? ["Other"]).map((x) => (
                          <option key={x} value={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("docs_status")}>
                      <select value={editFields.status} onChange={(e) => setEditFields({ ...editFields, status: e.target.value })} className={fieldCls} style={{ ...fieldStyle, background: "var(--card)" }}>
                        <option value="official">{t("official")}</option>
                        <option value="archived">{t("archived")}</option>
                      </select>
                    </Field>
                    <Field label={t("docs_issue_date")}>
                      <input type="date" value={editFields.issue_date} onChange={(e) => setEditFields({ ...editFields, issue_date: e.target.value })} className={fieldCls} style={{ ...fieldStyle, background: "var(--card)" }} />
                    </Field>
                    <Field label={t("docs_effective_date")}>
                      <input type="date" value={editFields.effective_date} onChange={(e) => setEditFields({ ...editFields, effective_date: e.target.value })} className={fieldCls} style={{ ...fieldStyle, background: "var(--card)" }} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label={t("docs_notes")}>
                        <input value={editFields.notes} onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })} className={fieldCls} style={{ ...fieldStyle, background: "var(--card)" }} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2 flex gap-2">
                      <button
                        onClick={() => void saveEdit(d.id)}
                        disabled={savingEdit}
                        className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold focus-ring disabled:opacity-60"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        {t("docs_save")}
                      </button>
                      <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-[12.5px] border focus-ring" style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}>
                        {t("common_cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
