"use client";
import { useEffect, useState } from "react";

const KEY = "sorcova-patient-mode";
type Mode = "standard" | "advanced";

export function useViewMode(): [Mode, (m: Mode) => void] {
  const [mode, setMode] = useState<Mode>("standard");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem(KEY)) as Mode | null;
    if (stored === "standard" || stored === "advanced") setMode(stored);
  }, []);
  const change = (m: Mode) => {
    setMode(m);
    if (typeof window !== "undefined") localStorage.setItem(KEY, m);
  };
  return [mode, change];
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center p-0.5 rounded-full border border-ink-200 bg-white/80 backdrop-blur text-xs"
    >
      {(["standard", "advanced"] as Mode[]).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 rounded-full transition capitalize ${
            mode === m
              ? "bg-ink-900 text-white"
              : "text-ink-600 hover:text-ink-900"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
