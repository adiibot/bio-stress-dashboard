"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  Dot,
} from "recharts";
import { TIER_COLOR, type Tier, type VisitPoint } from "@/lib/types";

const TIER_BANDS = [
  { y1: 0, y2: 16, color: "#10b981", label: "T1" },
  { y1: 16, y2: 26, color: "#f59e0b", label: "T2" },
  { y1: 26, y2: 33, color: "#f97316", label: "T3" },
  { y1: 33, y2: 100, color: "#e11d48", label: "T4" },
];

export function TrajectoryChart({
  data,
  height = 240,
  showAxisLines = false,
}: {
  data: VisitPoint[];
  height?: number;
  showAxisLines?: boolean;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-ink-500" style={{ height }}>
        No visit history available.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: d.month,
    score: d.score,
    hpa: d.hpa,
    adrenal: d.adrenal,
    nt: d.nt,
    visit: d.visit,
    tier: d.tier,
  }));

  const lastVisit = chartData[chartData.length - 1];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#f4f4f5" strokeDasharray="0" vertical={false} />
          {/* tier bands */}
          {TIER_BANDS.map((b) => (
            <ReferenceArea
              key={b.label}
              y1={b.y1}
              y2={b.y2}
              fill={b.color}
              fillOpacity={0.06}
              stroke="none"
            />
          ))}
          <XAxis
            dataKey="month"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e4e7" }}
            label={{ value: "months from baseline", position: "insideBottom", offset: -2, fontSize: 10, fill: "#a1a1aa" }}
          />
          <YAxis
            domain={[0, 60]}
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
            formatter={(v: any, name: string) => [Number(v).toFixed(1), name]}
            labelFormatter={(m: any) => `${Number(m).toFixed(1)} months`}
          />
          {showAxisLines && (
            <>
              <Line type="monotone" dataKey="hpa" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="HPA" isAnimationActive={false} />
              <Line type="monotone" dataKey="adrenal" stroke="#facc15" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Adrenal" isAnimationActive={false} />
              <Line type="monotone" dataKey="nt" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="NT" isAnimationActive={false} />
            </>
          )}
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0f172a"
            strokeWidth={2.5}
            name="Score"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const fill = TIER_COLOR[payload.tier as Tier];
              return <circle key={`d-${payload.visit}`} cx={cx} cy={cy} r={4} fill={fill} stroke="#fff" strokeWidth={2} />;
            }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
