"use client";
import type { BiomarkerKey } from "@/lib/types";

const NR: Record<BiomarkerKey, [number, number] | null> = {
  m1: [5.0, 17.1], m2: [7.5, 25.6], m3: [1.9, 5.2], m4: [0.3, 3.0], m5: [0.3, 1.4],
  car_pct: [50, 120], aucg: [32, 113], dcs: [-1.12, -0.24],
  dhea: [0.53, 2.44], cor_dhea: [5, 6],
  da: [108, 244], dopac: [0.7, 4.0], hva: [1.44, 3.17],
  nor: [11.1, 28.0], epi: [0.76, 4.23], vma: [1.04, 2.20], mhpg: [0.52, 1.13],
  ser: [38, 89], hiaa: [1.0, 3.3],
  nor_epi: [3, 7], hva_vma: [0.23, 2.83],
  hiaa_ser: [0.03, 0.08], da_ser: [1.5, 3.5], creatinine: [80, 120],
};

const LABEL: Partial<Record<BiomarkerKey, string>> = {
  m1: "Wake cortisol",
  m2: "+30 min cortisol",
  m3: "Noon cortisol",
  m4: "Evening cortisol",
  m5: "Night cortisol",
  dhea: "DHEA",
  cor_dhea: "Cortisol/DHEA ratio",
  da: "Dopamine",
  dopac: "DOPAC",
  hva: "HVA",
  nor: "Noradrenaline",
  epi: "Adrenaline",
  vma: "VMA",
  mhpg: "MHPG",
  ser: "Serotonin (peripheral)",
  hiaa: "5-HIAA",
  nor_epi: "NOR/EPI ratio",
  hva_vma: "HVA/VMA ratio",
  hiaa_ser: "Serotonin turnover",
  da_ser: "DA/Serotonin ratio",
};

const GROUPS: { title: string; subtitle: string; color: string; keys: BiomarkerKey[] }[] = [
  {
    title: "HPA axis",
    subtitle: "your daily cortisol rhythm",
    color: "#a78bfa",
    keys: ["m1", "m2", "m3", "m4", "m5"],
  },
  {
    title: "Adrenal reserve",
    subtitle: "your buffer hormone",
    color: "#facc15",
    keys: ["dhea", "cor_dhea"],
  },
  {
    title: "Catecholamines",
    subtitle: "your fight-or-flight signal molecules",
    color: "#f97316",
    keys: ["da", "nor", "epi", "dopac", "hva", "vma", "mhpg", "nor_epi", "hva_vma"],
  },
  {
    title: "Monoamines",
    subtitle: "your peripheral mood signalling",
    color: "#06b6d4",
    keys: ["ser", "hiaa", "hiaa_ser", "da_ser"],
  },
];

export function BiomarkerConstellation({
  values,
  percentiles,
}: {
  values: Partial<Record<BiomarkerKey, number | null>>;
  percentiles: Partial<Record<BiomarkerKey, number>>;
}) {
  return (
    <div className="space-y-5">
      {GROUPS.map((g) => (
        <div
          key={g.title}
          className="rounded-2xl bg-white border border-ink-100 p-6"
        >
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: g.color }}
                />
                <h3 className="serif text-lg text-ink-900">{g.title}</h3>
              </div>
              <p className="text-xs text-ink-500 ml-4">{g.subtitle}</p>
            </div>
          </div>
          <div className="space-y-2">
            {g.keys.map((k) => {
              const v = values[k] ?? null;
              const nr = NR[k];
              if (!nr || v == null) return null;
              const [lrl, url] = nr;
              const span = url - lrl;
              const lo = lrl - span * 0.4;
              const hi = url + span * 0.4;
              const pos = Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100));
              const lrlPos = Math.max(0, ((lrl - lo) / (hi - lo)) * 100);
              const urlPos = Math.min(100, ((url - lo) / (hi - lo)) * 100);
              const inRange = v >= lrl && v <= url;
              const pct = percentiles[k];
              return (
                <div key={k} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4 text-sm text-ink-700">
                    {LABEL[k] ?? k}
                  </div>
                  <div className="col-span-5 relative h-2 bg-ink-100 rounded-full">
                    <div
                      className="absolute top-0 bottom-0 rounded-full"
                      style={{
                        left: `${lrlPos}%`,
                        width: `${urlPos - lrlPos}%`,
                        background: g.color + "33",
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-white"
                      style={{
                        left: `${pos}%`,
                        transform: "translate(-50%, -50%)",
                        background: inRange ? g.color : "#e11d48",
                      }}
                    />
                  </div>
                  <div className="col-span-2 num text-xs text-right text-ink-700">
                    {v < 1 ? v.toFixed(3) : v < 10 ? v.toFixed(2) : v.toFixed(1)}
                  </div>
                  <div className="col-span-1 num text-[10px] text-right text-ink-400">
                    {pct != null ? `p${Math.round(pct)}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-ink-500 leading-relaxed">
        Each row shows your value as a dot, the healthy reference window as a coloured
        band, and your cohort percentile (p10 = lower than 90% of patients;
        p90 = higher than 90%). A red dot means outside the reference band.
      </p>
    </div>
  );
}
