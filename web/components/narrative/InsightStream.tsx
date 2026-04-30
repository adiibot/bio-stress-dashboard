import type { Insight } from "@/lib/types";

const SEV_STYLE: Record<string, { dot: string; label: string }> = {
  high: { dot: "#e11d48", label: "needs attention" },
  moderate: { dot: "#f59e0b", label: "worth watching" },
  low: { dot: "#10b981", label: "supportive" },
};

export function InsightStream({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-ink-100 p-7">
        <p className="text-ink-700 leading-relaxed">
          Nothing on your panel is flagging. The score reflects small ratio shifts
          that don't require intervention right now — keep observing.
        </p>
      </div>
    );
  }

  // sort by severity
  const order = { high: 0, moderate: 1, low: 2 } as Record<string, number>;
  const sorted = [...insights].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <ol className="space-y-4">
      {sorted.map((ins, i) => {
        const s = SEV_STYLE[ins.severity];
        return (
          <li
            key={i}
            className="rounded-2xl bg-white border border-ink-100 p-6 sm:p-7 hover:shadow-card transition"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-1.5 flex flex-col items-center">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: s.dot }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                  <h3 className="serif text-xl text-ink-900 leading-snug">
                    {ins.title}
                  </h3>
                  <span
                    className="text-[10px] uppercase tracking-[0.16em] font-medium"
                    style={{ color: s.dot }}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="text-ink-600 leading-relaxed text-[15px]">{ins.body}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
