import { TIER_COLOR, type CounterfactualAnalysis, type Tier } from "@/lib/types";

export function CounterfactualPanel({
  data,
}: {
  data: CounterfactualAnalysis;
}) {
  const { sensitivities, counterfactuals, current_tier, next_tier_below } = data;
  const maxAbs = sensitivities[0]?.abs_importance ?? 1;

  return (
    <section className="rounded-2xl bg-white border border-ink-100 p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
            Counterfactual analysis
          </div>
          <div className="serif text-lg text-ink-900 leading-tight">
            What would move the score.
          </div>
        </div>
        <span className="text-[11px] text-ink-400">
          differentiable engine · univariate
        </span>
      </div>

      {/* Sensitivities */}
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-3">
          Local sensitivity · dScore per +5% bump in marker
        </div>
        {sensitivities.length === 0 ? (
          <div className="text-sm text-ink-500">No measurable sensitivity at the current point.</div>
        ) : (
          <div className="space-y-1.5">
            {sensitivities.map((s) => {
              const pct = Math.min(100, (s.abs_importance / maxAbs) * 100);
              const positive = s.d_score > 0;
              return (
                <div key={s.marker} className="flex items-center gap-3">
                  <div className="text-xs text-ink-700 w-44 shrink-0 truncate">
                    {s.label}
                  </div>
                  <div className="text-[10px] text-ink-400 num w-20 text-right shrink-0">
                    {s.current.toFixed(2)}
                  </div>
                  <div className="flex-1 relative h-1.5 bg-ink-100 rounded-full overflow-hidden max-w-[160px]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: positive ? "#e11d48" : "#10b981",
                      }}
                    />
                  </div>
                  <div
                    className="num text-xs font-medium w-12 text-right"
                    style={{ color: positive ? "#e11d48" : "#10b981" }}
                  >
                    {s.d_score > 0 ? "+" : ""}
                    {s.d_score.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-ink-500 mt-3 leading-relaxed">
          <span style={{ color: "#10b981" }}>Green</span> = raising the marker lowers
          the score (helpful direction). <span style={{ color: "#e11d48" }}>Red</span>{" "}
          = raising the marker raises the score (current direction is already wrong).
        </p>
      </div>

      {/* Counterfactuals — tier drop */}
      <div className="pt-4 border-t border-ink-100">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-3">
          Smallest single-marker change to reach{" "}
          {next_tier_below ? (
            <span style={{ color: TIER_COLOR[next_tier_below as Tier] }}>
              {next_tier_below}
            </span>
          ) : (
            "next tier"
          )}
        </div>
        {next_tier_below == null ? (
          <p className="text-sm text-ink-500 leading-relaxed">
            Already at T1 — no tier below to target.
          </p>
        ) : counterfactuals.length === 0 ? (
          <p className="text-sm text-ink-500 leading-relaxed">
            No single-marker move reaches {next_tier_below}. The constellation is
            multi-system — tier reduction will require coordinated changes across
            axes. The sensitivity ranking above shows the highest-leverage
            individual levers.
          </p>
        ) : (
          <ul className="space-y-2">
            {counterfactuals.map((c) => {
              const arrow = c.direction === "up" ? "↑" : "↓";
              const verb = c.direction === "up" ? "raise" : "lower";
              return (
                <li
                  key={c.marker}
                  className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-ink-100 last:border-0"
                >
                  <div className="col-span-1 num text-base" style={{ color: "#0f172a" }}>
                    {arrow}
                  </div>
                  <div className="col-span-5 text-xs">
                    <div className="text-ink-900 font-medium">
                      {verb} <span className="lowercase">{c.label}</span>
                    </div>
                    <div className="text-ink-500 num text-[11px]">
                      {c.current.toFixed(2)} → {c.target_value.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-2 text-right num text-xs text-ink-600">
                    {c.rel_delta_pct.toFixed(0)}% move
                  </div>
                  <div className="col-span-4 text-right">
                    <span className="text-[11px] text-ink-500">→</span>{" "}
                    <span className="num text-xs font-semibold">
                      {c.new_score.toFixed(1)}
                    </span>{" "}
                    <span
                      className="chip text-[10px]"
                      style={{ color: TIER_COLOR[c.new_tier] }}
                    >
                      {c.new_tier}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[10px] text-ink-500 mt-3 leading-relaxed">
          Counterfactuals describe what the score would do under a hypothetical
          single-marker change. They do not assert that achieving the target
          biomarker would clinically improve the patient — that judgment belongs
          to the physician.
        </p>
      </div>
    </section>
  );
}
