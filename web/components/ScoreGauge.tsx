"use client";
import { TIER_COLOR, type Tier } from "@/lib/types";

export function ScoreGauge({
  score,
  tier,
  label,
  size = 220,
}: {
  score: number;
  tier: Tier;
  label?: string;
  size?: number;
}) {
  const r = size / 2 - 18;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = c * pct;
  const color = TIER_COLOR[tier];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="bg-gauge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f4f5" />
            <stop offset="100%" stopColor="#e4e4e7" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#bg-gauge)"
          strokeWidth={14}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="num text-5xl font-semibold tracking-tight" style={{ color }}>
          {score.toFixed(1)}
        </div>
        <div className="text-xs text-ink-500 mt-1">/ 100</div>
        {label && <div className="text-xs text-ink-600 mt-2">{label}</div>}
      </div>
    </div>
  );
}
