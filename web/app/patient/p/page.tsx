"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PatientShell } from "@/components/PatientShell";
import { Hero } from "@/components/narrative/Hero";
import { Section } from "@/components/narrative/Section";
import { JourneySection } from "@/components/narrative/JourneySection";
import { AxisStory } from "@/components/narrative/AxisStory";
import { DayRhythm } from "@/components/narrative/DayRhythm";
import { InsightStream } from "@/components/narrative/InsightStream";
import { NextStep } from "@/components/narrative/NextStep";
import { PatternsCallout } from "@/components/narrative/PatternsCallout";
import { ModeToggle, useViewMode } from "@/components/narrative/ModeToggle";
import { CortisolMetrics } from "@/components/narrative/CortisolMetrics";
import { BiomarkerConstellation } from "@/components/narrative/BiomarkerConstellation";
import { MyPosition } from "@/components/narrative/MyPosition";
import { ActionPlan } from "@/components/narrative/ActionPlan";
import { Glossary } from "@/components/narrative/Glossary";
import { BASE_PATH } from "@/lib/base-path";
import type { CohortAggregate, PatientRecord } from "@/lib/types";

const HERO_TINTS: Record<string, { tint: string; tint2: string }> = {
  T1: { tint: "rgba(16,185,129,0.12)", tint2: "rgba(16,185,129,0.05)" },
  T2: { tint: "rgba(245,158,11,0.13)", tint2: "rgba(245,158,11,0.05)" },
  T3: { tint: "rgba(249,115,22,0.14)", tint2: "rgba(249,115,22,0.05)" },
  T4: { tint: "rgba(225,29,72,0.13)", tint2: "rgba(225,29,72,0.05)" },
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
  if (!p) return <Centered>Loading…</Centered>;
  return <PatientDeepDive p={p} cohort={cohort} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-sm text-ink-500">
      <Link href="/patient" className="hover:text-ink-700 transition">← back</Link>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function PatientDeepDive({ p, cohort }: { p: PatientRecord; cohort: CohortAggregate | null }) {
  const [mode, setMode] = useViewMode();
  const advanced = mode === "advanced";

  const visit = p.latest_visit;
  const r = visit.result;
  const tier = r.tier_final;
  const score = r.score_displayed_patient;
  const m = visit.biomarkers;

  const firstScore = p.trajectory_data[0]?.score;
  const delta = firstScore != null ? r.score_formula - firstScore : null;

  return (
    <PatientShell heroBg={HERO_TINTS[tier]}>
      {/* mode toggle floats top-right */}
      <div className="flex justify-end pt-2 mb-3">
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <Hero score={score} tier={tier} />

      <Section eyebrow="Your journey" title="Where you are." delayClass="rise-2">
        <JourneySection
          data={p.trajectory_data}
          delta={delta}
          scoreNow={r.score_formula}
        />
      </Section>

      <Section
        eyebrow="What's happening"
        title="Three systems, one story."
        delayClass="rise-3"
      >
        <AxisStory hpa={r.hpa_score} adrenal={r.adrenal_score} nt={r.nt_score} />
      </Section>

      <Section
        eyebrow="Your day"
        title="Your cortisol rhythm."
        delayClass="rise-4"
      >
        <p className="text-ink-700 text-lg leading-relaxed max-w-xl mb-6">
          Cortisol is your body&apos;s natural energy-pacing hormone. It should rise sharply
          when you wake and ease all the way down by night. Here&apos;s the rhythm we
          measured for you on your latest visit.
        </p>
        <DayRhythm
          values={{
            m1: m.m1, m2: m.m2, m3: m.m3, m4: m.m4, m5: m.m5,
          }}
        />
      </Section>

      {advanced && (
        <Section
          eyebrow="Your cortisol metrics"
          title="The four numbers behind that curve."
          delayClass="rise-4"
        >
          <p className="text-ink-700 text-base leading-relaxed max-w-xl mb-5">
            We extract four named metrics from your five timepoints. Each one tells
            a different story about how your cortisol axis is functioning.
          </p>
          <CortisolMetrics
            values={{
              car_pct: m.car_pct,
              aucg: m.aucg,
              dcs: m.dcs,
              m3: m.m3,
              m1: m.m1,
            }}
          />
        </Section>
      )}

      <Section
        eyebrow="What we noticed"
        title="The signals worth flagging."
        delayClass="rise-5"
      >
        <InsightStream insights={r.insights} />
      </Section>

      {p.patterns.length > 0 && (
        <Section
          eyebrow="Pattern recognition"
          title={
            p.patterns.length === 1
              ? "One bigger pattern in your panel."
              : `${p.patterns.length} bigger patterns in your panel.`
          }
          delayClass="rise-5"
        >
          <p className="text-ink-700 text-base leading-relaxed max-w-xl mb-5">
            Beyond the individual signals above, these are constellations across multiple
            markers — recognised pictures of how stress biology behaves.
          </p>
          <PatternsCallout patterns={p.patterns} />
        </Section>
      )}

      {advanced && (
        <Section
          eyebrow="Your full panel"
          title="Every marker we measured."
          delayClass="rise-5"
        >
          <p className="text-ink-700 text-base leading-relaxed max-w-xl mb-5">
            Grouped by biological system. Each row shows your value, the healthy
            reference window, and where you sit relative to our cohort.
          </p>
          <BiomarkerConstellation
            values={m as any}
            percentiles={p.percentiles}
          />
        </Section>
      )}

      {advanced && cohort && (
        <Section
          eyebrow="You in the cohort"
          title="People with biology like yours."
          delayClass="rise-6"
        >
          <p className="text-ink-700 text-base leading-relaxed max-w-xl mb-5">
            We map every patient onto a 2D space using their full biomarker profile.
            Your position relative to others tells you which patterns are most
            similar to yours.
          </p>
          <MyPosition
            embedding={cohort.embedding}
            patient={{
              x: p.embedding.x,
              y: p.embedding.y,
              id: p.id,
              tier,
              trajectory: p.trajectory,
            }}
          />
        </Section>
      )}

      <Section
        eyebrow="What's next"
        title="Your direction of travel."
        delayClass="rise-6"
      >
        <NextStep phase={r.suggested_phase} rationale={r.phase_rationale} />
      </Section>

      {advanced && (
        <Section
          eyebrow="Your action plan"
          title="Practical anchors, evidence-based."
          delayClass="rise-6"
        >
          <p className="text-ink-700 text-base leading-relaxed max-w-xl mb-5">
            These are lifestyle-grade actions tailored to your phase and the patterns
            we recognised in your panel. Start with one or two, not all at once.
          </p>
          <ActionPlan phase={r.suggested_phase} patterns={p.patterns} />
        </Section>
      )}

      {advanced && (
        <div className="rise rise-6 mt-16">
          <Glossary />
        </div>
      )}

      <footer className="mt-20 pt-10 border-t border-ink-100 text-xs text-ink-500 leading-relaxed max-w-2xl">
        BIO_STRESS_SCORE is a clinical-grade biological stress dysregulation index — it
        is not a diagnostic test, not a measure of perceived stress, and not a measure
        of brain neurotransmitter levels. Always read alongside the clinical context
        provided by your physician. Methodology v2.9.1.{" "}
        <Link href={`/doctor/p?id=${p.id}`} className="text-ink-700 hover:text-ink-900 underline underline-offset-4">
          Clinician view
        </Link>
      </footer>
    </PatientShell>
  );
}
