"use client";
import { useEffect, useState } from "react";

export function AnimatedNumber({
  to,
  duration = 1100,
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const e = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - e, 3);
      setV(to * eased);
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span className={className}>{v.toFixed(decimals)}</span>;
}
