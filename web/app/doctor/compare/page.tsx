"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AxisScoreTrio } from "@/components/AxisScoreTrio";
import { CortisolCurve } from "@/components/CortisolCurve";
import { TrajectoryChart } from "@/components/TrajectoryChart";
import { TierBadge } from "@/components/TierBadge";
import { useCompareSet } from "@/components/clinician/CompareBar";
import { BASE_PATH } from "@/lib/base-path";
import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
  TRAJECTORY_COLOR,
  type PatientRecord,
  type Phenotype,
  type Trajectory,
} from "@/lib/types";

export default function Page() {
  return (
    <Suspense fallback={<Centered>Loading…</Centered>}>
      <Loader />
    </Suspense>
  );
}

function Loader() {
  const sp = useSearchParams();
  const ids = (sp.get("ids") || "").split(",").filter(Boolean).slice(0, 3);
  const [patients, setPatients] = useState<(PatientRecord | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      ids.map((id) =>
        fetch(`${BASE_PATH}/data/patients/${id}.json`).then((r) =>
          r.ok ? (r.json() as Promise<PatientRecord>) : null,
        ),
      ),
    ).then((arr) => {
      setPatients(arr);
      setLoading(false);
    });
  }, [ids.join(",")]);

  if (ids.length === 0) {
    return (
      <Centered>
        No patients selected. Hover any row in the roster and click the{" "}
        <kbd className="px-1.5 py-0.5 border border-ink-300 rounded text-xs">
          +
        </kbd>{" "}
        to add them. You need at least two to compare.
      </Centered>
    );
  }
  if (loading) return <Centered>Loading {ids.length} patients…</Centered>;
  return <CompareView patients={patients.filter(Boolean) as PatientRecord[]} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-sm text-ink-500 max-w-xl">
      <Link href="/doctor" className="hover:text-ink-700 transition">← cohort</Link>
      <div className="mt-6 leading-relaxed">{children}</div>
    </div>
  );
}

