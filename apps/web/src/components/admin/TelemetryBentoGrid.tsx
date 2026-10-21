"use client";

import React from "react";
import { ShieldCheck, Cpu, Zap, Activity, AlertOctagon } from "lucide-react";

interface TelemetryBentoGridProps {
  totalThreats: number;
  criticalCount: number;
  latencySlaMs: number;
  activeBlocklistsCount: number;
}

export function TelemetryBentoGrid({
  totalThreats,
  criticalCount,
  latencySlaMs,
  activeBlocklistsCount,
}: TelemetryBentoGridProps) {
  return (
    <section
      aria-label="Security Telemetry Overview"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* 1. Total Links Inspected */}
      <div className="bg-[#121215] border border-white/5 hover:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Inspection Volume
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/5">
            100% In-Process
          </span>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 flex items-baseline gap-2">
            <span>1,482</span>
            <span className="text-xs font-normal text-zinc-500 font-sans">links verified</span>
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Zero External API Tokens · 0.0$</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          <span>Local ONNX Random Forest v4.18</span>
        </div>
      </div>

      {/* 2. Zero-Token Tensor Latency */}
      <div className="bg-[#121215] border border-white/5 hover:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Tensor Inference SLA
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Sub-18ms SLA
          </span>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 flex items-baseline gap-1.5">
            <span>{latencySlaMs || 18.4}</span>
            <span className="text-sm font-normal text-zinc-400 font-mono">ms mean</span>
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Hardware Accelerated CPU SIMD</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero Network Hops · Pre-Ingestion</span>
        </div>
      </div>

      {/* 3. Intercepted Threats */}
      <div className="bg-[#121215] border border-white/5 hover:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Critical Intercepts
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {criticalCount} Critical
          </span>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 flex items-baseline gap-2">
            <span>{totalThreats}</span>
            <span className="text-xs font-normal text-zinc-500 font-sans">flags recorded</span>
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Punycode, TypoSquatting & Drainers</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Auto-deflected: 99.2%</span>
          <span className="text-emerald-400 font-semibold">Active</span>
        </div>
      </div>

      {/* 4. Global Blocklist Registry */}
      <div className="bg-[#121215] border border-white/5 hover:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            O(1) Redis Blocklist
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Synchronized
          </span>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 flex items-baseline gap-2">
            <span>{activeBlocklistsCount}</span>
            <span className="text-xs font-normal text-zinc-500 font-sans">domain rules</span>
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Wildcard & TLD Regex Shields</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Lookup Latency: ~0.4ms</span>
          <span className="text-zinc-400 font-semibold">SET O(1)</span>
        </div>
      </div>
    </section>
  );
}
