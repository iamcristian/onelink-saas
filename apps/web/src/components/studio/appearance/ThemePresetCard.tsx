"use client";

import React from "react";
import { Check } from "lucide-react";

export interface ThemePreset {
  id: string;
  name: string;
  bgType: "SOLID" | "GRADIENT";
  bgValue: string;
  btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED";
  btnColor: string;
  btnTextColor: string;
  textColor: string;
  btnRadius: number;
  fontFamily: string;
  isCustom?: boolean;
}

interface ThemePresetCardProps {
  preset: ThemePreset;
  isSelected: boolean;
  onSelect: (preset: ThemePreset) => void;
}

export function ThemePresetCard({
  preset,
  isSelected,
  onSelect,
}: ThemePresetCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={`tactile-card relative p-3.5 rounded-xl flex flex-col justify-between h-36 text-left transition-all cursor-pointer select-none ${
        isSelected
          ? "ring-2 ring-white border-2 border-white shadow-xl"
          : "border border-zinc-800 hover:border-zinc-600 bg-zinc-900/60"
      }`}
      style={{
        background: preset.bgValue,
      }}
    >
      {/* Top Bar with Selection Dot */}
      <div className="flex justify-between items-start w-full">
        <div
          className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
            isSelected
              ? "bg-white text-zinc-950"
              : "border border-zinc-600 bg-black/40"
          }`}
        >
          {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
        </div>
        {isSelected && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-white bg-black/60 px-1.5 py-0.5 rounded-full border border-white/20">
            Active
          </span>
        )}
      </div>

      {/* Miniature mock link pills */}
      <div className="space-y-1.5 w-full my-auto">
        <div
          className="w-full h-2.5 transition-all shadow-xs"
          style={{
            backgroundColor: preset.btnColor,
            borderRadius: `${Math.min(preset.btnRadius, 9999)}px`,
            opacity: 0.9,
          }}
        />
        <div
          className="w-3/4 h-2.5 transition-all shadow-xs"
          style={{
            backgroundColor: preset.btnColor,
            borderRadius: `${Math.min(preset.btnRadius, 9999)}px`,
            opacity: 0.6,
          }}
        />
      </div>

      {/* Footer Title */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 w-full">
        <span
          className="text-xs font-medium truncate"
          style={{ color: preset.textColor }}
        >
          {preset.name}
        </span>
      </div>
    </button>
  );
}
