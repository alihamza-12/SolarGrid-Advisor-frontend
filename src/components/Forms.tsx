import type { ReactNode } from "react";

/** Shared form styling — matches the existing theme (LLMSettingsPanel pattern). */
export const fieldCls =
  "w-full rounded-lg px-3 py-2 text-[13px] border focus-ring outline-none";
export const fieldStyle = {
  background: "var(--bg-2)",
  borderColor: "var(--card-border)",
  color: "var(--text)",
};

export const mutedStyle = { color: "var(--text-muted)" };

export function fmtRs(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return "Rs " + Math.round(n).toLocaleString("en-US");
}

export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-medium block mb-1" style={mutedStyle}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <label className="text-[12px] font-medium" style={mutedStyle}>
          {label}
        </label>
        <span className="text-[13px] font-semibold shrink-0" style={{ color: "var(--text)" }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-center gap-2 text-[13px] cursor-pointer select-none"
      style={{ color: "var(--text)" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[var(--accent)] shrink-0"
      />
      {label}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="text-[12.5px] px-3 py-2 rounded-lg"
      style={{ background: "var(--red-soft)", color: "var(--red)" }}
    >
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="text-[12.5px] px-3 py-2 rounded-lg"
      style={{ background: "var(--green-soft)", color: "var(--green)" }}
    >
      {message}
    </div>
  );
}

/**
 * Minimal, dependency-free rich text: **bold**, `code`, [n] citations,
 * > quotes and line breaks. Never injects raw HTML.
 */
export function renderRich(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = (text || "").split("\n");
  let key = 0;
  for (const line of lines) {
    const isQuote = line.trimStart().startsWith(">");
    const content = isQuote ? line.trimStart().slice(1).trimStart() : line;
    nodes.push(
      <span
        key={key++}
        style={
          isQuote
            ? {
                display: "block",
                borderLeft: "3px solid var(--accent)",
                paddingLeft: 8,
                color: "var(--text-muted)",
              }
            : undefined
        }
      >
        {renderInline(content, key * 1000)}
      </span>
    );
    nodes.push(<br key={key++} />);
  }
  return nodes;
}

function renderInline(text: string, base: number): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[\d+\])/g;
  let last = 0;
  let k = base;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      parts.push(
        <code key={k++} className="px-1 rounded" style={{ background: "var(--bg-2)" }}>
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(
        <span
          key={k++}
          className="px-1 rounded font-semibold"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {tok}
        </span>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
