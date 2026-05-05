"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BiomarkerRow } from "@/components/BiomarkerRow";
import { CortisolCurve } from "@/components/CortisolCurve";
import { TrajectoryChart } from "@/components/TrajectoryChart";
import { DeepDiveHero } from "@/components/clinician/DeepDiveHero";
import { ClusterEmbedding } from "@/components/clinician/ClusterEmbedding";
import { NeighborsPanel } from "@/components/clinician/NeighborsPanel";
import { PatternsPanel } from "@/components/clinician/PatternsPanel";
import { BASE_PATH } from "@/lib/base-path";
import {
  PHASE_LABEL,
  PHENOTYPE_COLOR,
  PHENOTYPE_DESCRIPTION,
  type BiomarkerKey,
  type CohortAggregate,
  type PatientRecord,
  type Phenotype,
} from "@/lib/types";

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

const UNIT: Partial<Record<BiomarkerKey, string>> = {
  m1: "nmol/L", m2: "nmol/L", m3: "nmol/L", m4: "nmol/L", m5: "nmol/L",
  car_pct: "%", aucg: "nmol·h/L", dcs: "nmol/L/h", dhea: "nmol/L",
  da: "µmol/mol", dopac: "mg/g", hva: "mmol/mol",
  nor: "µmol/mol", epi: "µmol/mol", vma: "mmol/mol", mhpg: "mmol/mol",
  ser: "µmol/mol", hiaa: "mmol/mol", creatinine: "mg/dL",
};

const LABEL: Partial<Record<BiomarkerKey, string>> = {
  m1: "Cortisol m1 (wake)", m2: "Cortisol m2 (+30m)",
  m3: "Cortisol m3 (noon)", m4: "Cortisol m4 (evening)", m5: "Cortisol m5 (night)",
  car_pct: "CAR%", aucg: "AUCg", dcs: "DCS",
  dhea: "DHEA (free, salivary)", cor_dhea: "COR / DHEA",
  da: "Dopamine (DA)", dopac: "DOPAC", hva: "HVA",
  nor: "Norepinephrine", epi: "Epinephrine", vma: "VMA", mhpg: "MHPG",
  ser: "Serotonin", hiaa: "5-HIAA",
  nor_epi: "NOR / EPI", hva_vma: "HVA / VMA",
  hiaa_ser: "5-HIAA / SER (turnover)", da_ser: "DA / SER",
  creatinine: "Urinary creatinine",
};

const AXIS_TONE = (v: number) => {
  if (v < 12) return { color: "#10b981", word: "calm" };
  if (v < 22) return { color: "#f59e0b", word: "stirring" };
  if (v < 32) return { color: "#f97316", word: "loud" };
  return { color: "#e11d48", word: "exhausted" };
};

export default function Page() {
  return (
    <Suspense fallback={<Centered>Loading…</Centered>}>
      <Loader />
    </Suspense>
  );
}

