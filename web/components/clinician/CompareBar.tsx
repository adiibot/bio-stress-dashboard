"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "sorcova-compare-ids";
const MAX = 3;

function readSet(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string").slice(0, MAX);
  } catch {}
  return [];
}

function writeSet(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("sorcova-compare-changed"));
}

export function useCompareSet(): [string[], (id: string) => void, () => void] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(readSet());
    const handler = () => setIds(readSet());
    window.addEventListener("sorcova-compare-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("sorcova-compare-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const toggle = (id: string) => {
    const cur = readSet();
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : cur.length < MAX
      ? [...cur, id]
      : cur;
    writeSet(next);
    setIds(next);
  };
  const clear = () => {
    writeSet([]);
    setIds([]);
  };
  return [ids, toggle, clear];
}

export function CompareBar() {
  const [ids, , clear] = useCompareSet();
  if (ids.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="rounded-full bg-ink-900 text-white shadow-cardHover flex items-center gap-2 pl-4 pr-2 py-2 text-sm">
        <span className="text-white/70 text-xs">Compare</span>
        <span className="flex items-center gap-1">
          {ids.map((id, i) => (
            <span
              key={id}
              className="num text-[11px] bg-white/10 rounded-full px-2 py-0.5"
            >
              {id.replace("SOVOPSYN", "")}
              {i < ids.length - 1 && <span className="ml-1 opacity-50">·</span>}
            </span>
          ))}
        </span>
        <Link
          href={`/doctor/compare?ids=${ids.join(",")}`}
          className={`ml-1 rounded-full px-3 py-1 text-xs font-medium transition ${
            ids.length >= 2
              ? "bg-white text-ink-900 hover:bg-ink-100"
              : "bg-white/10 text-white/50 pointer-events-none"
          }`}
        >
          {ids.length >= 2 ? "Open" : `Pick ${2 - ids.length} more`}
        </Link>
        <button
          onClick={clear}
          className="text-white/40 hover:text-white px-1.5 transition"
          aria-label="Clear"
        >
          ×
        </button>
      </div>
    </div>
  );
}
