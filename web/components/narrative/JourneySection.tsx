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
  Area,
} from "recharts";
import { TIER_COLOR, type Tier, type VisitPoint } from "@/lib/types";

const TIER_BANDS = [
  { y1: 0, y2: 16, color: "#10b981" },
  { y1: 16, y2: 26, color: "#f59e0b" },
  { y1: 26, y2: 33, color: "#f97316" },
  { y1: 33, y2: 100, color: "#e11d48" },
];

export function JourneyChart({ data }: { data: VisitPoint[] }) {
  const chart = data.map((d) => ({
    month: d.month,
    score: d.score,
    visit: d.visit,
    tier: d.tier,
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <ComposedChart data={chart} margin={{ top: 24, right: 16, bottom: 12, left: 0 }}>
          <defs>
            <linearGradient id="journeyArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f4f4f5" strokeDasharray="0" vertical={false} />
          {TIER_BANDS.map((b, i) => (
            <ReferenceArea
              key={i}
              y1={b.y1}
              y2={b.y2}
              fill={b.color}
              fillOpacity={0.05}
              stroke="none"
            />
          ))}
          <XAxis
            dataKey="month"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "months from baseline",
              position: "insideBottom",
              offset: -2,
              fontSize: 10,
              fill: "#d4d4d8",
            }}
          />
          <YAxis
            domain={[0, 60]}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 12,
              border: "1px solid #e4e4e7",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            }}
            formatter={(v: any) => [Number(v).toFixed(1), "score"]}
            labelFormatter={(m: any) => `${Number(m).toFixed(1)} months in`}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="none"
            fill="url(#journeyArea)"
            isAnimationActive={true}
            animationDuration={1400}
            animationBegin={300}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0f172a"
            strokeWidth={2.5}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={`d-${payload.visit}`}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill={TIER_COLOR[payload.tier as Tier]}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
            isAnimationActive={true}
            animationDuration={1400}
            animationBegin={150}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function JourneySection({
  data,
  delta,
  scoreNow,
}: {
  data: VisitPoint[];
  delta: number | null;
  scoreNow: number;
}) {
  if (data.length === 0) return null;

  const first = data[0];
  const span = data[data.length - 1].month - first.month;
  const direction =
    delta == null
      ? "is just beginning"
      : delta < -3
      ? `has dropped ${Math.abs(delta).toFixed(0)} points`
      : delta > 3
      ? `has climbed ${Math.abs(delta).toFixed(0)} points`
      : "has held steady";

  const accent =
    delta == null
      ? "text-ink-700"
      : delta < -3
      ? "text-tier1"
      : delta > 3
      ? "text-tier4"
      : "text-ink-700";

  return (
    <div>
      {data.length > 1 ? (
        <p className="text-ink-700 text-lg leading-relaxed max-w-xl mb-6">
          Across your past <em className="lit">{data.length}</em> visits — about{" "}
          <em className="lit">{span.toFixed(0)} months</em> — your score{" "}
          <span className={`${accent} font-medium`}>{direction}</span>. Today you're at{" "}
          <span className="num font-medium text-ink-900">{scoreNow.toFixed(1)}</span>.
        </p>
      ) : (
        <p className="text-ink-700 text-lg leading-relaxed max-w-xl mb-6">
          This is your first visit. We'll show your journey here once you have a
          follow-up. For now, today's score is{" "}
          <span className="num font-medium text-ink-900">{scoreNow.toFixed(1)}</span>.
        </p>
      )}
      <JourneyChart data={data} />
      <div className="mt-3 text-xs text-ink-500 leading-relaxed max-w-xl">
        Each dot is a visit. The colour is your tier on that day. The pale green
        band at the bottom is the safest range; the rose band at the top is the
        most concerning.
      </div>
    </div>
  );
}
