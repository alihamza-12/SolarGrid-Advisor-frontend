import { useState } from "react";
import { Plug, Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { useLLM } from "../theme/LLMContext";
import { api, OFFLINE_PROVIDER, type HealthResponse } from "../api/client";

export default function LLMSettingsPanel({ providers }: { providers: HealthResponse["llm_providers"] | null }) {
  const { t } = useI18n();
  const { llm, setLLM } = useLLM();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const providerNames = providers ? Object.keys(providers) : [OFFLINE_PROVIDER];
  const isOffline = llm.provider.includes("Offline");

  const onProviderChange = (name: string) => {
    const info = providers?.[name];
    setLLM({
      provider: name,
      base_url: info?.base ?? "",
      model: info?.model ?? "",
    });
    setTestResult(null);
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testLLM(llm);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || "Request failed" });
    } finally {
      setTesting(false);
    }
  };

  const fieldCls =
    "w-full rounded-lg px-3 py-2 text-[13px] border focus-ring outline-none";
  const fieldStyle = { background: "var(--bg-2)", borderColor: "var(--card-border)", color: "var(--text)" };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
          {t("provider_label")}
        </label>
        <select
          value={llm.provider}
          onChange={(e) => onProviderChange(e.target.value)}
          className={fieldCls}
          style={fieldStyle}
        >
          {providerNames.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {!isOffline && (
        <>
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              {t("base_url_label")}
            </label>
            <input
              value={llm.base_url}
              onChange={(e) => setLLM({ base_url: e.target.value })}
              placeholder={providers?.[llm.provider]?.hint}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              {t("api_key_label")}
            </label>
            <input
              type="password"
              value={llm.api_key}
              onChange={(e) => setLLM({ api_key: e.target.value })}
              className={fieldCls}
              style={fieldStyle}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              {t("model_name_label")}
            </label>
            <input
              value={llm.model}
              onChange={(e) => setLLM({ model: e.target.value })}
              className={fieldCls}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              {t("temperature_label")}: {llm.temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={llm.temperature}
              onChange={(e) => setLLM({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </div>
          <button
            onClick={test}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium border focus-ring hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "var(--card-border)", color: "var(--text)" }}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
            {t("test_connection")}
          </button>
          {testResult && (
            <div
              className="text-[12.5px] px-3 py-2 rounded-lg"
              style={{
                background: testResult.ok ? "var(--green-soft)" : "var(--red-soft)",
                color: testResult.ok ? "var(--green)" : "var(--red)",
              }}
            >
              {testResult.ok ? t("connected") : testResult.message || t("not_connected")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
