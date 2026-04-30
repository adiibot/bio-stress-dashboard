import Link from "next/link";

export function PatientShell({
  children,
  heroBg,
}: {
  children: React.ReactNode;
  heroBg?: { tint: string; tint2: string };
}) {
  const styleVars = heroBg
    ? ({
        "--hero-tint": heroBg.tint,
        "--hero-tint-2": heroBg.tint2,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className={heroBg ? "hero-bg min-h-screen" : "min-h-screen"} style={styleVars}>
      <header className="absolute top-0 inset-x-0 z-30">
        <div className="max-w-[840px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-tier1 to-tier3 flex items-center justify-center text-white text-xs font-semibold">
              S
            </span>
            <span className="font-semibold tracking-tight text-ink-900">Sorcova</span>
          </Link>
          <Link
            href="/patient"
            className="text-xs text-ink-500 hover:text-ink-900 transition"
          >
            Switch profile
          </Link>
        </div>
      </header>
      <main className="max-w-[840px] mx-auto px-6 pt-20 pb-24">{children}</main>
    </div>
  );
}
