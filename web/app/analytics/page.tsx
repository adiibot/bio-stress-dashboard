import { AppShell } from "@/components/AppShell";
import { getCohort } from "@/lib/data";
import {
  PHENOTYPE_COLOR,
  PHENOTYPE_DESCRIPTION,
  TIER_COLOR,
  type BiomarkerKey,
  type Phenotype,
  type Tier,
} from "@/lib/types";

const BIOMARKER_LABEL: Partial<Record<BiomarkerKey, { label: string; unit: string; group: string }>> = {
  m1: { label: "Cortisol m1 (wake)", unit: "nmol/L", group: "Cortisol" },
  m2: { label: "Cortisol m2 (+30m)", unit: "nmol/L", group: "Cortisol" },
  m3: { label: "Cortisol m3 (noon)", unit: "nmol/L", group: "Cortisol" },
  m4: { label: "Cortisol m4 (evening)", unit: "nmol/L", group: "Cortisol" },
  m5: { label: "Cortisol m5 (night)", unit: "nmol/L", group: "Cortisol" },
  car_pct: { label: "CAR%", unit: "%", group: "Cortisol" },
  aucg: { label: "AUCg", unit: "nmol·h/L", group: "Cortisol" },
  dcs: { label: "DCS", unit: "nmol/L/h", group: "Cortisol" },
  dhea: { label: "DHEA", unit: "nmol/L", group: "Adrenal" },
  cor_dhea: { label: "COR/DHEA", unit: "ratio", group: "Adrenal" },
  da: { label: "Dopamine", unit: "µmol/mol", group: "Catecholamines" },
  nor: { label: "Norepinephrine", unit: "µmol/mol", group: "Catecholamines" },
  epi: { label: "Epinephrine", unit: "µmol/mol", group: "Catecholamines" },
  hva: { label: "HVA", unit: "mmol/mol", group: "Catecholamines" },
  vma: { label: "VMA", unit: "mmol/mol", group: "Catecholamines" },
  mhpg: { label: "MHPG", unit: "mmol/mol", group: "Catecholamines" },
  dopac: { label: "DOPAC", unit: "mg/g", group: "Catecholamines" },
  ser: { label: "Serotonin", unit: "µmol/mol", group: "Monoamines" },
  hiaa: { label: "5-HIAA", unit: "mmol/mol", group: "Monoamines" },
};

