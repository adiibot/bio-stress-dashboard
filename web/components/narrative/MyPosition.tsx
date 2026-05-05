"use client";
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
  TIER_COLOR,
  TRAJECTORY_COLOR,
  type CohortAggregate,
  type Tier,
  type Trajectory,
} from "@/lib/types";

export function MyPosition({
  embedding,
  patient,
}: {
  embedding: CohortAggregate["embedding"];
  patient: { x: number; y: number; id: string; tier: Tier; trajectory: Trajectory | null };
}) {
  // group by trajectory for separate colours
  const groups = new Map<string, { color: string; data: any[] }>();
  for (const d of embedding.sample) {
    const key = d.trajectory || "?";
    const c = TRAJECTORY_COLOR[(d.trajectory ?? "stable") as Trajectory];
    if (!groups.has(key)) groups.set(key, { color: c, data: [] });
    groups.get(key)!.data.push(d);
  }

  return (
    <div className="rounded-2xl bg-white border border-ink-100 p-6">
      <div className="h-[360px]">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 12, right: 12, bottom: 24, left: 0 }}>
            <CartesianGrid stroke="#f4f4f5" />
            <XAxis
              type="number"
              dataKey="x"
              tick={{ fontSize: 10, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
              label={{
                value: "biomarker space — axis 1",
                position: "insideBottom",
                offset: -8,
                fontSize: 10,
                fill: "#a1a1aa",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              tick={{ fontSize: 10, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={false}
              label={{
                value: "axis 2",
                angle: -90,
                position: "insideLeft",
                offset: 18,
                fontSize: 10,
                fill: "#a1a1aa",
              }}
            />
            <ZAxis range={[16, 16]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                if (d.id === patient.id) {
                  return (
                    <div className="rounded-xl bg-ink-900 text-white shadow-card p-3 text-xs">
                      <div className="num font-medium">You</div>
                      <div className="text-white/70 mt-0.5">tier {patient.tier}</div>
                    </div>
                  );
                }
                return (
                  <div className="rounded-xl bg-white border border-ink-200 shadow-card p-3 text-xs">
                    <div className="text-ink-700">{d.trajectory ?? "?"} · tier {d.tier}</div>
                    <div className="text-ink-500 mt-0.5">score {d.score?.toFixed(1)}</div>
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
                fillOpacity={0.45}
                stroke={g.color}
                strokeOpacity={0.7}
                strokeWidth={0.4}
                isAnimationActive={false}
              />
            ))}
            <Scatter
              name="you"
              data={[patient]}
              isAnimationActive={false}
              shape={(props: any) => (
                <g>
                  <circle cx={props.cx} cy={props.cy} r={26} fill="none" stroke="#0f172a" strokeOpacity="0.18" strokeWidth="1" />
                  <circle cx={props.cx} cy={props.cy} r={16} fill="none" stroke="#0f172a" strokeOpacity="0.32" strokeWidth="1" />
                  <circle cx={props.cx} cy={props.cy} r={9} fill="#0f172a" stroke="#fff" strokeWidth="2.5" />
                </g>
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-ink-100 text-[11px]">
        {(["recovery", "stable", "decline"] as Trajectory[]).map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: TRAJECTORY_COLOR[t] }} />
            <span className="text-ink-700 capitalize">{t}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-500 leading-relaxed mt-3">
        Each dot is one patient in our cohort, placed by their biomarker pattern.
        You're the dark dot with the rings. Patients near you have similar biology.
      </p>
    </div>
  );
}
