"use client";
import { AnimatedNumber } from "../AnimatedNumber";
import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
  TIER_LABEL,
  TRAJECTORY_COLOR,
  TRAJECTORY_LABEL,
  type PatientRecord,
  type Phenotype,
  type Tier,
  type Trajectory,
} from "@/lib/types";

export function DeepDiveHero({
  p,
}: {
  p: PatientRecord;
}) {
  const r = p.latest_visit.result;
  const tier = r.tier_final;
  const formulaTier = r.tier_formula;
  const tierEscalated = tier !== formulaTier;
  const color = TIER_COLOR[tier];
  const baseline = p.phenotype_baseline as Phenotype | null;
  const target = p.phenotype_target as Phenotype | null;
  const traj = p.trajectory as Trajectory | null;

  const firstScore = p.trajectory_data[0]?.score ?? null;
  const delta = firstScore != null ? r.score_formula - firstScore : 0;
  const deltaColor = delta < -2 ? "#10b981" : delta > 2 ? "#e11d48" : "#71717a";

  return (
    <div className="rise rise-1">
      <div className="flex items-center gap-2 mb-3 text-[11px] text-ink-500">
        <span className="num">{p.id}</span>
        <span className="text-ink-300">·</span>
        <span className="num">{p.sex ?? "?"} · {p.age?.toFixed(1) ?? "?"} y</span>
        <span className="text-ink-300">·</span>
        <span>v{p.latest_visit.visit_num} · {p.latest_visit.date}</span>
        <span className="text-ink-300">·</span>
        <span>{p.n_visits_with_data}/{p.n_visits_attended} visits</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-8 items-start">
        {/* left: score block */}
        <div>
          <div className="flex items-baseline gap-5 mb-3 flex-wrap">
            <div
              className="serif text-[100px] leading-[0.85] font-light tracking-tight"
              style={{ color }}
            >
              <AnimatedNumber to={r.score_formula} decimals={1} />
            </div>
            <div className="pb-2">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold text-white"
                style={{ background: color }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                {tier}
              </div>
              <div className="text-[11px] text-ink-500 mt-1.5 max-w-[160px]">
                {TIER_LABEL[tier].replace(/^Tier \d — /, "")}
              </div>
              {tierEscalated && (
                <div className="text-[10px] text-tier3 mt-1.5 num">
                  DISPLAY-1: {formulaTier} → {tier}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {baseline && (
              <Chip color={PHENOTYPE_COLOR[baseline]}>{baseline}</Chip>
            )}
            {target && target !== baseline && (
              <>
                <span className="text-ink-400 text-xs self-center">→</span>
                <Chip color={PHENOTYPE_COLOR[target]}>{target}</Chip>
              </>
            )}
            {traj && (
              <Chip color={TRAJECTORY_COLOR[traj]}>
                {traj === "recovery" ? "↓" : traj === "decline" ? "↑" : "→"}{" "}
                {TRAJECTORY_LABEL[traj]}
              </Chip>
            )}
            {p.trajectory_strength != null && p.trajectory_strength > 0 && (
              <span className="text-[11px] text-ink-500 self-center num">
                strength {p.trajectory_strength.toFixed(2)}
              </span>
            )}
          </div>

          {firstScore != null && (
            <div className="flex items-baseline gap-2 text-sm text-ink-600">
              <span>Δ since first visit</span>
              <span className="num font-medium" style={{ color: deltaColor }}>
                {delta > 0 ? "+" : ""}{delta.toFixed(1)}
              </span>
              <span className="text-ink-400">·</span>
              <span>cohort percentile</span>
              <span className="num font-medium text-ink-900">
                p{p.score_percentile?.toFixed(0) ?? "—"}
              </span>
            </div>
          )}
        </div>

        {/* right: applied rules + flags */}
        <div className="lg:max-w-sm">
          {(r.applied_rules.length > 0 || r.phenotype_flags.length > 0) && (
            <div className="rounded-xl border border-ink-100 bg-white p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-2">
                Triggered
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.applied_rules.map((rule) => (
                  <span key={rule} className="chip chip-warn text-[10px]">
                    {rule}
                  </span>
                ))}
                {r.phenotype_flags.map((f) => (
                  <span key={f} className="chip chip-bad text-[10px]">
                    {f}
                  </span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-ink-100 text-xs">
                <div className="text-ink-500">{r.phase_rationale}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="chip text-[11px]"
      style={{
        borderColor: color + "40",
        background: color + "0a",
        color,
      }}
    >
      {children}
    </span>
  );
}