function CompareView({ patients }: { patients: PatientRecord[] }) {
  const [, toggle] = useCompareSet();

  if (patients.length < 2) {
    return (
      <Centered>
        Need at least two patients. Add more from the roster.
      </Centered>
    );
  }

  // shared y-max for cortisol curves (so visual comparison is meaningful)
  const maxCortisol = Math.max(
    ...patients.flatMap((p) => [
      p.latest_visit.biomarkers.m1 ?? 0,
      p.latest_visit.biomarkers.m2 ?? 0,
      p.latest_visit.biomarkers.m3 ?? 0,
      p.latest_visit.biomarkers.m4 ?? 0,
      p.latest_visit.biomarkers.m5 ?? 0,
    ]),
    30,
  );

  return (
    <div className="px-6 lg:px-8 py-7 max-w-[1400px]">
      <div className="flex items-center justify-between text-[11px] text-ink-400 mb-4">
        <Link href="/doctor" className="hover:text-ink-700 transition">← cohort</Link>
        <span>compare {patients.length} patients side-by-side</span>
      </div>

      <div className="rise rise-1 mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
          Compare mode
        </div>
        <h1 className="serif text-3xl text-ink-900 leading-tight">
          {patients.length} patients, aligned.
        </h1>
        <p className="text-ink-500 text-sm mt-2 max-w-2xl">
          Same visual scales across columns — cortisol y-axis pegged to the
          maximum across patients so curves are directly comparable.
        </p>
      </div>

      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(${patients.length}, minmax(0, 1fr))`,
        }}
      >
        {patients.map((p) => (
          <PatientColumn key={p.id} p={p} maxCortisol={maxCortisol} onRemove={() => toggle(p.id)} />
        ))}
      </div>
    </div>
  );
}

function PatientColumn({
  p,
  maxCortisol,
  onRemove,
}: {
  p: PatientRecord;
  maxCortisol: number;
  onRemove: () => void;
}) {
  const v = p.latest_visit;
  const r = v.result;
  const m = v.biomarkers;
  const pheno = p.phenotype_baseline as Phenotype | null;
  const traj = p.trajectory as Trajectory | null;
  const firstScore = p.trajectory_data[0]?.score;
  const delta = firstScore != null ? r.score_formula - firstScore : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-white border border-ink-100 p-4 relative">
        <button
          onClick={onRemove}
          aria-label="Remove from compare"
          className="absolute top-2 right-2 w-5 h-5 rounded text-ink-400 hover:bg-ink-100 hover:text-ink-900 transition text-xs"
        >
          ×
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/doctor/p?id=${p.id}`}
            className="num text-sm font-medium text-ink-900 hover:text-tier3 transition"
          >
            {p.id}
          </Link>
          <TierBadge tier={r.tier_final} size="sm" />
        </div>
        <div className="text-[11px] text-ink-500 num">
          {p.sex ?? "?"} · {p.age?.toFixed(0) ?? "?"} y
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {pheno && (
            <span
              className="chip text-[10px]"
              style={{
                borderColor: PHENOTYPE_COLOR[pheno] + "40",
                color: PHENOTYPE_COLOR[pheno],
              }}
            >
              {pheno}
            </span>
          )}
          {traj && (
            <span
              className="chip text-[10px]"
              style={{
                borderColor: TRAJECTORY_COLOR[traj] + "40",
                color: TRAJECTORY_COLOR[traj],
              }}
            >
              {traj === "recovery" ? "↓" : traj === "decline" ? "↑" : "→"} {traj}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="serif text-3xl font-light tracking-tight"
            style={{ color: TIER_COLOR[r.tier_final] }}
          >
            {r.score_formula.toFixed(1)}
          </span>
          {firstScore != null && (
            <span
              className="text-[11px] num"
              style={{
                color: delta < -2 ? "#10b981" : delta > 2 ? "#e11d48" : "#71717a",
              }}
            >
              Δ {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Axis trio */}
      <div className="rounded-2xl bg-white border border-ink-100 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2 px-1">
          By axis
        </div>
        <AxisScoreTrio
          values={{
            hpa: r.hpa_score,
            adrenal: r.adrenal_score,
            nt: r.nt_score,
          }}
          variant="clinician"
        />
      </div>

      {/* Cortisol — aligned scale */}
      <div className="rounded-2xl bg-white border border-ink-100 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1 px-1">
          Cortisol diurnal
        </div>
        <div className="text-[10px] text-ink-500 px-1 num">
          CAR {m.car_pct?.toFixed(0) ?? "—"}% · AUCg {m.aucg?.toFixed(0) ?? "—"} ·
          DCS {m.dcs?.toFixed(2) ?? "—"}
        </div>
        <CortisolCurve
          values={{
            m1: m.m1 ?? 0,
            m2: m.m2 ?? 0,
            m3: m.m3 ?? 0,
            m4: m.m4 ?? 0,
            m5: m.m5 ?? 0,
          }}
          height={180}
        />
      </div>

      {/* Trajectory */}
      <div className="rounded-2xl bg-white border border-ink-100 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1 px-1">
          Trajectory · {p.trajectory_data.length} visits
        </div>
        <TrajectoryChart data={p.trajectory_data} height={180} />
      </div>

      {/* Rules + patterns */}
      <div className="rounded-2xl bg-white border border-ink-100 p-4 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-1.5">
            Rules fired ({r.applied_rules.length})
          </div>
          {r.applied_rules.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {r.applied_rules.map((rule) => (
                <span key={rule} className="chip chip-warn text-[10px]">{rule}</span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-ink-400">none</div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-1.5">
            Patterns ({p.patterns.length})
          </div>
          {p.patterns.length > 0 ? (
            <div className="space-y-1">
              {p.patterns.slice(0, 4).map((pat) => (
                <div key={pat.id} className="text-[11px] text-ink-700">
                  {pat.name}
                </div>
              ))}
              {p.patterns.length > 4 && (
                <div className="text-[10px] text-ink-400">
                  + {p.patterns.length - 4} more
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-ink-400">none</div>
          )}
        </div>
      </div>

      {/* Sub-penalties */}
      <div className="rounded-2xl bg-white border border-ink-100 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 mb-2">
          Top sub-penalties
        </div>
        <div className="space-y-1">
          {[
            { label: "CAR", v: r.car_pen },
            { label: "MID-1 (m3)", v: r.m3_pen },
            { label: "AUCg", v: r.aucg_pen },
            { label: "m1", v: r.m1_pen },
            { label: "DCS", v: r.dcs_pen },
            { label: "DHEA", v: r.dhea_pen },
            { label: "COR/DHEA", v: r.cor_dhea_pen },
            { label: "DA", v: r.da_pen },
            { label: "NOR/EPI", v: r.nor_epi_pen },
            { label: "SER", v: r.ser_pen },
          ]
            .filter((s) => s.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 5)
            .map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-[11px]">
                <span className="text-ink-700 flex-1 truncate">{s.label}</span>
                <div className="flex-1 h-1 bg-ink-100 rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(100, s.v)}%`,
                      background: s.v > 30 ? "#e11d48" : s.v > 10 ? "#f97316" : "#a1a1aa",
                    }}
                  />
                </div>
                <span
                  className="num font-medium w-7 text-right"
                  style={{
                    color: s.v > 30 ? "#e11d48" : s.v > 10 ? "#f97316" : "#71717a",
                  }}
                >
                  {s.v.toFixed(0)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
