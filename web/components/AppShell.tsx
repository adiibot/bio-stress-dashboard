import Link from "next/link";

export function AppShell({
  active,
  children,
}: {
  active?: "doctor" | "patient" | "analytics" | "home";
  children: React.ReactNode;
}) {
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={[
        "px-3 py-1.5 rounded-md text-sm transition",
        active === key
          ? "bg-ink-900 text-white"
          : "text-ink-600 hover:text-ink-900 hover:bg-ink-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-7 h-7 rounded-md bg-gradient-to-br from-tier1 to-tier3 flex items-center justify-center text-white text-xs font-semibold">S</span>
              <span className="font-semibold tracking-tight">Sorcova</span>
              <span className="text-xs text-ink-500 hidden sm:inline">BIO_STRESS · v2.9.1</span>
            </Link>
            <nav className="flex items-center gap-1">
              {link("/doctor", "Clinician", "doctor")}
              {link("/patient", "Patient", "patient")}
              {link("/analytics", "Analytics", "analytics")}
            </nav>
          </div>
          <div className="text-xs text-ink-500">10,000-patient synthetic cohort</div>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
