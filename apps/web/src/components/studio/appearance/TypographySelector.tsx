"use client";

import React from "react";
import { Type } from "lucide-react";

interface TypographySelectorProps {
  fontFamily: string;
  titleWeight: "font-normal" | "font-medium" | "font-semibold" | "font-bold";
  onChangeFont: (font: string) => void;
  onChangeWeight: (weight: "font-normal" | "font-medium" | "font-semibold" | "font-bold") => void;
}

const FONTS = [
  { id: "Geist", label: "Geist (Clean Architectural)" },
  { id: "Space Grotesk", label: "Space Grotesk (Tech Editorial)" },
  { id: "Inter", label: "Inter (Modern Neo-grotesque)" },
  { id: "JetBrains Mono", label: "JetBrains Mono (Technical)" },
];

const WEIGHTS = [
  { id: "font-normal" as const, label: "Regular" },
  { id: "font-medium" as const, label: "Medium" },
  { id: "font-semibold" as const, label: "SemiBold" },
  { id: "font-bold" as const, label: "Bold" },
];

export function TypographySelector({
  fontFamily,
  titleWeight,
  onChangeFont,
  onChangeWeight,
}: TypographySelectorProps) {
  return (
    <section className="space-y-5 bg-zinc-900/60 rounded-2xl p-6 border border-white/5 select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
        <div className="flex items-center space-x-2">
          <Type className="w-4 h-4 text-white" />
          <h2 className="text-base font-semibold text-white tracking-tight">
            Typography &amp; Font Family
          </h2>
        </div>
        <span className="text-[11px] font-mono uppercase text-zinc-400">
          TYPEFACE
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Font Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-zinc-400">
            Primary Font
          </label>
          <div className="relative">
            <select
              value={fontFamily}
              onChange={(e) => onChangeFont(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400 cursor-pointer"
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id} className="bg-zinc-900 text-white">
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title Weight */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-zinc-400">
            Title Weight
          </label>
          <div className="flex items-center rounded-xl bg-zinc-900 p-1 border border-white/10">
            {WEIGHTS.map((w) => {
              const isSelected = titleWeight === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onChangeWeight(w.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-zinc-950 font-semibold shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
