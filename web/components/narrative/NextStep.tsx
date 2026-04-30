import { PHASE_LABEL } from "@/lib/types";

const PHASE_COPY: Record<number, { headline: string; body: string; action: string }> = {
  1: {
    headline: "Stabilise the foundation first.",
    body: "Your cortisol axis is the highest-leverage system to address. The plan is to settle that pattern before adding anything to it — neurotransmitter precursors and reward-system support land much better on a stable base.",
    action: "Sleep regularity, morning light, breath-led recovery",
  },
  2: {
    headline: "Build serotonin substrate.",
    body: "With your HPA axis stable enough, the next step is restoring peripheral serotonin precursors. This precedes dopamine work because tryptophan and tyrosine compete for the same brain transporter.",
    action: "Tryptophan-rich nutrition, gut-brain axis support",
  },
  3: {
    headline: "Restore dopamine substrate.",
    body: "Serotonin is settled. Now the focus shifts to dopaminergic precursors — supporting motivation, focus, and reward processing without overstimulating the system.",
    action: "Tyrosine timing, B-vitamin cofactors",
  },
  4: {
    headline: "Balance catecholamine catabolism.",
    body: "Primary neurotransmitters are adequate. The work now is balancing how the body breaks them down — methylation, COMT/MAO support, oxidative stress.",
    action: "Methylation cofactors, antioxidant load",
  },
  5: {
    headline: "Integrate and consolidate.",
    body: "The systems are settling. This phase consolidates gains — sleep architecture, cardiac coherence, exercise dose-response.",
    action: "HRV-led training, sleep depth",
  },
  6: {
    headline: "Maintain and watch.",
    body: "You're stable. Maintenance keeps the foundation strong. Quarterly check-ins catch drift early.",
    action: "Periodic re-test, lifestyle continuity",
  },
};

export function NextStep({ phase, rationale }: { phase: number; rationale: string }) {
  const copy = PHASE_COPY[phase] ?? {
    headline: "Continue with your plan.",
    body: rationale,
    action: "Stay consistent",
  };
  return (
    <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-7 sm:p-9">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
        {PHASE_LABEL[phase] ?? `Phase ${phase}`}
      </div>
      <h2 className="serif text-2xl sm:text-3xl text-ink-900 leading-tight max-w-xl mb-4">
        {copy.headline}
      </h2>
      <p className="text-ink-600 leading-relaxed max-w-xl text-[15px]">{copy.body}</p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-medium">
        Focus this month
        <span className="text-ink-300">·</span>
        <span className="text-white/90">{copy.action}</span>
      </div>
    </div>
  );
}
