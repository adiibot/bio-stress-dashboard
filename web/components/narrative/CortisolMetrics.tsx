"use client";

type Metric = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  lrl: number;
  url: number;
  axis: "rise" | "shape" | "total" | "fall";
  whatItIs: string;
  yourReading: (v: number, lrl: number, url: number) => string;
  tip?: (v: number, lrl: number, url: number) => string | null;
};

function pctPosition(v: number, lrl: number, url: number) {
  // map [lrl - span, url + span] → [0, 100] so out-of-range still shows
  const span = url - lrl;
  const lo = lrl - span * 0.4;
  const hi = url + span * 0.4;
  return Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100));
}

export function CortisolMetrics({
  values,
}: {
  values: {
    car_pct: number | null;
    aucg: number | null;
    dcs: number | null;
    m3: number | null;
    m1: number | null;
  };
}) {
  const m1Adequate = (values.m1 ?? 0) >= 5.0;
  const metrics: Metric[] = [
    {
      key: "car",
      label: "CAR%",
      value: values.car_pct,
      unit: "%",
      lrl: 50,
      url: 120,
      axis: "rise",
      whatItIs:
        "The cortisol awakening response — the surge in the first 30 minutes after you wake. Think of it as your body's morning ignition. Usually a 50–120% rise.",
      yourReading: (v) =>
        v < 0
          ? `Yours is ${v.toFixed(0)}% — inverted. Cortisol falls instead of rising, a signature of advanced HPA fatigue.`
          : v < 50
          ? `Yours is ${v.toFixed(0)}% — muted. The morning ignition is small relative to a healthy reference.`
          : v <= 120
          ? `Yours is ${v.toFixed(0)}% — within the healthy 50–120% range.`
          : `Yours is ${v.toFixed(0)}% — exaggerated. The morning surge is unusually large.`,
      tip: (v) =>
        v < 50
          ? "Morning sunlight within 30 min of waking restores CAR amplitude in many people."
          : v > 120
          ? "Anticipatory stress (workday dread, bad sleep) often drives an exaggerated CAR. Sleep regularity helps."
          : null,
    },
    {
      key: "aucg",
      label: "AUCg",
      value: values.aucg,
      unit: "nmol·h/L",
      lrl: 32,
      url: 113,
      axis: "total",
      whatItIs:
        "Area Under the Curve (Ground) — the total amount of cortisol you're exposed to over the day. Healthy range is 32–113.",
      yourReading: (v) =>
        v < 32
          ? `Yours is ${v.toFixed(0)} — below the floor. Total daily output is suppressed.`
          : v <= 113
          ? `Yours is ${v.toFixed(0)} — in range. Total daily exposure is appropriate.`
          : `Yours is ${v.toFixed(0)} — elevated. Sustained high cortisol exposure has metabolic consequences if prolonged.`,
      tip: (v) =>
        v > 113
          ? "Elevated AUCg is sensitive to chronic load. Recovery anchors (HRV breathing, walks, sleep) compound."
          : v < 32
          ? "A low AUCg often follows long-running stress that has tipped into exhaustion. Slow rebuild beats hard pushes."
          : null,
    },
    {
      key: "dcs",
      label: "DCS",
      value: values.dcs,
      unit: "nmol/L/h",
      lrl: -1.12,
      url: -0.24,
      axis: "fall",
      whatItIs:
        "Diurnal Cortisol Slope — how steeply cortisol falls from morning to night. Healthy is between −1.12 and −0.24 (steep enough to give your body the 'off' signal).",
      yourReading: (v) =>
        v > -0.24
          ? `Yours is ${v.toFixed(2)} — flat. Cortisol doesn't fall enough by evening, often linked to sleep difficulty.`
          : v < -1.12
          ? `Yours is ${v.toFixed(2)} — very steep. Often an artifact of an elevated morning baseline.`
          : `Yours is ${v.toFixed(2)} — within the healthy decline range.`,
      tip: (v) =>
        v > -0.24
          ? "Dimming screens 90 min before bed and consistent wake times sharpen the slope."
          : null,
    },
    {
      key: "mid1",
      label: "Midday cortisol (m3)",
      value: values.m3,
      unit: "nmol/L",
      lrl: 1.9,
      url: 5.2,
      axis: "shape",
      whatItIs:
        "Cortisol level around noon. A healthy midday level keeps energy steady. Below 1.9 with a healthy morning is the 'midday collapse' pattern (rule MID-1) — predicts afternoon energy crashes.",
      yourReading: (v) =>
        v < 1.9 && m1Adequate
          ? `Yours is ${v.toFixed(2)} — below the floor while your morning baseline is intact (MID-1 pattern).`
          : v < 1.9
          ? `Yours is ${v.toFixed(2)} — below the floor.`
          : v <= 5.2
          ? `Yours is ${v.toFixed(2)} — in range.`
          : `Yours is ${v.toFixed(2)} — elevated for midday.`,
      tip: (v) =>
        v < 1.9 && m1Adequate
          ? "A protein-anchored lunch + a 5-minute walk afterwards stabilises midday cortisol better than coffee."
          : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {metrics.map((m) => {
        const v = m.value;
        if (v == null) return null;
        const pos = pctPosition(v, m.lrl, m.url);
        const inRange = v >= m.lrl && v <= m.url;
        const lrlPos = pctPosition(m.lrl, m.lrl, m.url);
        const urlPos = pctPosition(m.url, m.lrl, m.url);
        const tip = m.tip ? m.tip(v, m.lrl, m.url) : null;
        return (
          <div
            key={m.key}
            className="rounded-2xl bg-white border border-ink-100 p-6 hover:shadow-card transition"
          >
            <div className="flex items-baseline justify-between mb-3">
              <div className="num text-[10px] uppercase tracking-[0.2em] text-ink-500">
                {m.label}
              </div>
              <div className="serif text-3xl font-light tracking-tight text-ink-900">
                {v.toFixed(m.key === "dcs" ? 2 : v >= 100 ? 0 : 1)}
                <span className="text-[11px] text-ink-400 ml-1.5 font-sans">{m.unit}</span>
              </div>
            </div>

            <p className="text-sm text-ink-600 leading-relaxed mb-4">{m.whatItIs}</p>

            <div className="relative h-2 bg-ink-100 rounded-full mb-2">
              {/* reference band */}
              <div
                className="absolute top-0 bottom-0 bg-tier1/25 rounded-full"
                style={{ left: `${lrlPos}%`, width: `${urlPos - lrlPos}%` }}
              />
              {/* patient dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-white"
                style={{
                  left: `${pos}%`,
                  transform: "translate(-50%, -50%)",
                  background: inRange ? "#10b981" : "#e11d48",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-400 num mb-3">
              <span>LRL {m.lrl}</span>
              <span>URL {m.url}</span>
            </div>

            <p className="text-sm text-ink-700 leading-relaxed">{m.yourReading(v, m.lrl, m.url)}</p>
            {tip && (
              <div className="mt-3 pt-3 border-t border-ink-100 flex items-start gap-2 text-[13px] text-ink-700">
                <span className="text-tier1 mt-0.5">→</span>
                <span className="leading-relaxed">{tip}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
