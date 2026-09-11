import type { ReactNode } from "react";

export function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card px-5 py-4">
      <div className="text-[12.5px] mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-2xl font-display font-bold" style={{ color: "var(--text)" }}>
        {value}
      </div>
      {hint && (
        <div className="text-[11.5px] mt-1" style={{ color: "var(--text-muted)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function ConfidenceChip({ score, label, verified }: { score: number; label: string; verified?: boolean }) {
  const tone = score >= 0.7 ? "green" : score >= 0.45 ? "amber" : "red";
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className="inline-block px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
        style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
      >
        {label} — {Math.round(score * 100)}%
      </span>
      {verified && (
        <span className="text-[11.5px]" style={{ color: "var(--green)" }}>
          ✓ citations verified
        </span>
      )}
    </span>
  );
}

/**
 * The recurring "day timeline" motif — reflects the actual subject matter
 * (Pakistan's time-of-use electricity tariff: off-peak / peak windows),
 * not decoration. Used on Home, Dashboard and Solar Toolkit.
 */
export function TimeOfDayBar({ compact = false }: { compact?: boolean }) {
  const segments = [
    { from: 0, to: 6, label: "Off-peak", color: "var(--offpeak-color)" },
    { from: 6, to: 10, label: "Off-peak", color: "var(--offpeak-color)" },
    { from: 10, to: 18, label: "Solar / shoulder", color: "var(--accent-2)" },
    { from: 18, to: 22, label: "Peak", color: "var(--peak-color)" },
    { from: 22, to: 24, label: "Off-peak", color: "var(--offpeak-color)" },
  ];
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2.5" style={{ background: "var(--bg-2)" }}>
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${((s.to - s.from) / 24) * 100}%`, background: s.color }} />
        ))}
      </div>
      {!compact && (
        <div className="flex justify-between text-[10.5px] mt-1.5" style={{ color: "var(--text-muted)" }}>
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {icon}
      </div>
      <div>
        <h1 className="text-xl font-display font-bold" style={{ color: "var(--text)" }}>
          {title}
        </h1>
        {sub && (
          <p className="text-[13.5px] mt-0.5 max-w-2xl" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