function Loader() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const [p, setP] = useState<PatientRecord | null>(null);
  const [cohort, setCohort] = useState<CohortAggregate | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setP(null);
    setMissing(false);
    if (!id) return;
    Promise.all([
      fetch(`${BASE_PATH}/data/patients/${id}.json`).then((r) =>
        r.ok ? (r.json() as Promise<PatientRecord>) : null,
      ),
      fetch(`${BASE_PATH}/data/cohort.json`).then((r) =>
        r.ok ? (r.json() as Promise<CohortAggregate>) : null,
      ),
    ])
      .then(([patient, c]) => {
        if (!patient) { setMissing(true); return; }
        setP(patient);
        if (c) setCohort(c);
      })
      .catch(() => setMissing(true));
  }, [id]);

  if (!id) return <Centered>No patient ID provided.</Centered>;
  if (missing) return <Centered>Patient {id} not found.</Centered>;
  if (!p || !cohort) return <Centered>Loading…</Centered>;
  return <ClinicianDeepDive p={p} cohort={cohort} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-sm text-ink-500">
      <Link href="/doctor" className="hover:text-ink-700 transition">← cohort</Link>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ClinicianDeepDive({ p, cohort }: { p: PatientRecord; cohort: CohortAggregate }) {
  const visit = p.latest_visit;
  const r = visit.result;
  const m = visit.biomarkers;

  const cortisolKeys: BiomarkerKey[] = ["m1", "m2", "m3", "m4", "m5", "car_pct", "aucg", "dcs"];
  const adrenalKeys: BiomarkerKey[] = ["dhea", "cor_dhea"];
  const catKeys: BiomarkerKey[] = ["da", "dopac", "hva", "nor", "epi", "vma", "mhpg", "nor_epi", "hva_vma"];
  const monKeys: BiomarkerKey[] = ["ser", "hiaa", "hiaa_ser", "da_ser"];

  const subPenalties = [
    { axis: "C", label: "CAR deviation", weight: 0.25, val: r.car_pen },
    { axis: "C", label: "MID-1 (m3)", weight: 0.20, val: r.m3_pen },
    { axis: "C", label: "AUCg", weight: 0.20, val: r.aucg_pen },
    { axis: "C", label: "Morning baseline (m1)", weight: 0.20, val: r.m1_pen },
    { axis: "C", label: "DCS slope", weight: 0.15, val: r.dcs_pen },
    { axis: "D", label: "DHEA", weight: 0.40, val: r.dhea_pen },
    { axis: "D", label: "COR/DHEA", weight: 0.60, val: r.cor_dhea_pen },
    { axis: "N-cat", label: "DA", weight: 0.25, val: r.da_pen },
    { axis: "N-cat", label: "NOR/EPI", weight: 0.30, val: r.nor_epi_pen },
    { axis: "N-cat", label: "NOR", weight: 0.30, val: r.nor_pen },
    { axis: "N-cat", label: "EPI", weight: 0.15, val: r.epi_pen },
    { axis: "N-mon", label: "SER", weight: 0.50, val: r.ser_pen },
    { axis: "N-mon", label: "5-HIAA/SER", weight: 0.30, val: r.hiaa_ser_pen },
    { axis: "N-mon", label: "DA/SER", weight: 0.20, val: r.da_ser_pen },
  ];

  const baselinePheno = p.phenotype_baseline as Phenotype | null;
  const targetPheno = p.phenotype_target as Phenotype | null;

  return (
    <div className="px-6 lg:px-8 py-7 max-w-[1400px]">
      <div className="flex items-center justify-between text-[11px] text-ink-400 mb-4">
        <Link href="/doctor" className="hover:text-ink-700 transition">
          ← cohort
        </Link>
        <Link href={`/patient/p?id=${p.id}`} className="hover:text-ink-700 transition">
          patient view →
        </Link>
      </div>

      <DeepDiveHero p={p} />

      <div className="rise rise-2 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 mt-8">
        <div className="rounded-2xl bg-white border border-ink-100 p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-3">
            Axis breakdown
          </div>
          <div className="space-y-4">
            {[
              { k: "HPA", v: r.hpa_score, hint: "cortisol rhythm" },
              { k: "Adrenal reserve", v: r.adrenal_score, hint: "DHEA + ratio" },
              { k: "Neurotransmitter", v: r.nt_score, hint: `cat ${r.nt_cat_score.toFixed(0)} · mon ${r.nt_mon_score.toFixed(0)}` },
            ].map((it) => {
              const tone = AXIS_TONE(it.v);
              return (
                <div key={it.k}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div>
                      <div className="text-sm font-medium text-ink-900">{it.k}</div>
                      <div className="text-[11px] text-ink-500">{it.hint}</div>
                    </div>
                    <div className="text-right">
                      <div className="num font-semibold" style={{ color: tone.color }}>
                        {it.v.toFixed(1)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: tone.color }}>
                        {tone.word}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, it.v)}%`, background: tone.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-ink-100">
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-1">
              Phase entry
            </div>
            <div className="text-sm font-medium text-ink-900">
              {PHASE_LABEL[r.suggested_phase]}
            </div>
            <div className="text-xs text-ink-500 mt-0.5">{r.phase_rationale}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-ink-100 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
                Score trajectory
              </div>
              <div className="serif text-lg text-ink-900 leading-tight">
                {p.trajectory_data.length} valid visits · {p.visit_span_days} days
              </div>
            </div>
          </div>
          <TrajectoryChart data={p.trajectory_data} showAxisLines />
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <Legend color="#0f172a" label="Score" solid />
            <Legend color="#a78bfa" label="HPA" />
            <Legend color="#06b6d4" label="NT" />
          </div>
        </div>
      </div>

      <div className="rise rise-3 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 mt-5">
        <div className="rounded-2xl bg-white border border-ink-100 p-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500">
              Cortisol diurnal · latest visit
            </div>
            <div className="text-[11px] text-ink-500">
              CAR <span className="num text-ink-800">{m.car_pct?.toFixed(1) ?? "—"}%</span> ·
              AUCg <span className="num text-ink-800">{m.aucg?.toFixed(1) ?? "—"}</span> ·
              DCS <span className="num text-ink-800">{m.dcs?.toFixed(2) ?? "—"}</span>
            </div>
          </div>
          <CortisolCurve
            values={{ m1: m.m1 ?? 0, m2: m.m2 ?? 0, m3: m.m3 ?? 0, m4: m.m4 ?? 0, m5: m.m5 ?? 0 }}
          />
        </div>

        <div className="rounded-2xl bg-white border border-ink-100 p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-3">
            Sub-penalty contributions
          </div>
          <div className="space-y-1.5">
            {subPenalties.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="text-[10px] text-ink-400 num w-12 shrink-0">{s.axis}</div>
                <div className="text-xs text-ink-700 flex-1 min-w-0 truncate">
                  {s.label}{" "}
                  <span className="text-[10px] text-ink-400 num">
                    × {(s.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden max-w-[120px]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, s.val)}%`,
                      background: s.val > 30 ? "#e11d48" : s.val > 10 ? "#f97316" : "#a1a1aa",
                    }}
                  />
                </div>
                <div
                  className="num text-xs font-semibold w-9 text-right"
                  style={{ color: s.val > 30 ? "#e11d48" : s.val > 10 ? "#f97316" : "#71717a" }}
                >
                  {s.val.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rise rise-4 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 mt-5">
        <PatternsPanel patterns={p.patterns} />
        <NeighborsPanel neighbors={p.neighbors} />
      </div>

      <ClusterEmbedding
        embedding={cohort.embedding}
        highlight={{ x: p.embedding.x, y: p.embedding.y, id: p.id }}
      />

      {(r.rule_details.length > 0 || r.flag_details.length > 0) && (
        <section className="rise rise-4 mt-5 rounded-2xl bg-white border border-ink-100 p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-3">
            Rules &amp; phenotype flags fired
          </div>
          <div className="space-y-3">
            {r.rule_details.map((rd, i) => (
              <div key={`r-${i}`} className="border-l-2 border-tier3 pl-4 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-warn text-[10px]">{rd.rule}</span>
                  {rd.tier_floor && (
                    <span className="text-[11px] text-ink-500">
                      tier-floor → {rd.tier_floor}
                    </span>
                  )}
                  {rd.nt_floor && (
                    <span className="text-[11px] text-ink-500">NT floor {rd.nt_floor}</span>
                  )}
                  {rd.additive_points && (
                    <span className="text-[11px] text-ink-500">
                      +{rd.additive_points} pts
                    </span>
                  )}
                </div>
                {rd.trigger && <div className="text-[11px] text-ink-600 num">{rd.trigger}</div>}
              </div>
            ))}
            {r.flag_details.map((f, i) => (
              <div key={`f-${i}`} className="border-l-2 border-tier4 pl-4 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-bad text-[10px]">{f.flag}</span>
                </div>
                <div className="text-[11px] text-ink-600">{f.note}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rise rise-5 mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Cortisol panel">
          {cortisolKeys.map((k) => (
            <BiomarkerRow
              key={k}
              label={LABEL[k] ?? k}
              unit={UNIT[k]}
              value={m[k] ?? null}
              lrl={NR[k]?.[0] ?? null}
              url={NR[k]?.[1] ?? null}
              percentile={p.percentiles[k]}
            />
          ))}
        </Panel>

        <Panel title="Adrenal reserve">
          {adrenalKeys.map((k) => (
            <BiomarkerRow
              key={k}
              label={LABEL[k] ?? k}
              unit={UNIT[k]}
              value={m[k] ?? null}
              lrl={NR[k]?.[0] ?? null}
              url={NR[k]?.[1] ?? null}
              percentile={p.percentiles[k]}
              helper={k === "cor_dhea" && r.reactive_buffer ? "reactive buffer" : undefined}
            />
          ))}
          {r.reactive_buffer && (
            <div className="mt-3 chip chip-ok inline-flex">
              DHEA reactive buffer — partial penalty (Morgan 2004)
            </div>
          )}
        </Panel>

        <Panel title="Catecholamines · cat-axis (55% of NT)">
          {catKeys.map((k) => (
            <BiomarkerRow
              key={k}
              label={LABEL[k] ?? k}
              unit={UNIT[k]}
              value={m[k] ?? null}
              lrl={NR[k]?.[0] ?? null}
              url={NR[k]?.[1] ?? null}
              percentile={p.percentiles[k]}
            />
          ))}
        </Panel>

        <Panel title="Monoamines · mon-axis (45% of NT)">
          {monKeys.map((k) => (
            <BiomarkerRow
              key={k}
              label={LABEL[k] ?? k}
              unit={UNIT[k]}
              value={m[k] ?? null}
              lrl={NR[k]?.[0] ?? null}
              url={NR[k]?.[1] ?? null}
              percentile={p.percentiles[k]}
            />
          ))}
          <div className="mt-3 text-[11px] text-ink-500 leading-relaxed">
            Peripheral SER reflects ~90% gut-origin synthesis (Gershon &amp; Tack 2007).
            Patient-facing language is locked: &quot;gut-level production insufficiency&quot;,
            never &quot;low brain serotonin&quot;.
          </div>
        </Panel>
      </div>

      {baselinePheno && (
        <section className="rise rise-6 mt-5 rounded-2xl bg-white border border-ink-100 p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
            Phenotype context · synthetic ground truth
          </div>
          {targetPheno && targetPheno !== baselinePheno ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                  Baseline
                </div>
                <div className="font-medium" style={{ color: PHENOTYPE_COLOR[baselinePheno] }}>
                  {baselinePheno}
                </div>
                <p className="text-sm text-ink-600 mt-1 leading-relaxed">
                  {PHENOTYPE_DESCRIPTION[baselinePheno]}
                </p>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                  Target ({p.trajectory})
                </div>
                <div className="font-medium" style={{ color: PHENOTYPE_COLOR[targetPheno] }}>
                  {targetPheno}
                </div>
                <p className="text-sm text-ink-600 mt-1 leading-relaxed">
                  {PHENOTYPE_DESCRIPTION[targetPheno]}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium" style={{ color: PHENOTYPE_COLOR[baselinePheno] }}>
                {baselinePheno}
              </div>
              <p className="text-sm text-ink-600 mt-1 leading-relaxed max-w-2xl">
                {PHENOTYPE_DESCRIPTION[baselinePheno]}
              </p>
              {p.trajectory && p.trajectory !== "stable" && (
                <p className="text-[11px] text-ink-500 mt-3 italic max-w-2xl">
                  Trajectory tagged <span className="num">{p.trajectory}</span> with no phenotype
                  movement — the patient is{" "}
                  {p.trajectory === "decline"
                    ? "already at the most severe phenotype in the lattice; further worsening shows as within-phenotype intensification rather than transition to a worse label"
                    : "already at Healthy; further improvement shows as within-phenotype consolidation"}.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rise rise-6 mt-5 rounded-2xl bg-ink-900 text-white p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-3">
          Audit trail · latest visit
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Audit label="C (raw)" value={r.hpa_score.toFixed(2)} />
          <Audit label="D (raw)" value={r.adrenal_score.toFixed(2)} />
          <Audit label="N-cat (raw)" value={r.nt_cat_score.toFixed(2)} />
          <Audit label="N-mon (raw)" value={r.nt_mon_score.toFixed(2)} />
          <Audit label="NT sub-score" value={r.nt_score.toFixed(2)} />
          <Audit label="Score (formula)" value={r.score_formula.toFixed(2)} />
          <Audit label="Score (patient)" value={r.score_displayed_patient.toFixed(2)} />
          <Audit label="Tier (formula)" value={r.tier_formula} />
        </div>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-ink-100 p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-3">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Audit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-white/40 uppercase tracking-wider text-[9px]">{label}</div>
      <div className="num font-medium text-white mt-0.5">{value}</div>
    </div>
  );
}

function Legend({ color, label, solid = false }: { color: string; label: string; solid?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="block w-4 h-0.5"
        style={{ background: solid ? color : undefined, borderTop: solid ? "none" : `1.5px dashed ${color}` }}
      />
      <span className="text-ink-600">{label}</span>
    </div>
  );
}
