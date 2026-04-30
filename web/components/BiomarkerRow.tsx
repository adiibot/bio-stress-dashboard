"use client";

export function BiomarkerRow({
  label,
  unit,
  value,
  lrl,
  url,
  percentile,
  helper,
}: {
  label: string;
  unit?: string;
  value: number | null;
  lrl: number | null;
  url: number | null;
  percentile?: number;
  helper?: string;
}) {
  const ok = value != null && lrl != null && url != null;
  const out = ok && (value < lrl! || value > url!);
  const status = !ok ? "—" : out ? (value < lrl! ? "below" : "above") : "in range";
  const statusClass = !ok
    ? "chip"
    : out
    ? "chip chip-bad"
    : "chip chip-ok";

  // dot position on bar
  let dotPct: number | null = null;
  if (ok) {
    const span = url! - lrl!;
    // map [lrl-span, url+span] → [0, 1] for visual context outside range
    const lo = lrl! - span;
    const hi = url! + span;
    dotPct = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
  }

  return (
    <div className="grid grid-cols-12 gap-3 py-2 items-center border-b border-ink-100 last:border-0">
      <div className="col-span-3 sm:col-span-3">
        <div className="text-sm font-medium text-ink-900">{label}</div>
        {helper && <div className="text-xs text-ink-500">{helper}</div>}
      </div>
      <div className="col-span-2 num text-sm text-ink-900 text-right">
        {value != null ? value.toFixed(2) : "—"}
        {unit && <span className="text-ink-400 ml-1 text-xs">{unit}</span>}
      </div>
      <div className="col-span-4 hidden md:block">
        <div className="relative h-2 bg-ink-100 rounded-full">
          {/* reference band */}
          <div
            className="absolute top-0 bottom-0 bg-tier1/20 rounded-full"
            style={{ left: "33%", width: "33%" }}
          />
          {dotPct != null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-2 ring-white"
              style={{
                left: `${dotPct * 100}%`,
                background: out ? "#e11d48" : "#10b981",
              }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-ink-400 mt-1 num">
          <span>LRL {lrl?.toFixed(2) ?? "—"}</span>
          <span>URL {url?.toFixed(2) ?? "—"}</span>
        </div>
      </div>
      <div className="col-span-2 text-right">
        <span className={statusClass}>{status}</span>
      </div>
      <div className="col-span-1 text-right text-xs text-ink-500 num">
        {percentile != null ? `p${Math.round(percentile)}` : ""}
      </div>
    </div>
  );
}
