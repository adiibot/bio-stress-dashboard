import { AnimatedNumber } from "../AnimatedNumber";
import { AxisScoreTrio } from "../AxisScoreTrio";
import { TIER_COLOR, TIER_LABEL, type Tier } from "@/lib/types";

const COPY: Record<Tier, { headline: string; sub: string }> = {
  T1: {
    headline: "You're in a balanced place.",
    sub: "Your stress biology looks calm. Small fluctuations are normal — keep doing what's working.",
  },
  T2: {
    headline: "Your body is starting to feel it.",
    sub: "One or two systems are under load but compensating. Now is a good time to address it before it spreads.",
  },
  T3: {
    headline: "Multiple systems are under load.",
    sub: "Your biology is showing signs that the stress is layered. Structured care will make a real difference.",
  },
  T4: {
    headline: "Your body is asking for help.",
    sub: "The signals across your stress systems are loud. Working with a clinician is the right next step.",
  },
};

export function Hero({
  score,
  tier,
  axes,
}: {
  score: number;
  tier: Tier;
  axes?: { hpa: number; adrenal: number; nt: number };
}) {
  const color = TIER_COLOR[tier];
  const copy = COPY[tier];
  const scorePct = Math.max(0, Math.min(100, score));

  return (
    <section className="rise rise-1 pt-8 pb-12">
      <div className="text-xs uppercase tracking-[0.18em] text-ink-500 mb-6">
        Your stress biology · today
      </div>

      <h1 className="serif text-4xl sm:text-5xl text-ink-900 leading-[1.1] max-w-2xl mb-4">
        {copy.headline}
      </h1>
      <p className="text-ink-600 text-lg leading-relaxed max-w-xl mb-10">{copy.sub}</p>

      {/* score row */}
      <div className="flex items-end gap-6 mb-6">
        <div className="serif text-[110px] sm:text-[140px] leading-[0.85] font-light tracking-tight" style={{ color }}>
          <AnimatedNumber to={score} decimals={score < 10 ? 1 : 0} />
        </div>
        <div className="pb-3 sm:pb-4">
          <div className="text-xs text-ink-500 num">/ 100</div>
          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-white" style={{ background: color }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
            {tier}
          </div>
          <div className="text-xs text-ink-500 mt-1.5 max-w-[140px] leading-tight">
            {TIER_LABEL[tier].replace(/^Tier \d — /, "")}
          </div>
        </div>
      </div>

      {/* tier scale ribbon */}
      <div className="max-w-xl">
        <div className="relative h-1.5 rounded-full overflow-hidden flex">
          <div className="flex-[16] bg-tier1/35" />
          <div className="flex-[10] bg-tier2/35" />
          <div className="flex-[7] bg-tier3/35" />
          <div className="flex-[67] bg-tier4/35" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-white shadow"
            style={{ left: `${scorePct}%`, background: color, transform: "translate(-50%, -50%)" }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider text-ink-400 num">
          <span>0</span>
          <span>16</span>
          <span>26</span>
          <span>33</span>
          <span>100</span>
        </div>
      </div>

      {/* per-axis breakdown — the multi-axis hierarchical reporting (P28) */}
      {axes && (
        <div className="mt-10 max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-3">
            Where the load is — by system
          </div>
          <AxisScoreTrio values={axes} variant="patient" />
        </div>
      )}
    </section>
  );
}
