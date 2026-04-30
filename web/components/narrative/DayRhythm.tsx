"use client";

const REF: Record<string, { lrl: number; url: number; label: string; sub: string }> = {
  m1: { lrl: 5.0, url: 17.1, label: "Wake", sub: "first light" },
  m2: { lrl: 7.5, url: 25.6, label: "+30 min", sub: "morning surge" },
  m3: { lrl: 1.9, url: 5.2, label: "Noon", sub: "working level" },
  m4: { lrl: 0.3, url: 3.0, label: "Evening", sub: "winding down" },
  m5: { lrl: 0.3, url: 1.4, label: "Night", sub: "almost asleep" },
};

const POINTS = ["m1", "m2", "m3", "m4", "m5"] as const;

export function DayRhythm({
  values,
}: {
  values: { m1: number | null; m2: number | null; m3: number | null; m4: number | null; m5: number | null };
}) {
  // chart geometry
  const W = 720;
  const H = 280;
  const padX = 40;
  const padTop = 30;
  const padBottom = 70;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const yMax = 30; // nmol/L
  const xs = POINTS.map((_, i) => padX + (innerW * i) / (POINTS.length - 1));

  const yScale = (v: number) =>
    padTop + innerH - (Math.max(0, Math.min(yMax, v)) / yMax) * innerH;

  // curve points
  const pts = POINTS.map((k, i) => ({
    x: xs[i],
    y: yScale(values[k] ?? 0),
    raw: values[k],
    lrl: REF[k].lrl,
    url: REF[k].url,
  }));

  // Catmull-Rom-ish smooth path
  const pathD = (() => {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }
    return d;
  })();

  // reference band as a polygon (smooth between LRL/URL at each timepoint)
  const refTop = pts.map((p) => `${p.x},${yScale(p.url)}`).join(" ");
  const refBot = pts
    .slice()
    .reverse()
    .map((p) => `${p.x},${yScale(p.lrl)}`)
    .join(" ");

  return (
    <div className="rounded-2xl bg-white border border-ink-100 p-5 sm:p-7 hover:shadow-card transition">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 480 }}>
          <defs>
            <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="under" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* y-grid */}
          {[0, 10, 20, 30].map((v) => (
            <g key={v}>
              <line
                x1={padX}
                x2={W - padX}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="#f4f4f5"
                strokeWidth="1"
              />
              <text x={padX - 8} y={yScale(v) + 3} fontSize="10" fill="#a1a1aa" textAnchor="end">
                {v}
              </text>
            </g>
          ))}

          {/* reference band */}
          <polygon points={`${refTop} ${refBot}`} fill="url(#band)" />

          {/* under-curve area */}
          <path
            d={`${pathD} L ${pts[pts.length - 1].x} ${yScale(0)} L ${pts[0].x} ${yScale(0)} Z`}
            fill="url(#under)"
          />

          {/* curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="2000"
            strokeDashoffset="2000"
            style={{ animation: "draw 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards" }}
          />

          {/* dots */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5.5} fill="#fff" stroke="#0f172a" strokeWidth="2" />
            </g>
          ))}

          {/* x labels */}
          {POINTS.map((k, i) => (
            <g key={k}>
              <text
                x={xs[i]}
                y={H - padBottom + 22}
                fontSize="13"
                fill="#3f3f46"
                textAnchor="middle"
                fontWeight={500}
              >
                {REF[k].label}
              </text>
              <text
                x={xs[i]}
                y={H - padBottom + 38}
                fontSize="11"
                fill="#a1a1aa"
                textAnchor="middle"
              >
                {REF[k].sub}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {POINTS.map((k) => {
          const v = values[k];
          const lrl = REF[k].lrl;
          const url = REF[k].url;
          const status =
            v == null ? "—" : v < lrl ? "low" : v > url ? "high" : "in range";
          const cls =
            v == null
              ? "text-ink-400"
              : v < lrl || v > url
              ? "text-tier3"
              : "text-tier1";
          return (
            <div key={k} className="text-center">
              <div className="num text-sm font-medium text-ink-900">
                {v != null ? v.toFixed(2) : "—"}
              </div>
              <div className={`text-[11px] mt-0.5 ${cls}`}>{status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
