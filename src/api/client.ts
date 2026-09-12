// Local dev uses the Vite proxy ("/api"); production uses VITE_API_URL,
// e.g. VITE_API_URL=https://solargrid-backend.up.railway.app
const API_ROOT = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
const BASE = API_ROOT ? `${API_ROOT}/api` : "/api";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.detail || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export interface LLMConfig {
  provider: string;
  base_url: string;
  api_key: string;
  model: string;
  temperature: number;
}

export const OFFLINE_PROVIDER = "Offline (no LLM — retrieval only)";

// Default LLM: Groq with gpt-oss-120b pre-selected — the user only pastes an
// API key and chats. (Must match the provider name in backend core/config.py.)
export const GROQ_PROVIDER = "Groq (free, recommended)";
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_MODEL = "openai/gpt-oss-120b";

export const defaultLLMConfig: LLMConfig = {
  provider: GROQ_PROVIDER,
  base_url: GROQ_BASE_URL,
  api_key: "",
  model: GROQ_MODEL,
  temperature: 0.2,
};

export interface HealthResponse {
  ok: boolean;
  n_docs: number;
  n_chunks: number;
  ocr_available: boolean;
  discos: string[];
  doc_types: string[];
  emb_models: string[];
  llm_providers: Record<string, { base: string; model: string; hint?: string }>;
}

export const api = {
  health: () => fetch(`${BASE}/health`).then((r) => j<HealthResponse>(r)),

  testLLM: (cfg: LLMConfig) =>
    fetch(`${BASE}/llm/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    }).then((r) => j<{ ok: boolean; message: string }>(r)),

  rates: () => fetch(`${BASE}/rates`).then((r) => j<Record<string, any>>(r)),

  updateRate: (disco: string, rate: { peak: number; offpeak: number; fixed: number; buyback: number }) =>
    fetch(`${BASE}/rates/${encodeURIComponent(disco)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rate),
    }).then((r) => j<any>(r)),

  dashboardCalc: (body: {
    disco: string;
    units: number;
    peak_share: number;
    shift: number;
    solar_kwp: number;
    sun_hours: number;
    self_use_share: number;
  }) =>
    fetch(`${BASE}/dashboard/calc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => j<{ rates: any; result: any }>(r)),

  solarCalc: (body: {
    disco: string;
    daily_kwh: number;
    sun_hours: number;
    peak_load_kw: number;
    battery_kwh: number;
    cost_per_kwp: number;
    save_share: number;
    export_share: number;
  }) =>
    fetch(`${BASE}/solar/calc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => j<any>(r)),

  solarPlan: (body: {
    disco: string;
    monthly_units: number;
    solar_kwp: number;
    battery_kwh: number;
    appliances: string[];
    peak_appliances: string[];
    avg_monthly_bill: number;
    use_llm: boolean;
    llm: LLMConfig;
  }) =>
    fetch(`${BASE}/solar/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => j<{ rows: any[]; llm_plan: string | null; quick_estimate: number | null }>(r)),

  documentsList: () => fetch(`${BASE}/documents`).then((r) => j<any>(r)),

  documentPreview: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/documents/preview`, { method: "POST", body: fd }).then((r) => j<any>(r));
  },

  documentUpload: (file: File, meta: Record<string, string>) => {
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(meta).forEach(([k, v]) => fd.append(k, v));
    return fetch(`${BASE}/documents/upload`, { method: "POST", body: fd }).then((r) => j<any>(r));
  },

  documentUpdate: (id: string, upd: Record<string, string>) =>
    fetch(`${BASE}/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upd),
    }).then((r) => j<any>(r)),

  documentDelete: (id: string) => fetch(`${BASE}/documents/${id}`, { method: "DELETE" }).then((r) => j<any>(r)),

  documentsRebuild: () => fetch(`${BASE}/documents/rebuild`, { method: "POST" }).then((r) => j<any>(r)),

  chat: (body: {
    question: string;
    discos: string[];
    statuses: string[];
    min_effective: string;
    latest_only: boolean;
    top_k: number;
    vector: boolean;
    bm25: boolean;
    rewrite: boolean;
    rerank: boolean;
    memory_enabled: boolean;
    history: { role: string; text: string }[];
    llm: LLMConfig;
  }) =>
    fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => j<any>(r)),

  billsExtract: (file: File, use_llm: boolean, llm: LLMConfig) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("use_llm", String(use_llm));
    fd.append("provider", llm.provider);
    fd.append("base_url", llm.base_url);
    fd.append("api_key", llm.api_key);
    fd.append("model", llm.model);
    return fetch(`${BASE}/bills/extract`, { method: "POST", body: fd }).then((r) => j<any>(r));
  },

  billsSave: (bill_id: string, filename: string, fields: Record<string, any>) =>
    fetch(`${BASE}/bills/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bill_id, filename, fields }),
    }).then((r) => j<any>(r)),

  billsHistory: () => fetch(`${BASE}/bills/history`).then((r) => j<{ bills: any[] }>(r)),

  billsClear: () => fetch(`${BASE}/bills/history`, { method: "DELETE" }).then((r) => j<any>(r)),
};
