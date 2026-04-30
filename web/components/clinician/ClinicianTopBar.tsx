"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ClinicianTopBar({
  total,
  scored,
}: {
  total: number;
  scored: number;
}) {
  const pathname = usePathname();
  const onCohort = pathname === "/doctor";

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur-md">
      <div className="h-14 flex items-center justify-between px-5">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-tier1 to-tier3 flex items-center justify-center text-white text-xs font-semibold">
              S
            </span>
            <span className="font-semibold tracking-tight text-ink-900">
              Sorcova
            </span>
            <span className="text-xs text-ink-400 hidden sm:inline">
              · Clinician
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/doctor"
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                onCohort
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:text-ink-900 hover:bg-ink-100"
              }`}
            >
              Cohort
            </Link>
            <Link
              href="/analytics"
              className="px-2.5 py-1 rounded-md text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition"
            >
              Analytics
            </Link>
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-5 text-[11px] text-ink-500">
          <Stat label="Patients" value={total.toLocaleString()} />
          <Stat label="Scored visits" value={scored.toLocaleString()} />
          <span className="chip text-[10px]">v2.9.1 LOCKED</span>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-ink-400 uppercase tracking-wider text-[9px]">
        {label}
      </span>
      <span className="num text-ink-800 font-medium">{value}</span>
    </div>
  );
}
