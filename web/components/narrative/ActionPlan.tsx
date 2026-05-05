import type { Pattern } from "@/lib/types";

type Action = { title: string; body: string; tag: string };

const PHASE_ACTIONS: Record<number, Action[]> = {
  1: [
    {
      tag: "Light",
      title: "Sunlight within 30 minutes of waking",
      body: "10–20 min of outdoor light in the morning is the strongest known regulator of the cortisol awakening response. On grey days a 10,000 lux SAD lamp at eye level works.",
    },
    {
      tag: "Sleep",
      title: "Same wake time every day for 14 days",
      body: "A consistent wake anchor stabilises cortisol rhythm faster than any supplement. Bedtime can flex; wake time should not.",
    },
    {
      tag: "Breath",
      title: "Cardiac coherence — 5 min, twice a day",
      body: "Slow paced breathing (5–6 breaths/minute) lowers sympathetic tone within minutes. Morning + early evening is the standard protocol.",
    },
    {
      tag: "Caffeine",
      title: "No caffeine after 2pm",
      body: "Caffeine has a half-life of 5–7 hours. Late caffeine blunts deep sleep, which is when HPA recovers.",
    },
  ],
  2: [
    {
      tag: "Substrate",
      title: "Tryptophan-rich evening meal",
      body: "Turkey, eggs, oats, pumpkin seeds. Pair with a small carbohydrate for transporter access. Supports peripheral serotonin synthesis at the gut level.",
    },
    {
      tag: "Gut",
      title: "Daily fermented food + fibre diversity",
      body: "Gut enterochromaffin cells produce ~90% of body serotonin. A diverse microbiome supports that production.",
    },
    {
      tag: "Light",
      title: "Continue morning light + sleep regularity",
      body: "Phase 1 anchors don't go away when you reach Phase 2 — they stay as your foundation.",
    },
  ],
  3: [
    {
      tag: "Substrate",
      title: "Tyrosine-rich morning protein",
      body: "Eggs, dairy, lean poultry, almonds. Tyrosine is the precursor to dopamine. Morning timing matches the dopaminergic peak.",
    },
    {
      tag: "Cofactors",
      title: "Iron, B6, folate, vitamin C status check",
      body: "Dopamine synthesis requires several cofactors. A quick blood panel often reveals one limiter.",
    },
    {
      tag: "Activity",
      title: "Short bouts of vigorous activity",
      body: "Sprint intervals or hill walks acutely increase dopamine receptor sensitivity. Twice a week is enough.",
    },
  ],
  4: [
    {
      tag: "Methylation",
      title: "Folate / B12 / methyl-donor balance",
      body: "Catechol breakdown depends on methylation. A 23andMe COMT readout + a B-vitamin panel often shows the picture.",
    },
    {
      tag: "Antioxidants",
      title: "Vitamin C + polyphenol-rich foods",
      body: "Oxidative stress slows catechol catabolism. Berries, dark chocolate, leafy greens are the practical anchors.",
    },
  ],
  5: [
    {
      tag: "HRV",
      title: "Daily HRV-led training session",
      body: "Train hard on green-HRV days, recover on red. Consolidates gains without re-stressing the system.",
    },
    {
      tag: "Sleep",
      title: "Track sleep architecture",
      body: "A wearable that reports deep + REM gives you a visible signal that the system has settled.",
    },
  ],
  6: [
    {
      tag: "Maintain",
      title: "Quarterly re-test",
      body: "A panel every 3 months catches drift early — before any symptom appears.",
    },
    {
      tag: "Lifestyle",
      title: "Keep the anchors",
      body: "Sleep, light, breath, movement, gut. The four habits that built the foundation are the four that maintain it.",
    },
  ],
};

const PATTERN_ACTIONS: Record<string, Action[]> = {
  BIPHASIC_CORTISOL: [
    {
      tag: "Pattern-specific",
      title: "Anchor a midday meal",
      body: "Biphasic curves often track skipped or carbohydrate-only lunches. A protein-anchored midday meal smooths the m3 → m4 swing.",
    },
  ],
  CAR_CEILING_BLUNTED: [
    {
      tag: "Pattern-specific",
      title: "Wind-down hour, not just a bedtime",
      body: "A high morning baseline often comes from a night that didn't fully discharge. A consistent 60-min wind-down reduces baseline cortisol by morning.",
    },
  ],
  SYMPATHO_ADRENAL_EXHAUSTION: [
    {
      tag: "Pattern-specific",
      title: "Cardiac coherence + cold exposure",
      body: "Both shift autonomic balance toward parasympathetic. A 30–60 second cold finish to a shower is a low-effort vagal stimulus.",
    },
  ],
  DOPAMINE_PATHWAY_COLLAPSE: [
    {
      tag: "Pattern-specific",
      title: "Tyrosine + cofactor support, mornings",
      body: "Pure synthesis collapse responds well to substrate + cofactor work — but only after Phase 1 is stable.",
    },
  ],
  MIDDAY_COLLAPSE: [
    {
      tag: "Pattern-specific",
      title: "Protein + walk after lunch",
      body: "A 5-minute walk after a protein-anchored lunch stabilises midday cortisol better than a coffee bump.",
    },
  ],
  NOCTURNAL_HYPERCORTISOLISM: [
    {
      tag: "Pattern-specific",
      title: "Screens off 90 minutes before sleep",
      body: "Late screen exposure delays cortisol fall and elevates the m5 reading. The most reproducible single fix for this pattern.",
    },
  ],
};

export function ActionPlan({
  phase,
  patterns,
}: {
  phase: number;
  patterns: Pattern[];
}) {
  const phaseActions = PHASE_ACTIONS[phase] ?? [];
  const patternActions = patterns
    .flatMap((p) => PATTERN_ACTIONS[p.id] || [])
    .slice(0, 3);

  return (
    <div className="space-y-3">
      {patternActions.length > 0 && (
        <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-tier3/10 to-white p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-tier3 mb-2">
            Tailored to your patterns
          </div>
          <div className="space-y-3">
            {patternActions.map((a, i) => (
              <ActionCard key={`p-${i}`} a={a} />
            ))}
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
          Anchored on your phase
        </div>
        <div className="space-y-3">
          {phaseActions.map((a, i) => (
            <ActionCard key={`a-${i}`} a={a} />
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-500 leading-relaxed">
        These are lifestyle-grade anchors, evidence-based and safe to start
        unsupervised. They don't replace clinical care — read them alongside the
        plan you've made with your physician.
      </p>
    </div>
  );
}

function ActionCard({ a }: { a: Action }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 mt-1.5 text-[9px] uppercase tracking-[0.16em] text-ink-500 font-medium w-16">
        {a.tag}
      </span>
      <div className="min-w-0">
        <div className="font-medium text-ink-900 mb-0.5 text-[15px]">{a.title}</div>
        <p className="text-sm text-ink-600 leading-relaxed">{a.body}</p>
      </div>
    </div>
  );
}
