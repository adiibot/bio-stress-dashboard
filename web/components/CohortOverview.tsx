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
  PieChart,
  Pie,
  ReferenceArea,
} from "recharts";
import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
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

export function CohortOverview({ cohort }: { cohort: CohortAggregate }) {
  const tiers: Tier[] = ["T1", "T2", "T3", "T4"];
  const tierData = tiers.map((t) => ({
    tier: t,
    count: cohort.tier_counts[t] || 0,
    color: TIER_COLOR[t],
  }));

  const histData = Object.entries(cohort.score_histogram)
    .map(([bin, count]) => ({ bin: Number(bin), count }))
    .sort((a, b) => a.bin - b.bin);

  const ruleData = Object.entries(cohort.rule_prevalence)
    .filter(([k]) => k !== "DISPLAY-1")
    .map(([rule, count]) => ({ rule, count }))
    .slice(0, 8);

  const phenoData = Object.entries(cohort.phenotype_counts).map(([p, c]) => ({
    phenotype: p,
    count: c,
    color: PHENOTYPE_COLOR[p as Phenotype] || "#71717a",
  }));

  const trajData = Object.entries(cohort.trajectory_counts).map(([t, c]) => ({
    trajectory: t,
    count: c,
    color: TRAJECTORY_COLOR[t as Trajectory] || "#71717a",
  }));

  // build trajectory curve series
  const months = new Set<number>();
  Object.values(cohort.trajectory_curves).forEach((curve) => {
    curve.forEach((p) => months.add(p.month));
  });
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
    <div className="space-y-5">
      {/* Top row — tier + score histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Risk-tier distribution" subtitle={`${cohort.total_patients.toLocaleString()} patients · latest visit per patient`}>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={tierData}
                  dataKey="count"
                  nameKey="tier"
                  cx="50%" cy="50%"
                  innerRadius={56} outerRadius={90}
                  paddingAngle={2}
                  stroke="#fff" strokeWidth={2}
                >
                  {tierData.map((d) => (
                    <Cell key={d.tier} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [v.toLocaleString(), "patients"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {tierData.map((d) => (
              <div key={d.tier} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs text-ink-500">{d.tier}</span>
                </div>
                <div className="num text-base font-semibold">{d.count.toLocaleString()}</div>
                <div className="text-[11px] text-ink-500">
                  {((d.count / cohort.total_patients) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Score distribution" subtitle="histogram, 5-point bins">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={histData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="bin" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: any) => [v.toLocaleString(), "patients"]}
                  labelFormatter={(l) => `score ${l}–${Number(l) + 5}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
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
          <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
            <Stat k="mean" v={cohort.score_stats.mean.toFixed(1)} />
            <Stat k="median" v={cohort.score_stats.median.toFixed(1)} />
            <Stat k="p25" v={cohort.score_stats.p25.toFixed(1)} />
            <Stat k="p75" v={cohort.score_stats.p75.toFixed(1)} />
          </div>
        </Card>
      </div>

      {/* Trajectory curve — the headline new chart */}
      <Card
        title="Score trajectory by class — population averages"
        subtitle="recovery patients drop, decline patients climb, stable holds. month-binned mean score across all valid visits."
      >
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={curveSeries} margin={{ top: 14, right: 16, bottom: 6, left: 0 }}>
              <CartesianGrid stroke="#f4f4f5" vertical={false} />
              {TIER_BANDS.map((b, i) => (
                <ReferenceArea key={i} y1={b.y1} y2={b.y2} fill={b.color} fillOpacity={0.04} stroke="none" />
              ))}
              <XAxis
                dataKey="month"
                type="number"
                domain={[0, "dataMax"]}
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false} axisLine={{ stroke: "#e4e4e7" }}
                label={{ value: "months from baseline", position: "insideBottom", offset: -2, fontSize: 10, fill: "#a1a1aa" }}
              />
              <YAxis
                domain={[0, 30]}
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false} axisLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: any, name: string) => [Number(v).toFixed(1), TRAJECTORY_LABEL[name as Trajectory] ?? name]}
              />
              <Line type="monotone" dataKey="recovery" stroke={TRAJECTORY_COLOR.recovery} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="stable" stroke={TRAJECTORY_COLOR.stable} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="decline" stroke={TRAJECTORY_COLOR.decline} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
          {(["recovery", "stable", "decline"] as Trajectory[]).map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="block w-3 h-0.5 rounded" style={{ background: TRAJECTORY_COLOR[t] }} />
              <span className="text-ink-700">{TRAJECTORY_LABEL[t]}</span>
              <span className="text-ink-500 num ml-auto">
                {(cohort.trajectory_counts[t] || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Phenotype + tier × age + rules row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Ground-truth phenotype" subtitle="synthetic-cohort baseline label">
          <div className="space-y-1.5 mt-1">
            {phenoData.map((d) => {
              const pct = (d.count / cohort.total_patients) * 100;
              return (
                <div key={d.phenotype}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium" style={{ color: d.color }}>{d.phenotype}</span>
                    <span className="num text-ink-500">
                      {d.count.toLocaleString()} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct * 3}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Trajectory class" subtitle="patient-level direction tag">
          <div className="space-y-3 mt-2">
            {trajData.map((d) => {
              const pct = (d.count / cohort.total_patients) * 100;
              return (
                <div key={d.trajectory}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: d.color }}>
                      {d.trajectory === "recovery" ? "↓" : d.trajectory === "decline" ? "↑" : "→"} {TRAJECTORY_LABEL[d.trajectory as Trajectory]}
                    </span>
                    <span className="num text-xs text-ink-500">
                      {d.count.toLocaleString()} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${pct * 1.4}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Floor-rule prevalence" subtitle="rules triggered on latest visit">
          <div className="space-y-2 mt-1">
            {ruleData.map((d) => {
              const pct = (d.count / cohort.total_patients) * 100;
              return (
                <div key={d.rule}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium text-ink-800">{d.rule}</span>
                    <span className="num text-ink-500">
                      {d.count.toLocaleString()} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-tier3" style={{ width: `${Math.min(100, pct * 1.4)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold text-ink-900">{title}</div>
        {subtitle && <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-center">
      <div className="text-[11px] text-ink-500 uppercase tracking-wider">{k}</div>
      <div className="num font-medium text-ink-900">{v}</div>
    </div>
  );
}
