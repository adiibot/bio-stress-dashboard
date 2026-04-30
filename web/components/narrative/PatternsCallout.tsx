import type { Pattern } from "@/lib/types";

const TONE_CHIP: Record<Pattern["tone"], { color: string; label: string }> = {
  positive: { color: "#10b981", label: "supportive" },
  neutral: { color: "#f59e0b", label: "noted" },
  warning: { color: "#e11d48", label: "worth flagging" },
};

export function PatternsCallout({ patterns }: { patterns: Pattern[] }) {
  if (patterns.length === 0) return null;
  return (
    <div className="space-y-3">
      {patterns.map((p) => {
        const t = TONE_CHIP[p.tone];
        return (
          <div
            key={p.id}
            className="rounded-2xl bg-white border border-ink-100 p-6 hover:shadow-card transition"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
              <h3 className="serif text-xl text-ink-900 leading-snug">{p.name}</h3>
              <span
                className="text-[10px] uppercase tracking-[0.16em] font-medium"
                style={{ color: t.color }}
              >
                {t.label}
              </span>
            </div>
            <p className="text-ink-600 leading-relaxed text-[15px]">{p.summary}</p>
          </div>
        );
      })}
    </div>
  );
}
