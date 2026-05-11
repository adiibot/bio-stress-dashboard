"use client";
import {
  AXIS_TONE_COLOR,
  AXIS_TONE_VERB,
  axisTone,
} from "@/lib/types";

const AXES = [
  { key: "hpa" as const, name: "HPA axis", helper: "cortisol rhythm" },
  { key: "adrenal" as const, name: "Adrenal reserve", helper: "DHEA + ratio" },
  { key: "nt" as const, name: "Neurotransmitter", helper: "cat + mon" },
];

export function AxisScoreTrio({
  values,
  variant = "patient",
}: {
  values: { hpa: number; adrenal: number; nt: number };
  variant?: "patient" | "clinician";
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {AXES.map((a) => {
        const v = values[a.key];
        const tone = axisTone(v);
        const color = AXIS_TONE_COLOR[tone];
        const verb = AXIS_TONE_VERB[tone];
        return (
          <div
            key={a.key}
            className="rounded-xl border border-ink-100 bg-white px-4 py-3"
          >
            <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500 mb-1">
              {a.name}
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="serif text-2xl font-light tracking-tight"
                style={{ color }}
              >
                {v.toFixed(0)}
              </span>
              {variant === "clinician" ? (
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color }}
                >
                  {tone}
                </span>
              ) : (
                <span
                  className="text-[11px] font-medium"
                  style={{ color }}
                >
                  {verb}
                </span>
              )}
            </div>
            <div className="mt-2 h-1 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, v * 1.4)}%`,
                  background: color,
                }}
              />
            </div>
            <div className="text-[10px] text-ink-400 mt-1.5">{a.helper}</div>
          </div>
        );
      })}
    </div>
  );
}
