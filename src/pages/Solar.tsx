import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Sparkles, Zap } from "lucide-react";
import { useI18n } from "../i18n";
import { useLLM } from "../theme/LLMContext";
import { api, type HealthResponse } from "../api/client";
import { MetricCard, SectionTitle, TimeOfDayBar } from "../components/Shared";
import { ErrorBanner, Field, SliderRow, Toggle, fieldCls, fieldStyle, fmtNum, fmtRs, mutedStyle, renderRich } from "../components/Forms";

interface CalcOut {
  kwp: number;
  inverter_kw: number;
  backup_hours: number;
  monthly_generation_kwh: number;
  system_cost: number;
  monthly_saving: number;
  payback_years: number | null;
  self_use_value: number;
  export_value: number;
}

interface PlanRow {
  window: string;
  period: string;
  action: string;
  why: string;
}

const APPLIANCES = [
  "Air conditioner", "Water heater", "Washing machine", "Iron",
  "Microwave / Oven", "Water pump", "Room heater", "EV charging",
];

export default function Solar() {
  const { t } = useI18n();
  const { llm } = useLLM();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [disco, setDisco] = useState("LESCO");
  const [error, setError] = useState("");

  // sizing
  const [dailyKwh, setDailyKwh] = useState(20);
  const [sunHours, setSunHours] = useState(4.5);
  const [peakLoad, setPeakLoad] = useState(6);
  const [battery, setBattery] = useState(10);
  const [costPerKwp, setCostPerKwp] = useState(150000);
  const [saveShare, setSaveShare] = useState(0.6);
  const [exportShare, setExportShare] = useState(0.2);
  const [calc, setCalc] = useState<CalcOut | null>(null);
  const [calculating, setCalculating] = useState(false);

  // plan
  const [monthlyUnits, setMonthlyUnits] = useState(640);
  const [planKwp, setPlanKwp] = useState(5);
  const [planBatt, setPlanBatt] = useState(10);
  const [appliances, setAppliances] = useState<string[]>(["Air conditioner", "Water heater", "Washing machine"]);
  const [peakAppliances, setPeakAppliances] = useState<string[]>(["Water heater"]);
  const [avgBill, setAvgBill] = useState(18000);
  const [useLlm, setUseLlm] = useState(false);
  const [planRows, setPlanRows] = useState<PlanRow[] | null>(null);
  const [llmPlan, setLlmPlan] = useState<string | null>(null);
  const [quickEstimate, setQuickEstimate] = useState<number | null>(null);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    api.health().then(setHealth).catch(() => undefined);
  }, []);

  useEffect(() => {
    setCalculating(true);
    const id = setTimeout(() => {
      api
        .solarCalc({
          disco, daily_kwh: dailyKwh, sun_hours: sunHours, peak_load_kw: peakLoad,
          battery_kwh: battery, cost_per_kwp: costPerKwp, save_share: saveShare, export_share: exportShare,
        })
        .then((res) => {
          setCalc(res);
          setError("");
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"))
        .finally(() => setCalculating(false));
    }, 350);
    return () => clearTimeout(id);
  }, [disco, dailyKwh, sunHours, peakLoad, battery, costPerKwp, saveShare, exportShare]);

  const toggleIn = (list: string[], v: string, set: (l: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const generate = async () => {
    setPlanning(true);
    setError("");
    try {
      const res = await api.solarPlan({
        disco, monthly_units: monthlyUnits, solar_kwp: planKwp, battery_kwh: planBatt,
        appliances, peak_appliances: peakAppliances, avg_monthly_bill: avgBill, use_llm: useLlm, llm,
      });
      setPlanRows(res.rows);
      setLlmPlan(res.llm_plan);
      setQuickEstimate(res.quick_estimate);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="pb-16 md:pb-0 space-y-5">
      <SectionTitle icon={<Zap size={18} />} title={t("solar_title")} />
      <ErrorBanner message={error} />

      <div className="card px-5 py-4 max-w-xs">
        <Field label={t("dash_your_disco")}>
          <select value={disco} onChange={(e) => setDisco(e.target.value)} className={fieldCls} style={fieldStyle}>
            {(health?.discos ?? ["LESCO"]).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* sizing */}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <div className="card px-5 py-5 space-y-4">
          <h3 className="font-display font-bold text-[15px]" style={{ color: "var(--text)" }}>
            {t("solar_sizing")}
          </h3>
          <SliderRow label={t("solar_daily_load")} value={dailyKwh} min={2} max={100} step={1} display={`${fmtNum(dailyKwh)} kWh`} onChange={setDailyKwh} />
          <SliderRow label={t("solar_sun_hours")} value={sunHours} min={2} max={7} step={0.1} display={fmtNum(sunHours, 1)} onChange={setSunHours} />
          <SliderRow label={t("solar_peak_load")} value={peakLoad} min={0.5} max={25} step={0.5} display={`${fmtNum(peakLoad, 1)} kW`} onChange={setPeakLoad} />
          <SliderRow label={t("solar_battery")} value={battery} min={0} max={50} step={1} display={`${fmtNum(battery)} kWh`} onChange={setBattery} />

          <h3 className="font-display font-bold text-[15px] pt-2" style={{ color: "var(--text)" }}>
            {t("solar_economics")}
          </h3>
          <SliderRow label={t("solar_cost_per_kwp")} value={costPerKwp} min={80000} max={250000} step={5000} display={fmtRs(costPerKwp)} onChange={setCostPerKwp} />
          <SliderRow label={t("solar_save_share")} value={saveShare} min={0.1} max={1} step={0.05} display={`${Math.round(saveShare * 100)}%`} onChange={setSaveShare} />
          <SliderRow label={t("solar_export_share")} value={exportShare} min={0} max={0.8} step={0.05} display={`${Math.round(exportShare * 100)}%`} onChange={setExportShare} />
        </div>

        <div className="space-y-4">
          <div className="card px-5 py-4">
            <TimeOfDayBar compact />
          </div>
          {!calc ? (
            <div className="card px-5 py-6 flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={15} className="animate-spin" /> {t("common_loading")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label={t("solar_recommended_panels")} value={`${fmtNum(calc.kwp, 1)} kWp`} hint={calculating ? "…" : undefined} />
              <MetricCard label={t("solar_inverter")} value={`${fmtNum(calc.inverter_kw, 1)} kW`} />
              <MetricCard label={t("solar_backup")} value={battery > 0 ? `${fmtNum(calc.backup_hours, 1)} h` : "—"} hint={`${fmtNum(battery)} kWh`} />
              <MetricCard label={t("solar_monthly_gen")} value={`${fmtNum(calc.monthly_generation_kwh)} u`} />
              <MetricCard label={t("solar_system_cost")} value={fmtRs(calc.system_cost)} />
              <MetricCard label={t("solar_monthly_saving")} value={fmtRs(calc.monthly_saving)} hint={`self ${fmtRs(calc.self_use_value)} · export ${fmtRs(calc.export_value)}`} />
              <div className="col-span-2">
                <MetricCard
                  label={t("solar_payback")}
                  value={calc.payback_years === null ? "∞" : `${fmtNum(calc.payback_years, 1)} yrs`}
                  hint={calc.payback_years === null ? "savings too low" : undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* personalized plan */}
      <div className="card px-5 py-5 space-y-4">
        <h3 className="font-display font-bold text-[15px]" style={{ color: "var(--text)" }}>
          {t("solar_plan_title")}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label={t("solar_plan_units")}>
            <input type="number" value={monthlyUnits} onChange={(e) => setMonthlyUnits(parseFloat(e.target.value) || 0)} className={fieldCls} style={fieldStyle} />
          </Field>
          <Field label={t("dash_solar_kwp")}>
            <input type="number" step="0.5" value={planKwp} onChange={(e) => setPlanKwp(parseFloat(e.target.value) || 0)} className={fieldCls} style={fieldStyle} />
          </Field>
          <Field label={t("solar_battery")}>
            <input type="number" value={planBatt} onChange={(e) => setPlanBatt(parseFloat(e.target.value) || 0)} className={fieldCls} style={fieldStyle} />
          </Field>
          <Field label={t("solar_plan_avg_bill")}>
            <input type="number" value={avgBill} onChange={(e) => setAvgBill(parseFloat(e.target.value) || 0)} className={fieldCls} style={fieldStyle} />
          </Field>
        </div>
        <div>
          <div className="text-[12px] font-medium mb-1.5" style={mutedStyle}>{t("solar_plan_appliances")}</div>
          <div className="flex flex-wrap gap-1.5">
            {APPLIANCES.map((a) => (
              <button
                key={a}
                onClick={() => toggleIn(appliances, a, setAppliances)}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium border focus-ring"
                style={appliances.includes(a)
                  ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" }
                  : { color: "var(--text-muted)", borderColor: "var(--card-border)" }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[12px] font-medium mb-1.5" style={mutedStyle}>{t("solar_plan_peak_appliances")}</div>
          <div className="flex flex-wrap gap-1.5">
            {appliances.map((a) => (
              <button
                key={a}
                onClick={() => toggleIn(peakAppliances, a, setPeakAppliances)}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium border focus-ring"
                style={peakAppliances.includes(a)
                  ? { background: "var(--amber-soft)", color: "var(--amber)", borderColor: "var(--amber)" }
                  : { color: "var(--text-muted)", borderColor: "var(--card-border)" }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <Toggle label={t("solar_plan_llm")} checked={useLlm} onChange={setUseLlm} />
        <button
          onClick={() => void generate()}
          disabled={planning}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold focus-ring disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {planning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {t("solar_plan_generate")}
        </button>

        {planRows && (
          <div className="pt-2">
            <h4 className="font-display font-bold text-[14px] mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <CalendarDays size={15} /> {t("solar_plan_schedule")}
              {quickEstimate !== null && quickEstimate > 0 && (
                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                  ≈ {fmtRs(quickEstimate)}/mo
                </span>
              )}
            </h4>
            <div className="space-y-2">
              {planRows.map((r, i) => (
                <div key={i} className="rounded-xl border px-4 py-3 grid sm:grid-cols-[150px_1fr] gap-1 sm:gap-3" style={{ borderColor: "var(--card-border)", background: "var(--bg-2)" }}>
                  <div>
                    <div className="text-[12.5px] font-bold" style={{ color: "var(--text)" }}>{r.window}</div>
                    <div
                      className="text-[11px] font-semibold"
                      style={{ color: r.period.toLowerCase().includes("peak") && !r.period.toLowerCase().includes("off") ? "var(--amber)" : "var(--green)" }}
                    >
                      {r.period}
                    </div>
                  </div>
                  <div className="text-[12.5px] leading-relaxed">
                    <div style={{ color: "var(--text)" }}>{r.action}</div>
                    <div style={{ color: "var(--text-muted)" }}>{r.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {llmPlan && (
          <div className="rounded-xl border px-4 py-3 text-[13px] leading-relaxed" style={{ borderColor: "var(--card-border)", background: "var(--bg-2)", color: "var(--text)" }}>
            {renderRich(llmPlan)}
          </div>
        )}
      </div>
    </div>
  );
}
