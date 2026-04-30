import type { Pattern } from "@/lib/types";

const TONE_STYLE: Record<Pattern["tone"], { dot: string; border: string; bg: string; label: string }> = {
  warning: { dot: "#e11d48", border: "#fecdd3", bg: "#fff1f2", label: "warning" },
  neutral: { dot: "#f59e0b", border: "#fde68a", bg: "#fffbeb", label: "noted" },
  positive: { dot: "#10b981", border: "#a7f3d0", bg: "#ecfdf5", label: "positive" },
};

export function PatternsPanel({ patterns }: { patterns: Pattern[] }) {
  return (
    <section className="rounded-2xl bg-white border border-ink-100 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
            Pattern recognition
          </div>
          <div className="serif text-lg text-ink-900 leading-tight">
            {patterns.length === 0
              ? "No multi-marker patterns above threshold."
              : patterns.length === 1
              ? "One pattern recognised."
              : `${patterns.length} patterns recognised.`}
          </div>
        </div>
        <span className="text-[11px] text-ink-400">
          beyond the linear composite
        </span>
      </div>

      {patterns.length === 0 ? (
        <p className="text-sm text-ink-500 leading-relaxed">
          The pattern engine looks for biphasic cortisol, sympatho-adrenal exhaustion,
          dopamine pathway collapse, monoamine compensatory ceilings, and other
          constellations the linear composite under-weights. None matched on this
          visit's biomarkers.
        </p>
      ) : (
        <div className="space-y-3">
          {patterns.map((p) => {
            const t = TONE_STYLE[p.tone];
            return (
              <div
                key={p.id}
                className="border-l-2 pl-4 py-2"
                style={{ borderColor: t.dot }}
              >
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: t.dot }}
                  >
                    {t.label}
                  </span>
                  <span className="font-medium text-ink-900">{p.name}</span>
                  <span className="text-[10px] text-ink-400 num">{p.id}</span>
                </div>
                <p className="text-sm text-ink-700 leading-relaxed">{p.summary}</p>
                {p.evidence.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {p.evidence.map((e, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-ink-500 num flex items-center gap-2"
                      >
                        <span className="w-1 h-1 rounded-full bg-ink-300" />
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
                {p.rationale && (
                  <p className="text-[11px] text-ink-500 mt-2 leading-relaxed italic">
                    {p.rationale}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
