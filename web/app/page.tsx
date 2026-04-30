import Link from "next/link";
import { getCohort } from "@/lib/data";
import { TIER_COLOR, TIER_LABEL, type Tier } from "@/lib/types";

export default async function HomePage() {
  const cohort = await getCohort();
  const tiers: Tier[] = ["T1", "T2", "T3", "T4"];
  const total = cohort.total_patients;

  return (
    <div
      className="hero-bg min-h-screen"
      style={{
        ["--hero-tint" as string]: "rgba(16,185,129,0.10)",
        ["--hero-tint-2" as string]: "rgba(249,115,22,0.10)",
      } as React.CSSProperties}
    >
      <header className="absolute top-0 inset-x-0 z-30">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-tier1 to-tier3 flex items-center justify-center text-white text-xs font-semibold">
              S
            </span>
            <span className="font-semibold tracking-tight text-ink-900">Sorcova</span>
            <span className="text-xs text-ink-500 hidden sm:inline">
              · BIO_STRESS · v2.9.1
            </span>
          </Link>
          <Link
            href="/analytics"
            className="text-xs text-ink-500 hover:text-ink-900 transition"
          >
            Analytics
          </Link>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 pt-24 pb-24">
        {/* Hero */}
        <section className="rise rise-1 pt-10 pb-8">
          <div className="inline-flex items-center gap-2 text-xs text-ink-500 px-3 py-1 rounded-full border border-ink-200 bg-white/80 backdrop-blur mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-tier1" />
            v2.9.1 — locked April 2026 · EU MDR Class IIa
          </div>
          <h1 className="serif text-5xl sm:text-6xl lg:text-7xl tracking-tight text-ink-900 leading-[1.02] max-w-3xl">
            Precision stress
            <br />
            medicine, on screen.
          </h1>
          <p className="text-ink-600 text-lg leading-relaxed max-w-2xl mt-6">
            Sorcova&apos;s biological stress score — a transparent linear composite of{" "}
            <em className="lit">HPA-axis cortisol rhythm</em>, <em className="lit">adrenal reserve</em>,
            and the <em className="lit">catecholamine + monoamine</em> neurotransmitter pool —
            visualised across {total.toLocaleString()} synthetic patients with full audit trail.
          </p>
        </section>

        {/* Two doors */}
        <section className="rise rise-2 mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
          <Door
            href="/patient"
            eyebrow="For patients"
            title="Health view"
            body="Tier-coherent score per DISPLAY-1. Plain-language insights, your cortisol rhythm overlaid on the reference band, and the next phase of recovery. No rule IDs, no formula math."
            tone="calm"
          />
          <Door
            href="/doctor"
            eyebrow="For clinicians"
            title="Cohort dashboard"
            body="Full transparency. Every patient's formula score, applied rule IDs, floor-rule triggers, phenotype flags, and audit trail. Persistent roster with keyboard nav, filter by tier, sex, rule or trajectory."
            tone="dense"
          />
        </section>

        {/* Cohort glance */}
        <section className="rise rise-3 mt-16 max-w-4xl">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-3">
            Cohort at a glance
          </div>
          <h2 className="serif text-2xl text-ink-900 leading-tight mb-6 max-w-2xl">
            <span className="num">{total.toLocaleString()}</span> synthetic patients ·{" "}
            <span className="num">{cohort.scored_visits.toLocaleString()}</span> scored visits across up to 12 longitudinal visits each.
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiers.map((t) => {
              const count = cohort.tier_counts[t] || 0;
              const pct = (count / total) * 100;
              return (
                <div
                  key={t}
                  className="rounded-2xl bg-white border border-ink-100 p-5 hover:shadow-card transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: TIER_COLOR[t] }}
                    />
                    <span className="text-[11px] uppercase tracking-wider text-ink-500">
                      {t}
                    </span>
                  </div>
                  <div className="num text-3xl font-semibold text-ink-900">
                    {count.toLocaleString()}
                  </div>
                  <div className="text-xs text-ink-500 num mt-0.5">
                    {pct.toFixed(1)}%
                  </div>
                  <div className="mt-3 h-1 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct * 1.4}%`, background: TIER_COLOR[t] }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-500 mt-2 leading-tight">
                    {TIER_LABEL[t].replace(/^Tier \d — /, "")}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 pt-10 border-t border-ink-100 text-xs text-ink-500 leading-relaxed max-w-2xl">
          BIO_STRESS_SCORE is a clinical-grade biological stress dysregulation index.
          It is not a diagnostic test, not a measure of perceived stress, and not a
          measure of brain neurotransmitter levels. Methodology v2.9.1 — locked April 2026.
        </footer>
      </main>
    </div>
  );
}

function Door({
  href, eyebrow, title, body, tone,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: "calm" | "dense";
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl bg-white border border-ink-100 p-7 hover:shadow-cardHover transition overflow-hidden"
    >
      {/* gentle wash on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition pointer-events-none"
        style={{
          background:
            tone === "calm"
              ? "radial-gradient(circle at 90% 0%, rgba(16,185,129,0.08), transparent 60%)"
              : "radial-gradient(circle at 90% 0%, rgba(249,115,22,0.07), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
          {eyebrow}
        </div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="serif text-2xl text-ink-900 leading-tight">{title}</h3>
          <span className="text-ink-300 group-hover:text-ink-700 transition text-xl">
            →
          </span>
        </div>
        <p className="text-sm text-ink-600 leading-relaxed">{body}</p>
      </div>
    </Link>
  );
}
