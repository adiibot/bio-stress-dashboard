export function Section({
  eyebrow,
  title,
  children,
  delayClass,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  delayClass?: string;
}) {
  return (
    <section className={`rise ${delayClass ?? ""} mt-16 first:mt-0`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-3">
        {eyebrow}
      </div>
      <h2 className="serif text-2xl sm:text-3xl text-ink-900 leading-tight mb-6 max-w-xl">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
