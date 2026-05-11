import type { CounterfactualAnalysis } from "@/lib/types";

const MARKER_PLAIN: Record<string, { name: string; raise?: string; lower?: string }> = {
  m1: {
    name: "your morning cortisol",
    raise: "morning sunlight within 30 min of waking, consistent wake time",
    lower: "evening wind-down, screen curfew",
  },
  m2: {
    name: "your cortisol awakening response",
    raise: "morning light + a small protein breakfast within 60 minutes",
  },
  m3: {
    name: "your midday cortisol",
    raise: "a protein-anchored lunch + a 5-minute walk after",
  },
  m4: {
    name: "your evening cortisol",
    lower: "wind-down routine, screens off 90 min before bed, low-light evening",
  },
  m5: {
    name: "your night cortisol",
    lower: "no caffeine after 2pm, calm evening, magnesium glycinate",
  },
  dhea: {
    name: "your DHEA",
    raise: "deep sleep, strength training, stress recovery anchors",
  },
  da: {
    name: "your dopamine",
    raise: "morning tyrosine-rich protein, B-vitamin cofactors, vigorous intervals 2×/wk",
  },
  ser: {
    name: "your peripheral serotonin",
    raise: "tryptophan-rich evening meal, gut diversity, fermented foods",
    lower: "investigate dietary 5-HTP exposure, banana/walnut/pineapple within 48h",
  },
  nor: {
    name: "your noradrenaline",
    lower: "cardiac coherence breathing, vagal toning, reducing late stimulants",
  },
  epi: {
    name: "your adrenaline",
    raise: "consider that adrenal medulla reserve may be depleted; rest is the work",
    lower: "calming the stress trigger pattern, sleep quality, cold exposure",
  },
  dopac: { name: "your DOPAC", raise: "B-vitamin + iron status check, cofactor support" },
  hva: { name: "your HVA" },
  vma: { name: "your VMA" },
  mhpg: { name: "your MHPG" },
  hiaa: { name: "your 5-HIAA" },
};

export function WhatCouldMove({ data }: { data: CounterfactualAnalysis }) {
  const { counterfactuals, next_tier_below, current_tier } = data;

  if (next_tier_below == null) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-tier1/10 to-white border border-ink-100 p-7">
        <p className="text-ink-700 leading-relaxed text-[15px]">
          You&apos;re already at the lowest risk tier. The work now is staying
          here — consistent sleep, light, breath, and movement keep the foundation
          strong.
        </p>
      </div>
    );
  }

  if (counterfactuals.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-ink-100 p-7">
        <p className="text-ink-700 leading-relaxed text-[15px] mb-3">
          No single biomarker can drop your tier on its own. This is a multi-system
          picture — improvement comes from layered care, not from one number.
        </p>
        <p className="text-ink-500 text-sm leading-relaxed">
          Stick with your phase plan. The anchors above (sleep, light, breath,
          nutrition) work because they support several axes at once — that's how
          tier drops happen for cases like yours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-ink-700 text-base leading-relaxed max-w-xl">
        We ran a simulation — for each biomarker, what value would your score need
        if everything else stayed the same. Here are the smallest single shifts
        that could move you from{" "}
        <span className="num font-medium">{current_tier}</span> to{" "}
        <span className="num font-medium">{next_tier_below}</span>.
      </p>
      {counterfactuals.slice(0, 3).map((c) => {
        const plain = MARKER_PLAIN[c.marker] ?? { name: c.label.toLowerCase() };
        const direction = c.direction === "up" ? "raise" : "lower";
        const tip = c.direction === "up" ? plain.raise : plain.lower;
        return (
          <div
            key={c.marker}
            className="rounded-2xl bg-white border border-ink-100 p-6 hover:shadow-card transition"
          >
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h3 className="serif text-xl text-ink-900 leading-snug">
                If you {direction} {plain.name} …
              </h3>
              <span className="text-[10px] uppercase tracking-[0.16em] text-tier1 font-medium">
                drops to {c.new_tier}
              </span>
            </div>
            <p className="text-ink-600 leading-relaxed text-[15px]">
              From <span className="num font-medium">{c.current.toFixed(2)}</span>{" "}
              to <span className="num font-medium">{c.target_value.toFixed(2)}</span> —
              about <span className="num font-medium">{c.rel_delta_pct.toFixed(0)}%</span>{" "}
              {c.direction === "up" ? "higher" : "lower"}. Your score moves from{" "}
              <span className="num">{data.current_score.toFixed(1)}</span> to about{" "}
              <span className="num font-medium">{c.new_score.toFixed(1)}</span>.
            </p>
            {tip && (
              <div className="mt-3 pt-3 border-t border-ink-100 flex items-start gap-2 text-[13px] text-ink-700">
                <span className="text-tier1 mt-0.5">→</span>
                <span className="leading-relaxed">{tip}</span>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-ink-500 leading-relaxed max-w-xl pt-1">
        These are simulations on the score itself, not promises about your health.
        Achieving these biomarker values takes time and the right context — your
        clinician is the one who turns these signals into a plan.
      </p>
    </div>
  );
}
