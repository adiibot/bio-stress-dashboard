"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TierBadge } from "./TierBadge";
import {
  PHENOTYPE_COLOR,
  TRAJECTORY_COLOR,
  TRAJECTORY_LABEL,
  type PatientIndexEntry,
  type Phenotype,
  type Tier,
  type Trajectory,
} from "@/lib/types";

const PAGE = 50;

export function PatientRoster({
  patients,
  rules,
  phenotypes,
}: {
  patients: PatientIndexEntry[];
  rules: string[];
  phenotypes: string[];
}) {
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [sexFilter, setSexFilter] = useState<"all" | "F" | "M">("all");
  const [ruleFilter, setRuleFilter] = useState<string>("all");
  const [phenoFilter, setPhenoFilter] = useState<string>("all");
  const [trajFilter, setTrajFilter] = useState<"all" | Trajectory>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"score" | "age" | "delta">("score");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let r = patients;
    if (tierFilter !== "all") r = r.filter((p) => p.tier === tierFilter);
    if (sexFilter !== "all") r = r.filter((p) => p.sex === sexFilter);
    if (ruleFilter !== "all") r = r.filter((p) => p.rules.includes(ruleFilter));
    if (phenoFilter !== "all") r = r.filter((p) => p.phenotype === phenoFilter);
    if (trajFilter !== "all") r = r.filter((p) => p.trajectory === trajFilter);
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      r = r.filter((p) => p.id.includes(q));
    }
    if (sort === "score") r = [...r].sort((a, b) => b.score - a.score);
    else if (sort === "age") r = [...r].sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
    else r = [...r].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return r;
  }, [patients, tierFilter, sexFilter, ruleFilter, phenoFilter, trajFilter, search, sort]);

  const pageData = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE) - 1);

  const resetPage = () => setPage(0);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-ink-200 flex flex-wrap items-center gap-2 text-sm">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          placeholder="Search by patient ID…"
          className="px-3 py-1.5 rounded-md border border-ink-200 bg-white text-sm w-48 focus:outline-none focus:border-tier3"
        />
        <Select value={tierFilter} onChange={(v) => { setTierFilter(v as any); resetPage(); }}
          options={[
            { v: "all", l: "All tiers" },
            { v: "T1", l: "T1" }, { v: "T2", l: "T2" },
            { v: "T3", l: "T3" }, { v: "T4", l: "T4" },
          ]} />
        <Select value={sexFilter} onChange={(v) => { setSexFilter(v as any); resetPage(); }}
          options={[
            { v: "all", l: "All sexes" }, { v: "F", l: "F" }, { v: "M", l: "M" },
          ]} />
        <Select value={phenoFilter} onChange={(v) => { setPhenoFilter(v); resetPage(); }}
          options={[{ v: "all", l: "Any phenotype" }, ...phenotypes.map((p) => ({ v: p, l: p }))]} />
        <Select value={trajFilter} onChange={(v) => { setTrajFilter(v as any); resetPage(); }}
          options={[
            { v: "all", l: "Any trajectory" },
            { v: "stable", l: "Stable" },
            { v: "recovery", l: "Recovering" },
            { v: "decline", l: "Declining" },
          ]} />
        <Select value={ruleFilter} onChange={(v) => { setRuleFilter(v); resetPage(); }}
          options={[{ v: "all", l: "Any rule" }, ...rules.map((r) => ({ v: r, l: r }))]} />
        <Select value={sort} onChange={(v) => setSort(v as any)}
          options={[
            { v: "score", l: "Sort: score ↓" },
            { v: "age", l: "Sort: age ↓" },
            { v: "delta", l: "Sort: |Δ| ↓" },
          ]} />
        <div className="ml-auto text-xs text-ink-500 num">
          {filtered.length.toLocaleString()} matches
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-500 uppercase tracking-wider border-b border-ink-200">
              <Th>Patient</Th>
              <Th>Sex/Age</Th>
              <Th>Phenotype</Th>
              <Th>Tier</Th>
              <Th right>Score</Th>
              <Th right>Δ</Th>
              <Th right>HPA</Th>
              <Th right>Adr</Th>
              <Th right>NT</Th>
              <Th>Trajectory</Th>
              <Th>Rules</Th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((p) => (
              <tr key={p.id} className="border-b border-ink-100 hover:bg-ink-50/60 transition">
                <td className="px-4 py-2.5">
                  <Link href={`/doctor/p?id=${p.id}`} className="num text-ink-900 font-medium hover:text-tier3">
                    {p.id}
                  </Link>
                </td>
                <td className="px-4 py-2.5 num text-ink-700">
                  {p.sex ?? "?"} · {p.age != null ? p.age.toFixed(0) : "?"}
                </td>
                <td className="px-4 py-2.5">
                  {p.phenotype ? (
                    <span
                      className="chip text-[10px]"
                      style={{
                        borderColor: PHENOTYPE_COLOR[p.phenotype as Phenotype] + "40",
                        color: PHENOTYPE_COLOR[p.phenotype as Phenotype],
                      }}
                    >
                      {p.phenotype}
                    </span>
                  ) : (
                    <span className="text-ink-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <TierBadge tier={p.tier} size="sm" />
                </td>
                <td className="px-4 py-2.5 text-right num font-medium">{p.score.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right num">
                  <span style={{ color: p.delta < -2 ? "#10b981" : p.delta > 2 ? "#e11d48" : "#71717a" }}>
                    {p.delta > 0 ? "+" : ""}{p.delta.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right num text-ink-600">{p.hpa.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-right num text-ink-600">{p.adrenal.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-right num text-ink-600">{p.nt.toFixed(0)}</td>
                <td className="px-4 py-2.5">
                  {p.trajectory ? (
                    <span className="text-xs flex items-center gap-1" style={{ color: TRAJECTORY_COLOR[p.trajectory as Trajectory] }}>
                      <span>{p.trajectory === "recovery" ? "↓" : p.trajectory === "decline" ? "↑" : "→"}</span>
                      {TRAJECTORY_LABEL[p.trajectory as Trajectory]}
                    </span>
                  ) : (
                    <span className="text-ink-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.rules.slice(0, 1).map((r) => (
                      <span key={r} className="chip text-[10px]">{r}</span>
                    ))}
                    {p.rules.length > 1 && (
                      <span className="text-[10px] text-ink-500">+{p.rules.length - 1}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-ink-200 flex items-center justify-between text-xs text-ink-500">
        <div className="num">
          {page * PAGE + 1}–{Math.min((page + 1) * PAGE, filtered.length)} of {filtered.length.toLocaleString()}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="px-2 py-1 rounded border border-ink-200 hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed">←</button>
          <span className="px-3 py-1 num">page {page + 1} / {maxPage + 1}</span>
          <button onClick={() => setPage(Math.min(maxPage, page + 1))} disabled={page === maxPage}
            className="px-2 py-1 rounded border border-ink-200 hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed">→</button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-2.5 ${right ? "text-right" : "text-left"} font-medium`}>{children}</th>;
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-md border border-ink-200 bg-white text-sm focus:outline-none focus:border-tier3"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}
