"use client";
import { useState } from "react";

const TERMS: { term: string; def: string }[] = [
  {
    term: "CAR (Cortisol Awakening Response)",
    def: "The 50–120% rise in cortisol in the first 30 minutes after waking. Your body's morning ignition signal.",
  },
  {
    term: "AUCg (Area Under the Curve)",
    def: "Total cortisol exposure across the day — integrating all five timepoints. A measure of overall HPA-axis activity.",
  },
  {
    term: "DCS (Diurnal Cortisol Slope)",
    def: "How steeply cortisol falls from morning to night. A steeper slope is healthier; a flat slope means the 'off' signal is weak.",
  },
  {
    term: "HPA axis",
    def: "Hypothalamus → Pituitary → Adrenal. The three-organ chain that produces cortisol. Often called the body's stress response system.",
  },
  {
    term: "DHEA",
    def: "An adrenal hormone that buffers cortisol — anabolic where cortisol is catabolic. Falls with chronic stress.",
  },
  {
    term: "Cortisol/DHEA ratio",
    def: "The balance between your stress hormone and your buffer hormone. A higher ratio means cortisol is dominating; a lower ratio means buffer is intact.",
  },
  {
    term: "Catecholamines",
    def: "Dopamine, noradrenaline and adrenaline — the fast-signalling molecules of the sympathetic nervous system.",
  },
  {
    term: "Peripheral serotonin",
    def: "About 90% of body serotonin is made by gut enterochromaffin cells. Urinary measurements reflect this gut-level pool — they are not a measure of brain serotonin.",
  },
  {
    term: "Reference range (LRL/URL)",
    def: "The Lower and Upper Reference Limits — the population-typical band for a marker. Inside is 'usual,' outside is worth a clinical conversation.",
  },
  {
    term: "Percentile",
    def: "Where you sit in our cohort of 10,000 patients. p10 = lower than 90% of people. p90 = higher than 90%.",
  },
  {
    term: "Tier (T1–T4)",
    def: "Four severity bands: T1 (mild) → T4 (critical). Calibrated for a clinical stress cohort, so T1 here means 'least dysregulated', not 'perfectly healthy'.",
  },
  {
    term: "Phase",
    def: "Where you are in the recovery framework. Phase 1 stabilises the foundation; later phases build on it.",
  },
];

export function Glossary() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-ink-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-ink-50/40 transition"
      >
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-0.5">
            Glossary
          </div>
          <div className="serif text-lg text-ink-900">
            What every term in this report means.
          </div>
        </div>
        <span className="text-ink-400 text-xl select-none">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-ink-100">
          <dl className="divide-y divide-ink-100">
            {TERMS.map((t) => (
              <div key={t.term} className="py-3 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-2">
                <dt className="font-medium text-ink-900 text-[14px]">{t.term}</dt>
                <dd className="text-sm text-ink-600 leading-relaxed">{t.def}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
