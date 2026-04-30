import Link from "next/link";
import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
  TRAJECTORY_COLOR,
  type Neighbor,
  type Phenotype,
  type Trajectory,
} from "@/lib/types";

export function NeighborsPanel({ neighbors }: { neighbors: Neighbor[] }) {
  if (neighbors.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white border border-ink-100 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
            Similar patients
          </div>
          <div className="serif text-lg text-ink-900 leading-tight">
            5 nearest neighbours in biomarker space.
          </div>
        </div>
        <span className="text-[11px] text-ink-400">cosine sim · z-scored</span>
      </div>

      <ol className="divide-y divide-ink-100">
        {neighbors.map((n, i) => {
          const tierColor = TIER_COLOR[n.tier];
          const phenoColor = n.phenotype ? PHENOTYPE_COLOR[n.phenotype as Phenotype] : "#a1a1aa";
          const trajColor = n.trajectory ? TRAJECTORY_COLOR[n.trajectory as Trajectory] : "#a1a1aa";
          return (
            <li key={n.id}>
              <Link
                href={`/doctor/p?id=${n.id}`}
                className="flex items-center gap-3 py-2.5 px-1 hover:bg-ink-50/60 transition rounded-md group"
              >
                <span className="text-[10px] text-ink-400 num w-3">{i + 1}</span>
                <span
                  className="w-1 h-9 rounded-full shrink-0"
                  style={{ background: tierColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="num text-sm font-medium text-ink-900 group-hover:text-tier3 truncate">
                      {n.id}
                    </span>
                    <span className="num text-xs font-semibold" style={{ color: tierColor }}>
                      {n.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-ink-500">
                    <span className="num">
                      {n.sex ?? "?"} · {n.age != null ? n.age.toFixed(0) : "?"}
                    </span>
                    {n.phenotype && (
                      <>
                        <span className="text-ink-300">·</span>
                        <span style={{ color: phenoColor }} className="truncate">
                          {n.phenotype}
                        </span>
                      </>
                    )}
                    {n.trajectory && (
                      <span className="ml-auto" style={{ color: trajColor }}>
                        {n.trajectory === "recovery" ? "↓" : n.trajectory === "decline" ? "↑" : "→"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="num text-xs font-medium text-ink-900">
                    {(n.similarity * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-ink-400">match</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 pt-3 border-t border-ink-100 text-[11px] text-ink-500 leading-relaxed">
        Computed offline as cosine similarity over the 21-marker z-scored biomarker
        vector. Useful for "what happened to patients like this one" — click any row
        to deep-dive.
      </p>
    </section>
  );
}
