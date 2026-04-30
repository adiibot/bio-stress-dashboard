const STATE = (v: number) => {
  if (v < 12) return { tone: "calm", color: "#10b981" };
  if (v < 22) return { tone: "stirring", color: "#f59e0b" };
  if (v < 32) return { tone: "loud", color: "#f97316" };
  return { tone: "exhausted", color: "#e11d48" };
};

const COPY: Record<string, { title: string; calm: string; stirring: string; loud: string; exhausted: string }> = {
  HPA: {
    title: "Your daily rhythm",
    calm: "Your morning surge, midday level and evening wind-down look healthy. The stress system is keeping its pulse.",
    stirring: "The shape of your cortisol day is wobbling — usually a small lifestyle shift restores it.",
    loud: "Your day-to-night rhythm is meaningfully off. The body is firing at the wrong times.",
    exhausted: "Your cortisol axis is depleted. The body has stopped producing the swings a healthy day needs.",
  },
  Adrenal: {
    title: "Your reserve tank",
    calm: "DHEA — your anabolic counter to cortisol — is well-stocked. You have buffer.",
    stirring: "Your reserve is dipping. The buffer that protects you from cortisol exposure is thinning.",
    loud: "Reserve is low and the cortisol-to-DHEA ratio is climbing. The tank is running down.",
    exhausted: "Your adrenal reserve is depleted. The protective hormone DHEA isn't keeping pace with cortisol load.",
  },
  Neurotransmitter: {
    title: "Your peripheral signalling",
    calm: "The catecholamines and monoamines that ride alongside the stress axis look balanced.",
    stirring: "There are early ripples in your sympathetic and serotonergic signalling — worth watching.",
    loud: "Your sympathetic nervous system is showing strain. Some signalling is louder than it should be.",
    exhausted: "Multiple signalling pathways are depleted, including peripheral serotonin (a gut-level signal, not brain serotonin).",
  },
};

const ICONS: Record<string, React.ReactNode> = {
  HPA: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 22 C 8 22, 8 6, 13 6 S 18 22, 23 22 S 28 16, 29 16" />
      <circle cx="3" cy="22" r="1.2" fill="currentColor" />
      <circle cx="13" cy="6" r="1.2" fill="currentColor" />
      <circle cx="23" cy="22" r="1.2" fill="currentColor" />
      <circle cx="29" cy="16" r="1.2" fill="currentColor" />
    </svg>
  ),
  Adrenal: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4 L 6 12 L 6 22 L 16 28 L 26 22 L 26 12 Z" />
      <path d="M16 14 L 12 18 L 16 22 L 20 18 Z" fill="currentColor" fillOpacity="0.1" />
    </svg>
  ),
  Neurotransmitter: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <circle cx="24" cy="9" r="3" />
      <circle cx="9" cy="24" r="3" />
      <circle cx="23" cy="23" r="3" />
      <path d="M11 9 L 21 9 M 9 11 L 9 21 M 11 23 L 21 23 M 24 12 L 24 20 M 11 11 L 21 21 M 21 11 L 11 21" strokeOpacity="0.4" />
    </svg>
  ),
};

export function AxisStory({
  hpa,
  adrenal,
  nt,
}: {
  hpa: number;
  adrenal: number;
  nt: number;
}) {
  const items = [
    { key: "HPA", value: hpa },
    { key: "Adrenal", value: adrenal },
    { key: "Neurotransmitter", value: nt },
  ];

  return (
    <div className="space-y-4">
      {items.map((it) => {
        const s = STATE(it.value);
        const copy = COPY[it.key];
        const body = (copy as any)[s.tone];
        return (
          <div
            key={it.key}
            className="p-6 sm:p-7 rounded-2xl bg-white border border-ink-100 hover:shadow-card transition"
          >
            <div className="flex items-start gap-5">
              <div
                className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: s.color + "15", color: s.color }}
              >
                <div className="w-6 h-6">{ICONS[it.key]}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500 mb-0.5">
                      {it.key}
                    </div>
                    <h3 className="serif text-xl text-ink-900 leading-tight">
                      {copy.title}
                    </h3>
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider" style={{ color: s.color }}>
                    {s.tone}
                  </div>
                </div>
                <p className="text-ink-600 leading-relaxed mt-3 text-[15px]">{body}</p>
                {/* gentle progress band */}
                <div className="mt-4 h-1 bg-ink-100 rounded-full overflow-hidden max-w-md">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, it.value)}%`, background: s.color }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
