"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import { useCompareSet } from "./CompareBar";
import {
  PHENOTYPE_COLOR,
  TIER_COLOR,
  TRAJECTORY_COLOR,
  type PatientIndexEntry,
  type Phenotype,
  type Tier,
  type Trajectory,
} from "@/lib/types";

const VISIBLE = 200;

export function RosterSidebar({
  patients,
  phenotypes,
  rules,
}: {
  patients: PatientIndexEntry[];
  phenotypes: string[];
  rules: string[];
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeId = useMemo(
    () => (pathname.startsWith("/doctor/p") ? sp.get("id") : null),
    [pathname, sp],
  );

  const [tier, setTier] = useState<"all" | Tier>("all");
  const [sex, setSex] = useState<"all" | "F" | "M">("all");
  const [pheno, setPheno] = useState<string>("all");
  const [traj, setTraj] = useState<"all" | Trajectory>("all");
  const [rule, setRule] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"score" | "delta">("score");

  const filtered = useMemo(() => {
    let r = patients;
    if (tier !== "all") r = r.filter((p) => p.tier === tier);
    if (sex !== "all") r = r.filter((p) => p.sex === sex);
    if (pheno !== "all") r = r.filter((p) => p.phenotype === pheno);
    if (traj !== "all") r = r.filter((p) => p.trajectory === traj);
    if (rule !== "all") r = r.filter((p) => p.rules.includes(rule));
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      r = r.filter((p) => p.id.includes(q));
    }
    if (sort === "score") r = [...r].sort((a, b) => b.score - a.score);
    else r = [...r].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return r;
  }, [patients, tier, sex, pheno, traj, rule, search, sort]);

  const visible = filtered.slice(0, VISIBLE);

  // keyboard: j/k to move, '/' to focus search
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") {
        if (e.key === "Escape") (t as HTMLInputElement).blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key !== "j" && e.key !== "k") return;
      const ids = visible.map((p) => p.id);
      const i = activeId ? ids.indexOf(activeId) : -1;
      const next = e.key === "j" ? Math.min(ids.length - 1, i + 1) : Math.max(0, i - 1);
      if (ids[next]) {
        const a = document.querySelector<HTMLAnchorElement>(`a[data-pid="${ids[next]}"]`);
        a?.click();
        a?.scrollIntoView({ block: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, activeId]);

  return (
    <aside className="border-r border-ink-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
      {/* filters */}
      <div className="p-3 border-b border-ink-100 space-y-2 shrink-0">
        <div className="relative">
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients…"
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-ink-200 bg-white text-xs focus:outline-none focus:border-tier3"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11 L 14 14" strokeLinecap="round" />
          </svg>
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-400 num">
            /
          </kbd>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Sel value={tier} onChange={(v) => setTier(v as any)} options={[
            { v: "all", l: "All tiers" }, { v: "T1", l: "T1" }, { v: "T2", l: "T2" }, { v: "T3", l: "T3" }, { v: "T4", l: "T4" },
          ]} />
          <Sel value={traj} onChange={(v) => setTraj(v as any)} options={[
            { v: "all", l: "Any trajectory" }, { v: "stable", l: "Stable" }, { v: "recovery", l: "Recovering" }, { v: "decline", l: "Declining" },
          ]} />
          <Sel value={pheno} onChange={(v) => setPheno(v)} options={[
            { v: "all", l: "Any phenotype" }, ...phenotypes.map((p) => ({ v: p, l: p })),
          ]} />
          <Sel value={rule} onChange={(v) => setRule(v)} options={[
            { v: "all", l: "Any rule" }, ...rules.map((r) => ({ v: r, l: r })),
          ]} />
          <Sel value={sex} onChange={(v) => setSex(v as any)} options={[
            { v: "all", l: "All sexes" }, { v: "F", l: "F" }, { v: "M", l: "M" },
          ]} />
          <Sel value={sort} onChange={(v) => setSort(v as any)} options={[
            { v: "score", l: "Sort: score" }, { v: "delta", l: "Sort: |Δ|" },
          ]} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-ink-500">
          <div className="num">
            <span className="text-ink-700 font-medium">{filtered.length.toLocaleString()}</span> match
            {filtered.length === VISIBLE && (
              <span className="ml-1">· showing first {VISIBLE}</span>
            )}
          </div>
          <div className="text-ink-400">
            <kbd className="num">j</kbd>/<kbd className="num">k</kbd> nav
          </div>
        </div>
      </div>

      {/* list */}
      <ol className="overflow-y-auto flex-1 divide-y divide-ink-100">
        {visible.map((p) => (
          <li key={p.id}>
            <PatientRow p={p} active={p.id === activeId} />
          </li>
        ))}
        {visible.length === 0 && (
          <li className="p-6 text-xs text-ink-500 text-center">No matches.</li>
        )}
      </ol>
    </aside>
  );
}

