import { useEffect, useState } from "react";
import { AlertTriangle, LayoutDashboard, Loader2 } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useI18n } from "../i18n";
import { api, type HealthResponse } from "../api/client";
import { MetricCard, SectionTitle, TimeOfDayBar } from "../components/Shared";
import { ErrorBanner, Field, SliderRow, fieldCls, fieldStyle, fmtNum, fmtRs } from "../components/Forms";

interface CalcResult {
  peak_u: number;
  off_u: number;
  shifted: number;
  current: number;
  shifted_bill: number;
  savings_shift: number;
  solar_monthly: number;
  self_use: number;
  export: number;
  credit: number;
  bill_with_solar: number;
  annual_savings: number;
}

function ChartTip(props: any) {
  const { active, payload, label } = props ?? {};
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-[12px]" style={{ color: "var(--text)" }}>
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i}>
          {p.name}: <b>{fmtRs(Number(p.value))}</b>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [disco, setDisco] = useState("LESCO");
  const [rates, setRates] = useState<Record<string, any>>({});
  const [rateEdits, setRateEdits] = useState({ peak: 38.5, offpeak: 25.5, fixed: 300, buyback: 0.85 });
  const [savingRates, setSavingRates] = useState(false);
  const [units, setUnits] = useState(640);
  const [peakShare, setPeakShare] = useState(0.25);
  const [shift, setShift] = useState(0.4);
  const [solarKwp, setSolarKwp] = useState(5);
  const [sunHours, setSunHours] = useState(4.5);
  const [selfUse, setSelfUse] = useState(0.7);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [calcRates, setCalcRates] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.health().then(setHealth).catch(() => undefined);
    api
      .rates()
      .then((r) => {
        setRates(r);
        const d = r[disco] ?? Object.values(r)[0];
        if (d) setRateEdits({ peak: d.peak, offpeak: d.offpeak, fixed: d.fixed, buyback: d.buyback });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = rates[disco];
    if (d) setRateEdits({ peak: d.peak, offpeak: d.offpeak, fixed: d.fixed, buyback: d.buyback });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disco]);

  useEffect(() => {
    setCalculating(true);
    const id = setTimeout(() => {
      api
        .dashboardCalc({
          disco, units, peak_share: peakShare, shift,
          solar_kwp: solarKwp, sun_hours: sunHours, self_use_share: selfUse,
        })
        .then((res) => {
          setResult(res.result);
          setCalcRates(res.rates);
          setError("");
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"))
        .finally(() => setCalculating(false));
    }, 350);
    return () => clearTimeout(id);
  }, [disco, units, peakShare, shift, solarKwp, sunHours, selfUse]);

  const saveRates = async () => {
    setSavingRates(true);
    setError("");
    try {
      const res = await api.updateRate(disco, rateEdits);
      setRates({ ...rates, [disco]: res.rate });
      setCalcRates(res.rate);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSavingRates(false);
    }
  };

  const chartData = result
    ? [
        { name: t("dash_current_bill") as string, bill: Math.round(result.current), fill: "#f59e0b" },
        { name: t("dash_after_shift") as string, bill: Math.round(result.shifted_bill), fill: "#2563eb" },
        { name: t("dash_with_solar") as string, bill: Math.round(result.bill_with_solar), fill: "#10b981" },
      ]
    : [];

  return (
    <div className="pb-16 md:pb-0 space-y-5">
      <SectionTitle icon={<LayoutDashboard size={18} />} title={t("dash_title")} />

      <div
        className="flex gap-2 items-start text-[12.5px] px-4 py-3 rounded-xl"
        style={{ background: "var(--amber-soft)", color: "var(--amber)" }}
      >
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        {t("dash_warning")}
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* inputs */}
        <div className="card px-5 py-5 space-y-4">
          <Field label={t("dash_your_disco")}>
            <select value={disco} onChange={(e) => setDisco(e.target.value)} className={fieldCls} style={fieldStyle}>
              {(health?.discos ?? Object.keys(rates)).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <div>
            <div className="text-[12px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>
              {t("dash_edit_rates")}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label={t("dash_peak_rate")}>
                <input type="number" step="0.01" value={rateEdits.peak} onChange={(e) => setRateEdits({ ...rateEdits, peak: parseFloat(e.target.value) || 0 })} className={fieldCls} style={fieldStyle} />
              </Field>
              <Field label={t("dash_offpeak_rate")}>
                <input type="number" step="0.01" value={rateEdits.offpeak} onChange={(e) => setRateEdits({ ...rateEdits, offpeak: parseFloat(e.target.value) || 0 })} className={fieldCls} style={fieldStyle} />
              </Field>
              <Field label={t("dash_fixed_charge")}>
                <input type="number" step="1" value={rateEdits.fixed} onChange={(e) => setRateEdits({ ...rateEdits, fixed: parseFloat(e.target.value) || 0 })} className={fieldCls} style={fieldStyle} />
              </Field>
              <Field label={t("dash_buyback_rate")}>
                <input type="number" step="0.01" value={rateEdits.buyback} onChange={(e) => setRateEdits({ ...rateEdits, buyback: parseFloat(e.target.value) || 0 })} className={fieldCls} style={fieldStyle} />
              </Field>
            </div>
            <button
              onClick={() => void saveRates()}
              disabled={savingRates}
              className="mt-2.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold border focus-ring disabled:opacity-60"
              style={{ borderColor: "var(--card-border)", color: "var(--text)" }}
            >
              {savingRates ? t("common_loading") : t("dash_save_rates")}
            </button>
          </div>

          <SliderRow label={t("dash_units")} value={units} min={50} max={3000} step={10} display={fmtNum(units)} onChange={setUnits} />
          <SliderRow label={t("dash_peak_share")} value={peakShare} min={0} max={0.8} step={0.01} display={`${Math.round(peakShare * 100)}%`} onChange={setPeakShare} />
          <SliderRow label={t("dash_shift")} value={shift} min={0} max={1} step={0.05} display={`${Math.round(shift * 100)}%`} onChange={setShift} />
          <SliderRow label={t("dash_solar_kwp")} value={solarKwp} min={0} max={25} step={0.5} display={`${fmtNum(solarKwp, 1)} kWp`} onChange={setSolarKwp} />
          <SliderRow label={t("dash_sun_hours")} value={sunHours} min={2} max={7} step={0.1} display={fmtNum(sunHours, 1)} onChange={setSunHours} />
          <SliderRow label={t("dash_self_use")} value={selfUse} min={0} max={1} step={0.05} display={`${Math.round(selfUse * 100)}%`} onChange={setSelfUse} />
        </div>

        {/* results */}
        <div className="space-y-4">
          <div className="card px-5 py-4">
            <TimeOfDayBar compact />
          </div>
          {!result ? (
            <div className="card px-5 py-6 flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={15} className="animate-spin" /> {t("common_loading")}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label={t("dash_current_bill")} value={fmtRs(result.current)} hint={calculating ? "…" : `${fmtNum(result.peak_u)} peak + ${fmtNum(result.off_u)} off-peak`} />
                <MetricCard label={t("dash_after_shift")} value={fmtRs(result.shifted_bill)} hint={`${t("dash_annual_savings")}: ${fmtRs(result.annual_savings)}`} />
                <MetricCard label={t("dash_with_solar")} value={fmtRs(result.bill_with_solar)} hint={calcRates ? `@ ${calcRates.offpeak}/u` : undefined} />
                <MetricCard label={t("dash_credit")} value={fmtRs(result.credit)} hint={`${fmtNum(result.export)} u × ${calcRates?.buyback ?? "—"}`} />
              </div>

              <div className="card px-4 py-4">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#64748b" }} interval={0} angle={-14} textAnchor="end" height={52} />
                    <YAxis tick={{ fontSize: 10.5, fill: "#64748b" }} width={64} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="bill" name="Rs" radius={[6, 6, 0, 0]}>
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card px-5 py-4">
                <h3 className="font-display font-bold text-[14px] mb-3" style={{ color: "var(--text)" }}>
                  {t("dash_solar_metering")}
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>{t("dash_monthly_gen")}</div>
                    <div className="font-bold text-[15px]" style={{ color: "var(--text)" }}>{fmtNum(result.solar_monthly)} u</div>
                  </div>
                  <div>
                    <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>{t("dash_self_consumed")}</div>
                    <div className="font-bold text-[15px]" style={{ color: "var(--green)" }}>{fmtNum(result.self_use)} u</div>
                  </div>
                  <div>
                    <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>{t("dash_exported")}</div>
                    <div className="font-bold text-[15px]" style={{ color: "var(--amber)" }}>{fmtNum(result.export)} u</div>
                  </div>
                </div>
                <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {t("dash_tip")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
