import { TIER_COLOR, type Tier } from "@/lib/types";

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" | "lg" }) {
  const sz = {
    sm: "h-6 px-2 text-xs",
    md: "h-7 px-2.5 text-xs",
    lg: "h-9 px-3 text-sm",
  }[size];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sz} rounded-full font-semibold text-white num`}
      style={{ background: TIER_COLOR[tier] }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
      {tier}
    </span>
  );
}