export default async function AnalyticsPage() {
  const cohort = await getCohort();
  const total = cohort.total_patients;

  const groups = ["Cortisol", "Adrenal", "Catecholamines", "Monoamines"] as const;
  const grouped: Record<string, [BiomarkerKey, typeof BIOMARKER_LABEL[BiomarkerKey]][]> = {};
  for (const k of Object.keys(BIOMARKER_LABEL) as BiomarkerKey[]) {
    const meta = BIOMARKER_LABEL[k]!;
    grouped[meta.group] = grouped[meta.group] || [];
    grouped[meta.group].push([k, meta]);
  }

  return (
    <AppShell active="analytics">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">Cohort analytics</h1>
        <p className="text-sm text-ink-600 mt-1">
          Population-level distributions across the {total.toLocaleString()}-patient synthetic cohort.
        </p>
      </div>

      {/* Headline metrics */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Metric label="Patients" value={total.toLocaleString()} />
        <Metric label="Visits scored" value={cohort.scored_visits.toLocaleString()} />
        <Metric label="Mean score" value={cohort.score_stats.mean.toFixed(1)} />
        <Metric label="Median" value={cohort.score_stats.median.toFixed(1)} />
        <Metric label="P25" value={cohort.score_stats.p25.toFixed(1)} />
        <Metric label="P75" value={cohort.score_stats.p75.toFixed(1)} />
      </section>

      {/* Phenotype × tier — engine validation */}
      <section className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink-900 mb-1">Phenotype × tier — engine validation</h2>
        <p className="text-xs text-ink-500 mb-4">
          How the v2.9.1 score engine assigns tiers across the 7 ground-truth phenotypes. A
          well-behaved engine puts <span className="font-medium">Healthy</span> in T1 and{" "}
          <span className="font-medium">AdrenalFatigue</span> in T4.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-xs text-ink-500 border-b border-ink-100">
                <th className="text-left py-2 pr-4">Phenotype</th>
                {(["T1", "T2", "T3", "T4"] as const).map((t) => (
                  <th key={t} className="text-right py-2 px-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLOR[t] }} />
                      {t}
                    </span>
                  </th>
                ))}
                <th className="text-right py-2 px-3 text-ink-500">total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cohort.phenotype_x_tier).map(([pheno, tiers]) => {
                const cells = (["T1", "T2", "T3", "T4"] as const).map((t) => tiers[t] || 0);
                const rowTotal = cells.reduce((a, b) => a + b, 0);
                const max = Math.max(...cells);
                return (
                  <tr key={pheno} className="border-b border-ink-100">
                    <td className="py-2 pr-4">
                      <div className="font-medium" style={{ color: PHENOTYPE_COLOR[pheno as Phenotype] }}>
                        {pheno}
                      </div>
                      <div className="text-[11px] text-ink-500 max-w-md">
                        {PHENOTYPE_DESCRIPTION[pheno as Phenotype]}
                      </div>
                    </td>
                    {cells.map((v, i) => {
                      const pct = rowTotal > 0 ? v / rowTotal : 0;
                      const isMax = v === max && v > 0;
                      const tier = (["T1", "T2", "T3", "T4"] as const)[i];
                      return (
                        <td
                          key={i}
                          className="py-2 px-3 text-right relative"
                          style={
                            isMax
                              ? { background: TIER_COLOR[tier] + "15" }
                              : undefined
                          }
                        >
                          <div className="num font-medium">{v.toLocaleString()}</div>
                          <div className="text-[10px] text-ink-500 num">{(pct * 100).toFixed(0)}%</div>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right num text-ink-600">{rowTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tier × age (matrix view) */}
      <section className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Tier × age band</h2>
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-xs text-ink-500 border-b border-ink-100">
                <th className="text-left py-2 pr-4">Age band</th>
                {(["T1", "T2", "T3", "T4"] as const).map((t) => (
                  <th key={t} className="text-right py-2 px-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLOR[t] }} />
                      {t}
                    </span>
                  </th>
                ))}
                <th className="text-right py-2 px-3 text-ink-500">total</th>
              </tr>
            </thead>
            <tbody>
              {(["<30", "30-39", "40-49", "50-59", "60+"] as const).map((band) => {
                const cells = (["T1", "T2", "T3", "T4"] as const).map(
                  (t) => cohort.tier_x_age?.[t]?.[band] || 0
                );
                const rowTotal = cells.reduce((a, b) => a + b, 0);
                return (
                  <tr key={band} className="border-b border-ink-100">
                    <td className="py-2 pr-4 font-medium text-ink-800">{band}</td>
                    {cells.map((v, i) => {
                      const pct = rowTotal > 0 ? v / rowTotal : 0;
                      return (
                        <td key={i} className="py-2 px-3 text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="num font-medium">{v.toLocaleString()}</span>
                            <span className="text-[11px] text-ink-500 num">
                              {(pct * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right num text-ink-600">{rowTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Floor-rule co-occurrence */}
      <section className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Floor-rule co-occurrence</h2>
        <p className="text-xs text-ink-500 mb-4">
          Most frequent rule-pair triggers across the cohort.
        </p>
        <div className="space-y-1.5">
          {Object.entries(cohort.rule_co_occurrence)
            .filter(([k]) => !k.includes("DISPLAY-1"))
            .slice(0, 12)
            .map(([pair, count]) => {
              const [a, b] = pair.split("|");
              const pct = (count / total) * 100;
              return (
                <div key={pair} className="flex items-center gap-3 py-1">
                  <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
                    <span className="chip">{a}</span>
                    <span className="text-ink-400">+</span>
                    <span className="chip">{b}</span>
                  </div>
                  <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden max-w-md">
                    <div
                      className="h-full bg-tier3"
                      style={{ width: `${Math.min(100, pct * 5)}%` }}
                    />
                  </div>
                  <div className="num text-xs text-ink-500 w-24 text-right">
                    {count.toLocaleString()} · {pct.toFixed(2)}%
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Phase distribution */}
      <section className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Recommended intervention phase</h2>
        <p className="text-xs text-ink-500 mb-4">
          Phase entry derived from §7 framework — HPA-first, SER-before-DA principles.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: 6 }, (_, i) => i + 1).map((phase) => {
            const count = cohort.phase_counts[String(phase)] || 0;
            const pct = (count / total) * 100;
            return (
              <div key={phase} className="text-center">
                <div className="text-xs text-ink-500">Phase {phase}</div>
                <div className="num text-xl font-semibold text-ink-900 mt-1">
                  {count.toLocaleString()}
                </div>
                <div className="text-[11px] text-ink-500 num">{pct.toFixed(1)}%</div>
                <div className="h-1 bg-ink-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-tier3" style={{ width: `${pct * 1.4}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Biomarker distributions */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-1">Biomarker distributions</h2>
        <p className="text-xs text-ink-500 mb-4">
          Cohort summary statistics with reference range overlay. Each row shows your
          5th-95th percentile range against the laboratory LRL/URL.
        </p>
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <div className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
                {group}
              </div>
              <div className="space-y-1">
                {(grouped[group] || []).map(([key, meta]) => {
                  const stats = cohort.biomarker_summary[key as BiomarkerKey];
                  if (!stats) return null;
                  return (
                    <BiomarkerDistRow
                      key={key}
                      label={meta!.label}
                      unit={meta!.unit}
                      stats={stats}
                      total={total}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-500 uppercase tracking-wider">{label}</div>
      <div className="num text-2xl font-semibold text-ink-900 mt-1">{value}</div>
    </div>
  );
}

function BiomarkerDistRow({
  label,
  unit,
  stats,
  total,
}: {
  label: string;
  unit: string;
  stats: any;
  total: number;
}) {
  // map p5..p95 onto a 0..100 visual scale based on full range
  const lo = stats.min;
  const hi = stats.max;
  const span = Math.max(1e-9, hi - lo);
  const pct = (v: number) => ((v - lo) / span) * 100;
  const inRange = stats.in_range != null ? (stats.in_range / total) * 100 : null;

  return (
    <div className="grid grid-cols-12 gap-3 items-center py-1.5 border-b border-ink-100 last:border-0">
      <div className="col-span-3 text-sm">
        <div className="font-medium text-ink-900">{label}</div>
        <div className="text-[11px] text-ink-500 num">{unit}</div>
      </div>
      <div className="col-span-6 relative h-3 bg-ink-100 rounded-full">
        {/* reference band */}
        {stats.lrl != null && stats.url != null && (
          <div
            className="absolute top-0 bottom-0 bg-tier1/25 rounded-full"
            style={{ left: `${pct(stats.lrl)}%`, width: `${pct(stats.url) - pct(stats.lrl)}%` }}
          />
        )}
        {/* p5-p95 range */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-ink-400 rounded-full"
          style={{ left: `${pct(stats.p5)}%`, width: `${pct(stats.p95) - pct(stats.p5)}%` }}
        />
        {/* median */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-ink-900"
          style={{ left: `${pct(stats.median)}%` }}
        />
      </div>
      <div className="col-span-3 text-right text-xs num text-ink-600">
        median <span className="text-ink-900 font-medium">{stats.median}</span>
        {inRange != null && (
          <span className="text-ink-500 ml-2">{inRange.toFixed(0)}% in range</span>
        )}
      </div>
    </div>
  );
}
