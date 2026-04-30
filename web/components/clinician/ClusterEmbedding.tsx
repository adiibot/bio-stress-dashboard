"use client";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from "recharts";
import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
  TRAJECTORY_COLOR,
  type CohortAggregate,
  type Phenotype,
  type Tier,
  type Trajectory,
} from "@/lib/types";

type ColorBy = "phenotype" | "tier" | "trajectory";

export function ClusterEmbedding({
  embedding,
  highlight,
}: {
  embedding: CohortAggregate["embedding"];
  highlight?: { x: number; y: number; id: string }; // patient to highlight
}) {
  const [colorBy, setColorBy] = useState<ColorBy>("phenotype");

  const sample = embedding.sample;

  const colorOf = (d: any): string => {
    if (colorBy === "phenotype") return d.phenotype ? PHENOTYPE_COLOR[d.phenotype as Phenotype] : "#a1a1aa";
    if (colorBy === "tier") return TIER_COLOR[d.tier as Tier];
    return d.trajectory ? TRAJECTORY_COLOR[d.trajectory as Trajectory] : "#a1a1aa";
  };

  // group by colour key for separate <Scatter> series → distinct colours per group
  const groups = useMemo(() => {
    const m = new Map<string, { color: string; data: any[] }>();
    for (const d of sample) {
      const key =
        colorBy === "phenotype"
          ? d.phenotype || "?"
          : colorBy === "tier"
          ? d.tier
          : d.trajectory || "?";
      const c = colorOf(d);
      if (!m.has(key)) m.set(key, { color: c, data: [] });
      m.get(key)!.data.push(d);
    }
    return m;
  }, [sample, colorBy]);

  return (
    <section className="rise rise-6 mt-10">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
            Cluster embedding
          </div>
          <h2 className="serif text-2xl text-ink-900 leading-tight">
            The cohort in two principal components.
          </h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-500">
          <span className="mr-1">Colour by</span>
          {(["phenotype", "tier", "trajectory"] as ColorBy[]).map((m) => (
            <button
              key={m}
              onClick={() => setColorBy(m)}
              className={`px-2.5 py-1 rounded-md text-xs transition ${
                colorBy === m
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <p className="text-ink-500 text-sm mb-5 max-w-3xl">
        PCA on the z-scored 21-marker biomarker vector. Each dot is one patient's
        latest visit. PC1 captures{" "}
        <span className="num">{embedding.pc1_pct.toFixed(1)}%</span> of variance,
        PC2 <span className="num">{embedding.pc2_pct.toFixed(1)}%</span> — together
        about{" "}
        <span className="num">
          {(embedding.pc1_pct + embedding.pc2_pct).toFixed(0)}%
        </span>{" "}
        of total biomarker variance, the rest is in higher dimensions.
        Stratified down-sample of {sample.length.toLocaleString()} patients for
        rendering.
      </p>

      <div className="rounded-2xl bg-white border border-ink-100 p-5">
        <div className="h-[460px]">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 12, right: 16, bottom: 16, left: 0 }}>
              <CartesianGrid stroke="#f4f4f5" strokeDasharray="0" />
              <XAxis
                type="number"
                dataKey="x"
                name="PC1"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={{ stroke: "#e4e4e7" }}
                label={{
                  value: `PC1  ${embedding.pc1_pct.toFixed(1)}%`,
                  position: "insideBottom",
                  offset: -2,
                  fontSize: 11,
                  fill: "#a1a1aa",
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="PC2"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: `PC2  ${embedding.pc2_pct.toFixed(1)}%`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 16,
                  fontSize: 11,
                  fill: "#a1a1aa",
                }}
              />
              <ZAxis range={[24, 24]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 12,
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                }}
                formatter={(v: any) => Number(v).toFixed(2)}
                labelFormatter={() => ""}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl bg-white border border-ink-200 shadow-card p-3 text-xs">
                      <div className="num font-medium text-ink-900">{d.id}</div>
                      <div className="text-ink-500 mt-0.5">
                        {d.phenotype} · score {d.score?.toFixed(1)}{" "}
                        <span style={{ color: TIER_COLOR[d.tier as Tier] }}>{d.tier}</span>{" "}
                        ·{" "}
                        {d.trajectory === "recovery"
                          ? "↓"
                          : d.trajectory === "decline"
                          ? "↑"
                          : "→"}{" "}
                        {d.trajectory}
                      </div>
                    </div>
                  );
                }}
              />
              {Array.from(groups.entries()).map(([key, g]) => (
                <Scatter
                  key={key}
                  name={key}
                  data={g.data}
                  fill={g.color}
                  fillOpacity={0.55}
                  stroke={g.color}
                  strokeOpacity={0.9}
                  strokeWidth={0.5}
                  isAnimationActive={false}
                />
              ))}
              {highlight && (
                <Scatter
                  name="this patient"
                  data={[highlight]}
                  fill="#0f172a"
                  stroke="#fff"
                  strokeWidth={2}
                  isAnimationActive={false}
                  shape={(props: any) => (
                    <g>
                      <circle cx={props.cx} cy={props.cy} r={9} fill="#0f172a" stroke="#fff" strokeWidth="2.5" />
                      <circle cx={props.cx} cy={props.cy} r={16} fill="none" stroke="#0f172a" strokeOpacity="0.25" strokeWidth="1" />
                    </g>
                  )}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-ink-100 text-[11px]">
          {Array.from(groups.entries()).map(([key, g]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: g.color }}
              />
              <span className="text-ink-700">{key}</span>
              <span className="text-ink-400 num">·  {g.data.length}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
