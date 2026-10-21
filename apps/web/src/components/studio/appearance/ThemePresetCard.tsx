"use client";

import React from "react";
import { Check } from "lucide-react";
import { isLightColor } from "@/lib/theme-contrast";

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
  const isLight = isLightColor(preset.bgValue);
  const isPillLight = isLightColor(preset.btnColor);

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={`tactile-card relative p-3.5 rounded-xl flex flex-col justify-between h-36 text-left transition-all cursor-pointer select-none ${
        isSelected
          ? isLight
            ? "ring-2 ring-zinc-950 border-2 border-zinc-950 shadow-xl"
            : "ring-2 ring-white border-2 border-white shadow-xl"
          : isLight
          ? "border border-zinc-300 hover:border-zinc-500 shadow-xs"
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
              ? isLight
                ? "bg-zinc-950 text-white"
                : "bg-white text-zinc-950"
              : isLight
              ? "border border-zinc-400 bg-white/70"
              : "border border-zinc-600 bg-black/40"
          }`}
        >
          {isSelected && <Check className="w-2.5 h-2.5 stroke-3" />}
        </div>
        {isSelected && (
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              isLight
                ? "text-zinc-950 bg-black/10 border border-black/15 font-bold"
                : "text-white bg-black/60 border border-white/20"
            }`}
          >
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
            opacity: 0.95,
            border: isLight && isPillLight ? "1px solid rgba(0, 0, 0, 0.15)" : undefined,
          }}
        />
        <div
          className="w-3/4 h-2.5 transition-all shadow-xs"
          style={{
            backgroundColor: preset.btnColor,
            borderRadius: `${Math.min(preset.btnRadius, 9999)}px`,
            opacity: 0.75,
            border: isLight && isPillLight ? "1px solid rgba(0, 0, 0, 0.15)" : undefined,
          }}
        />
      </div>

      {/* Footer Title */}
      <div
        className={`flex items-center justify-between pt-2 border-t w-full ${
          isLight ? "border-black/10" : "border-white/10"
        }`}
      >
        <span
          className="text-xs font-semibold truncate"
          style={{ color: preset.textColor }}
        >
          {preset.name}
        </span>
      </div>
    </button>
  );
}
