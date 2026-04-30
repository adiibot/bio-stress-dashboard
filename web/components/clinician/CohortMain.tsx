"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceArea,
} from "recharts";
import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
  TIER_LABEL,
  TRAJECTORY_COLOR,
  TRAJECTORY_LABEL,
  type CohortAggregate,
  type Phenotype,
  type Tier,
  type Trajectory,
} from "@/lib/types";

const TIER_BANDS = [
  { y1: 0, y2: 16, color: "#10b981" },
  { y1: 16, y2: 26, color: "#f59e0b" },
  { y1: 26, y2: 33, color: "#f97316" },
  { y1: 33, y2: 100, color: "#e11d48" },
];

export function CohortMain({ cohort }: { cohort: CohortAggregate }) {
  const tiers: Tier[] = ["T1", "T2", "T3", "T4"];

  const histData = Object.entries(cohort.score_histogram)
    .map(([bin, count]) => ({ bin: Number(bin), count }))
    .sort((a, b) => a.bin - b.bin);

  // trajectory curves
  const months = new Set<number>();
  Object.values(cohort.trajectory_curves).forEach((c) =>
    c.forEach((p) => months.add(p.month))
  );
  const monthList = Array.from(months).sort((a, b) => a - b);
  const curveSeries = monthList.map((m) => {
    const row: any = { month: m };
    Object.entries(cohort.trajectory_curves).forEach(([traj, curve]) => {
      const pt = curve.find((p) => p.month === m);
      if (pt) row[traj] = pt.score;
    });
    return row;
  });

  return (
    <div className="px-6 lg:px-8 py-8 max-w-[1400px]">
      {/* hero */}
      <div className="rise rise-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-3">
          Cohort overview
        </div>
        <h1 className="serif text-3xl lg:text-4xl text-ink-900 leading-tight max-w-3xl mb-3">
          {cohort.total_patients.toLocaleString()} patients · {cohort.scored_visits.toLocaleString()} scored visits.
        </h1>
        <p className="text-ink-600 max-w-3xl text-[15px] leading-relaxed">
          Latest-visit snapshot across the cohort. Click a patient in the sidebar
          to deep-dive — every score, rule trigger, and audit field surfaces in
          the main pane.
        </p>
      </div>

      {/* tier strip */}
      <div className="rise rise-2 mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiers.map((t) => {
          const count = cohort.tier_counts[t] || 0;
          const pct = (count / cohort.total_patients) * 100;
          return (
            <div
              key={t}
              className="rounded-xl bg-white border border-ink-100 p-4 hover:shadow-card transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: TIER_COLOR[t] }}
                />
                <span className="text-[11px] uppercase tracking-wider text-ink-500">
                  {t}
                </span>
              </div>
              <div className="num text-2xl font-semibold text-ink-900">
                {count.toLocaleString()}
              </div>
              <div className="text-xs text-ink-500 num mt-0.5">
                {pct.toFixed(1)}% of cohort
              </div>
              <div className="mt-3 h-1 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct * 1.4}%`, background: TIER_COLOR[t] }}
                />
              </div>
              <div className="text-[10px] text-ink-500 mt-2 leading-tight">
                {TIER_LABEL[t].replace(/^Tier \d — /, "")}
              </div>
            </div>
          );
        })}
      </div>

      {/* trajectory hero chart */}
      <section className="rise rise-3 mt-10">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
          Score trajectory by class
        </div>
        <h2 className="serif text-2xl text-ink-900 leading-tight mb-1">
          Recovery patients drop. Decline patients climb. Stable holds.
        </h2>
        <p className="text-ink-500 text-sm mb-5 max-w-2xl">
          Month-binned mean score across all valid visits, faceted by ground-truth
          trajectory class.
        </p>
        <div className="rounded-2xl bg-white border border-ink-100 p-5">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={curveSeries} margin={{ top: 14, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                {TIER_BANDS.map((b, i) => (
                  <ReferenceArea
                    key={i}
                    y1={b.y1}
                    y2={b.y2}
                    fill={b.color}
                    fillOpacity={0.04}
                    stroke="none"
                  />
                ))}
                <XAxis
                  dataKey="month"
                  type="number"
                  domain={[0, "dataMax"]}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e4e7" }}
                  label={{
                    value: "months from baseline",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 10,
                    fill: "#d4d4d8",
                  }}
                />
                <YAxis
                  domain={[0, 30]}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    border: "1px solid #e4e4e7",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                  }}
                  formatter={(v: any, n: string) => [Number(v).toFixed(1), TRAJECTORY_LABEL[n as Trajectory] ?? n]}
                />
                <Line type="monotone" dataKey="recovery" stroke={TRAJECTORY_COLOR.recovery} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="stable" stroke={TRAJECTORY_COLOR.stable} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="decline" stroke={TRAJECTORY_COLOR.decline} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-xs border-t border-ink-100 pt-4">
            {(["recovery", "stable", "decline"] as Trajectory[]).map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span
                  className="block w-3 h-0.5 rounded"
                  style={{ background: TRAJECTORY_COLOR[t] }}
                />
                <span className="text-ink-700">{TRAJECTORY_LABEL[t]}</span>
                <span className="text-ink-500 num ml-auto">
                  {(cohort.trajectory_counts[t] || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score distribution + Phenotype */}
      <div className="rise rise-4 mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Block
          eyebrow="Score distribution"
          title="Where the cohort sits."
        >
          <div className="rounded-2xl bg-white border border-ink-100 p-5">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={histData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#f4f4f5" vertical={false} />
                  <XAxis
                    dataKey="bin"
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e4e4e7" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => [v.toLocaleString(), "patients"]}
                    labelFormatter={(l) => `score ${l}–${Number(l) + 5}`}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e4e4e7" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {histData.map((d) => {
                      const t: Tier = d.bin < 16 ? "T1" : d.bin < 26 ? "T2" : d.bin < 33 ? "T3" : "T4";
                      return <Cell key={d.bin} fill={TIER_COLOR[t]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4 text-xs border-t border-ink-100 pt-3">
              <Stat label="mean" value={cohort.score_stats.mean.toFixed(1)} />
              <Stat label="median" value={cohort.score_stats.median.toFixed(1)} />
              <Stat label="p25" value={cohort.score_stats.p25.toFixed(1)} />
              <Stat label="p75" value={cohort.score_stats.p75.toFixed(1)} />
            </div>
          </div>
        </Block>

        <Block
          eyebrow="Ground-truth phenotype"
          title="The cohort's clinical mix."
        >
          <div className="rounded-2xl bg-white border border-ink-100 p-5">
            <div className="space-y-2">
              {Object.entries(cohort.phenotype_counts).map(([p, c]) => {
                const pct = (c / cohort.total_patients) * 100;
                const color = PHENOTYPE_COLOR[p as Phenotype] || "#71717a";
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium" style={{ color }}>
                        {p}
                      </span>
                      <span className="num text-ink-500">
                        {c.toLocaleString()} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct * 3}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Block>
      </div>

      {/* Rules + trajectory + age */}
      <div className="rise rise-5 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Block eyebrow="Trajectory" title="Direction tags.">
          <div className="rounded-2xl bg-white border border-ink-100 p-5 space-y-4">
            {Object.entries(cohort.trajectory_counts).map(([t, c]) => {
              const pct = (c / cohort.total_patients) * 100;
              const color = TRAJECTORY_COLOR[t as Trajectory] || "#71717a";
              return (
                <div key={t}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color }}>
                      {t === "recovery" ? "↓" : t === "decline" ? "↑" : "→"}{" "}
                      {TRAJECTORY_LABEL[t as Trajectory]}
                    </span>
                    <span className="num text-xs text-ink-500">
                      {c.toLocaleString()} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${pct * 1.4}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Block>

        <Block eyebrow="Floor rules" title="Most-fired triggers.">
          <div className="rounded-2xl bg-white border border-ink-100 p-5 space-y-2.5">
            {Object.entries(cohort.rule_prevalence)
              .filter(([k]) => k !== "DISPLAY-1")
              .slice(0, 7)
              .map(([rule, count]) => {
                const pct = (count / cohort.total_patients) * 100;
                return (
                  <div key={rule}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-ink-800">{rule}</span>
                      <span className="num text-ink-500">
                        {count.toLocaleString()} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tier3"
                        style={{ width: `${Math.min(100, pct * 1.4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Block>

        <Block eyebrow="Tier × age" title="Where load lands by decade.">
          <div className="rounded-2xl bg-white border border-ink-100 p-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
                  <th className="text-left py-1.5">band</th>
                  {tiers.map((t) => (
                    <th key={t} className="text-right py-1.5 px-2">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: TIER_COLOR[t] }}
                        />
                        {t}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["<30", "30-39", "40-49", "50-59", "60+"] as const).map((band) => {
                  const cells = tiers.map((t) => cohort.tier_x_age?.[t]?.[band] || 0);
                  const total = cells.reduce((a, b) => a + b, 0);
                  const max = Math.max(...cells);
                  return (
                    <tr key={band} className="border-b border-ink-100 last:border-0">
                      <td className="py-1.5 text-ink-800 font-medium">{band}</td>
                      {cells.map((v, i) => (
                        <td key={i} className="py-1.5 px-2 text-right num">
                          <span
                            className={v === max && v > 0 ? "text-ink-900 font-semibold" : "text-ink-500"}
                          >
                            {v.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-ink-400 block">
                            {total > 0 ? `${((v / total) * 100).toFixed(0)}%` : ""}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Block>
      </div>
    </div>
  );
}

function Block({
  eyebrow, title, children,
}: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
        {eyebrow}
      </div>
      <h3 className="serif text-lg text-ink-900 leading-tight mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-ink-400 uppercase tracking-wider">
        {label}
      </div>
      <div className="num text-sm font-semibold text-ink-900 mt-0.5">{value}</div>
    </div>
  );
}
