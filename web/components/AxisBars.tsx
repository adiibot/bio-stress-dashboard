"use client";

const colorFor = (v: number) => {
  if (v < 15) return "#10b981";
  if (v < 25) return "#f59e0b";
  if (v < 35) return "#f97316";
  return "#e11d48";
};

const stateLabel = (v: number) => {
  if (v < 15) return "balanced";
  if (v < 25) return "under load";
  if (v < 35) return "strained";
  return "exhausted";
};

export function AxisBars({
  hpa,
  adrenal,
  nt,
  variant = "patient",
}: {
  hpa: number;
  adrenal: number;
  nt: number;
  variant?: "patient" | "clinician";
}) {
  const items = [
    { key: "HPA axis", title: "HPA axis", value: hpa, hint: "cortisol rhythm" },
    { key: "Adrenal", title: "Adrenal reserve", value: adrenal, hint: "DHEA & balance" },
    { key: "NT", title: "Neurotransmitter pool", value: nt, hint: "catecholamines & monoamines" },
  ];

  return (
    <div className="space-y-4">
      {items.map((it) => {
        const pct = Math.max(0, Math.min(100, it.value));
        return (
          <div key={it.key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <div>
                <div className="text-sm font-medium text-ink-900">{it.title}</div>
                <div className="text-xs text-ink-500">{it.hint}</div>
              </div>
              <div className="text-right">
                {variant === "clinician" ? (
                  <div className="num text-sm font-semibold" style={{ color: colorFor(it.value) }}>
                    {it.value.toFixed(1)}
                  </div>
                ) : (
                  <div className="text-sm font-medium" style={{ color: colorFor(it.value) }}>
                    {stateLabel(it.value)}
                  </div>
                )}
              </div>
            </div>
            <div className="h-2 bg-ink-100 rounded-full overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pct}%`, background: colorFor(it.value), transition: "width 600ms" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