function PatientRow({ p, active }: { p: PatientIndexEntry; active: boolean }) {
  const [compareIds, toggleCompare] = useCompareSet();
  const inCompare = compareIds.includes(p.id);
  return <PatientRowInner p={p} active={active} inCompare={inCompare} onToggleCompare={() => toggleCompare(p.id)} />;
}

function PatientRowInner({
  p, active, inCompare, onToggleCompare,
}: {
  p: PatientIndexEntry;
  active: boolean;
  inCompare: boolean;
  onToggleCompare: () => void;
}) {
  const tierColor = TIER_COLOR[p.tier];
  const trajColor = p.trajectory ? TRAJECTORY_COLOR[p.trajectory as Trajectory] : "#a1a1aa";
  const phenoColor = p.phenotype ? PHENOTYPE_COLOR[p.phenotype as Phenotype] : "#a1a1aa";
  return (
    <div
      className={`block px-3 py-2 transition group relative ${
        active ? "bg-ink-50" : "hover:bg-ink-50/60"
      }`}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleCompare();
        }}
        aria-label={inCompare ? "Remove from compare" : "Add to compare"}
        className={`absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 rounded border text-[12px] leading-none transition opacity-0 group-hover:opacity-100 ${
          inCompare
            ? "bg-ink-900 text-white border-ink-900 opacity-100"
            : "border-ink-300 text-ink-500 bg-white hover:border-ink-900 hover:text-ink-900"
        }`}
      >
        {inCompare ? "✓" : "+"}
      </button>
      <Link
        href={`/doctor/p?id=${p.id}`}
        data-pid={p.id}
        className="block pr-7"
      >
      <div className="flex items-center gap-2">
        <span
          className="w-1 h-9 rounded-full shrink-0"
          style={{ background: tierColor, opacity: active ? 1 : 0.5 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="num text-[12px] font-medium text-ink-900 truncate">
              {p.id}
            </span>
            <span className="num text-[12px] font-semibold" style={{ color: tierColor }}>
              {p.score.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-ink-500">
            <span className="num">
              {p.sex ?? "?"} · {p.age != null ? p.age.toFixed(0) : "?"}
            </span>
            {p.phenotype && (
              <>
                <span className="text-ink-300">·</span>
                <span style={{ color: phenoColor }} className="truncate">
                  {p.phenotype}
                </span>
              </>
            )}
            <span className="ml-auto flex items-center gap-1 num">
              <span style={{ color: trajColor }}>
                {p.trajectory === "recovery" ? "↓" : p.trajectory === "decline" ? "↑" : "→"}
              </span>
              <span style={{ color: p.delta < -2 ? "#10b981" : p.delta > 2 ? "#e11d48" : "#a1a1aa" }}>
                {p.delta > 0 ? "+" : ""}{p.delta.toFixed(1)}
              </span>
            </span>
          </div>
        </div>
      </div>
      </Link>
    </div>
  );
}

function Sel({
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
      className="w-full px-2 py-1.5 rounded-md border border-ink-200 bg-white text-[11px] focus:outline-none focus:border-tier3"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}
