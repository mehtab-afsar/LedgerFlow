"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PRESETS = [
  { value: "7", label: "7d" },
  { value: "15", label: "15d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

export function PeriodPicker({
  activePreset,
  from,
  to,
}: {
  activePreset: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function setPreset(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    params.delete("from");
    params.delete("to");
    router.push(`/dashboard?${params.toString()}`);
    setCustomOpen(false);
  }

  function applyCustom() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", customFrom);
    params.set("to", customTo);
    params.delete("period");
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-line bg-white p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={cn(
              "rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
              activePreset === p.value ? "bg-brand text-white" : "text-ink-2 hover:bg-paper",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((s) => !s)}
          className={cn(
            "rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
            activePreset === "custom" ? "bg-brand text-white" : "text-ink-2 hover:bg-paper",
          )}
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <div className="flex items-center gap-2 rounded-md border border-line bg-white px-2 py-1">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border-none bg-transparent px-1 py-1 font-mono text-[13px] text-ink focus:outline-none"
          />
          <span className="text-ink-3">–</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border-none bg-transparent px-1 py-1 font-mono text-[13px] text-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="rounded-md bg-brand px-3 py-1 text-[12.5px] font-medium text-white hover:bg-brand-hover"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
