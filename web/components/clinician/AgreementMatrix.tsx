import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
  type CohortAggregate,
  type Phenotype,
  type Tier,
} from "@/lib/types";

const TIERS: Tier[] = ["T1", "T2", "T3", "T4"];
const TIER_TO_NUM: Record<Tier, number> = { T1: 1, T2: 2, T3: 3, T4: 4 };

export function AgreementMatrix({
  agreement,
}: {
  agreement: CohortAggregate["agreement"];
}) {
  const total = agreement.total_with_pheno || 1;
  const strictPct = (agreement.strict_match / total) * 100;
  const withinOnePct = (agreement.within_one / total) * 100;
  const stablePct =
    agreement.stable_total > 0
      ? (agreement.stable_strict_match / agreement.stable_total) * 100
      : 0;

  return (
    <section className="rise rise-5 mt-10">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
        Engine vs ground truth
      </div>
      <h2 className="serif text-2xl text-ink-900 leading-tight mb-1">
        Where the v2.9.1 tier matches the phenotype label.
      </h2>
      <p className="text-ink-500 text-sm mb-5 max-w-2xl">
        Each row is a synthetic phenotype. Each column is the tier the engine
        assigned on the latest visit. The diagonal-style highlight shows the cell
        the phenotype's expected tier predicted.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Stat
          label="Strict match"
          value={`${strictPct.toFixed(1)}%`}
          sub={`${agreement.strict_match.toLocaleString()} of ${total.toLocaleString()}`}
        />
        <Stat
          label="Within ±1 tier"
          value={`${withinOnePct.toFixed(1)}%`}
          sub={`${agreement.within_one.toLocaleString()} of ${total.toLocaleString()}`}
        />
        <Stat
          label="Strict match · stable trajectory"
          value={`${stablePct.toFixed(1)}%`}
          sub={`${agreement.stable_strict_match.toLocaleString()} of ${agreement.stable_total.toLocaleString()} (cleanest test)`}
        />
      </div>

      <div className="rounded-2xl bg-white border border-ink-100 p-5 overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 720 }}>
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-ink-500 border-b border-ink-100">
              <th className="text-left py-2 pr-4">Phenotype</th>
              <th className="text-right py-2 px-2">expected</th>
              {TIERS.map((t) => (
                <th key={t} className="text-right py-2 px-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: TIER_COLOR[t] }}
                    />
                    {t}
                  </span>
                </th>
              ))}
              <th className="text-right py-2 pl-3 text-ink-500">total</th>
              <th className="text-right py-2 pl-3 text-ink-500">match</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(agreement.matrix).map(([pheno, row]) => {
              const expectedNum = agreement.expected_tier[pheno];
              const expectedTier = `T${expectedNum}` as Tier;
              const counts = TIERS.map((t) => row[t] || 0);
              const total = counts.reduce((a, b) => a + b, 0);
              const matchCount = counts[expectedNum - 1] || 0;
              const matchPct = total > 0 ? (matchCount / total) * 100 : 0;
              return (
                <tr key={pheno} className="border-b border-ink-100 last:border-0">
                  <td className="py-2 pr-4">
                    <div
                      className="font-medium"
                      style={{ color: PHENOTYPE_COLOR[pheno as Phenotype] }}
                    >
                      {pheno}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right num text-xs text-ink-600">
                    {expectedTier}
                  </td>
                  {TIERS.map((t, i) => {
                    const v = counts[i];
                    const pct = total > 0 ? v / total : 0;
                    const isExpected = TIER_TO_NUM[t] === expectedNum;
                    const isAdjacent = Math.abs(TIER_TO_NUM[t] - expectedNum) === 1;
                    const bg = isExpected
                      ? TIER_COLOR[t] + "1f"
                      : isAdjacent
                      ? TIER_COLOR[t] + "0c"
                      : "transparent";
                    return (
                      <td key={t} className="py-2 px-3 text-right" style={{ background: bg }}>
                        <div className="num font-medium text-ink-900">
                          {v.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-ink-500 num">
                          {(pct * 100).toFixed(0)}%
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 pl-3 text-right num text-ink-600">
                    {total.toLocaleString()}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <span
                      className="num font-semibold"
                      style={{
                        color:
                          matchPct >= 70
                            ? "#10b981"
                            : matchPct >= 40
                            ? "#f59e0b"
                            : "#e11d48",
                      }}
                    >
                      {matchPct.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-ink-500 leading-relaxed max-w-3xl">
        Phenotype label is the synthetic baseline. Engine tier is computed from the
        patient's latest visit. Recovery and decline trajectories pull patients off
        their baseline label, so the strict-match-on-stable row is the cleanest
        test of the score engine's calibration.
      </p>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white border border-ink-100 p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1">
        {label}
      </div>
      <div className="num text-2xl font-semibold text-ink-900">{value}</div>
      <div className="text-[11px] text-ink-500 num mt-0.5">{sub}</div>
    </div>
  );
}
