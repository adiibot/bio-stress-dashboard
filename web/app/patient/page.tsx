import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TierBadge } from "@/components/TierBadge";
import { getIndex } from "@/lib/data";

export default async function PatientLandingPage() {
  const idx = await getIndex();
  // pick a few interesting cases across tiers
  const samplesByTier: Record<string, typeof idx> = { T1: [], T2: [], T3: [], T4: [] };
  for (const p of idx) {
    const a = samplesByTier[p.tier];
    if (a && a.length < 3) a.push(p);
    if (Object.values(samplesByTier).every((v) => v.length === 3)) break;
  }
  const sample = ([] as typeof idx).concat(...Object.values(samplesByTier));

  return (
    <AppShell active="patient">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold text-ink-900 mb-2">Your health view</h1>
        <p className="text-ink-600">
          Pick a sample profile to see the patient-facing dashboard. Each shows the
          tier-coherent score (per DISPLAY-1) and plain-language insights only — no
          formula math, no rule IDs.
        </p>
        <div className="mt-6 space-y-2">
          {sample.map((p) => (
            <Link
              key={p.id}
              href={`/patient/p?id=${p.id}`}
              className="card flex items-center justify-between px-4 py-3 hover:shadow-cardHover transition"
            >
              <div className="flex items-center gap-3">
                <TierBadge tier={p.tier} size="sm" />
                <div>
                  <div className="text-sm font-medium text-ink-900">{p.id}</div>
                  <div className="text-xs text-ink-500">
                    {p.sex ?? "?"} · {p.age?.toFixed(0) ?? "?"} y · score {p.score_patient.toFixed(0)} / 100
                  </div>
                </div>
              </div>
              <span className="text-ink-300">→</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
