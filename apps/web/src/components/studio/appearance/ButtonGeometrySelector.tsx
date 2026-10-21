"use client";

import React from "react";
import { Check, Shapes } from "lucide-react";

interface ButtonGeometrySelectorProps {
  btnRadius: number;
  btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED";
  btnColor: string;
  btnTextColor: string;
  onChangeRadius: (radius: number) => void;
  onChangeStyle: (style: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED") => void;
  onChangeColor: (color: string) => void;
  onChangeTextColor: (textColor: string) => void;
}

const RADIUS_OPTIONS = [
  { label: "Pill (Full)", radius: 9999 },
  { label: "Curved (12px)", radius: 12 },
  { label: "Soft (8px)", radius: 8 },
  { label: "Sharp (0px)", radius: 0 },
];

const STYLE_OPTIONS = [
  { label: "Solid Fill", style: "FILLED" as const },
  { label: "Outline", style: "OUTLINE" as const },
  { label: "Hard Shadow", style: "SHADOW" as const },
  { label: "Glass Soft", style: "ROUNDED" as const },
];

const COLOR_PRESETS = [
  "#ffffff",
  "#18181b",
  "#27272a",
  "#09090b",
  "#06b6d4",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
];

export function ButtonGeometrySelector({
  btnRadius,
  btnStyle,
  btnColor,
  btnTextColor,
  onChangeRadius,
  onChangeStyle,
  onChangeColor,
  onChangeTextColor,
}: ButtonGeometrySelectorProps) {
  return (
    <section className="space-y-6 bg-zinc-900/60 rounded-2xl p-6 border border-white/5 select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
        <div className="flex items-center space-x-2">
          <Shapes className="w-4 h-4 text-white" />
          <h2 className="text-base font-semibold text-white tracking-tight">
            Button Geometry &amp; Styles
          </h2>
        </div>
        <span className="text-[11px] font-mono uppercase text-zinc-400">
          INTERACTIVE SLICES
        </span>
      </div>

      {/* Corner Radius */}
      <div className="space-y-2.5">
        <label className="text-xs font-mono uppercase text-zinc-400">
          Corner Radius
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {RADIUS_OPTIONS.map((opt) => {
            const isSelected =
              opt.radius === 9999
                ? btnRadius >= 999
                : opt.radius === 12
                ? btnRadius >= 10 && btnRadius <= 16
                : opt.radius === 8
                ? btnRadius >= 6 && btnRadius <= 9
                : btnRadius < 6;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChangeRadius(opt.radius)}
                className={`py-2.5 px-3 text-xs font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  opt.radius === 9999
                    ? "rounded-full"
                    : opt.radius === 12
                    ? "rounded-xl"
                    : opt.radius === 8
                    ? "rounded-lg"
                    : "rounded-none"
                } ${
                  isSelected
                    ? "bg-white text-zinc-950 font-semibold shadow-sm ring-1 ring-white"
                    : "bg-zinc-900 border border-white/5 text-zinc-300 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-zinc-950" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Surface Style */}
      <div className="space-y-2.5">
        <label className="text-xs font-mono uppercase text-zinc-400">
          Surface &amp; Material Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {STYLE_OPTIONS.map((opt) => {
            const isSelected = btnStyle === opt.style;
            return (
              <button
                key={opt.style}
                type="button"
                onClick={() => onChangeStyle(opt.style)}
                className={`py-2 px-3 rounded-full text-xs font-medium flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-800 text-white border-2 border-white font-semibold shadow-sm"
                    : "bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-3 text-white" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Button Colors Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-zinc-400">
            Button Fill Color
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChangeColor(color)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    btnColor === color
                      ? "ring-2 ring-white scale-110 border-black"
                      : "border-white/10 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <input
              type="color"
              value={btnColor}
              onChange={(e) => onChangeColor(e.target.value)}
              className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border border-white/10"
              title="Custom Button Color"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-zinc-400">
            Button Text Color
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onChangeTextColor("#ffffff")}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                btnTextColor === "#ffffff"
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 text-zinc-300 border-white/10"
              }`}
            >
              Light Text
            </button>
            <button
              type="button"
              onClick={() => onChangeTextColor("#09090b")}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                btnTextColor === "#09090b"
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 text-zinc-300 border-white/10"
              }`}
            >
              Dark Text
            </button>
            <input
              type="color"
              value={btnTextColor}
              onChange={(e) => onChangeTextColor(e.target.value)}
              className="w-7 h-7 rounded-lg bg-transparent cursor-pointer border border-white/10"
              title="Custom Text Color"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
