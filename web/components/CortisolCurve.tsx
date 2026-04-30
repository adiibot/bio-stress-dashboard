"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

// reference bands per Sorcova methodology §2 (NR table)
const REF: Record<string, { lrl: number; url: number; t: number; label: string }> = {
  m1: { lrl: 5.0, url: 17.1, t: 0, label: "wake" },
  m2: { lrl: 7.5, url: 25.6, t: 0.5, label: "+30m" },
  m3: { lrl: 1.9, url: 5.2, t: 4.5, label: "noon" },
  m4: { lrl: 0.3, url: 3.0, t: 10.5, label: "evening" },
  m5: { lrl: 0.3, url: 1.4, t: 14.5, label: "night" },
};

export function CortisolCurve({
  values,
  height = 240,
}: {
  values: { m1: number; m2: number; m3: number; m4: number; m5: number };
  height?: number;
}) {
  const data = (["m1", "m2", "m3", "m4", "m5"] as const).map((k) => ({
    t: REF[k].t,
    label: REF[k].label,
    lrl: REF[k].lrl,
    url: REF[k].url,
    value: values[k],
    band: [REF[k].lrl, REF[k].url],
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="#f4f4f5" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e4e7" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "nmol/L", angle: -90, position: "insideLeft", offset: 12, fontSize: 10, fill: "#a1a1aa" }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
            formatter={(v: number, name: string) => {
              if (name === "value") return [v?.toFixed?.(2), "your value"];
              if (name === "band") return [`${(v as any)[0]}–${(v as any)[1]}`, "reference"];
              return v;
            }}
          />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="#10b981"
            fillOpacity={0.08}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ r: 4, fill: "#0f172a", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#f97316" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
