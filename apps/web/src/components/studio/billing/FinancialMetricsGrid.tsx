"use client";

import React from "react";
import { DollarSign, TrendingUp, Users, BarChart3 } from "lucide-react";
import { BillingMetrics } from "@/lib/api-client";

interface FinancialMetricsGridProps {
  metrics: BillingMetrics;
}

export const FinancialMetricsGrid: React.FC<FinancialMetricsGridProps> = ({
  metrics,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: MRR */}
      <div className="bg-[#121215] border border-white/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
              ${metrics.mrr.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            +{metrics.mrrGrowthMoM}% MoM
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            Net New: +${metrics.netNewMrr.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Metric 2: ARR & Target */}
      <div className="bg-[#121215] border border-white/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
              ${metrics.arr.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400">
            <span>Target: ${(metrics.arrTarget / 1000).toFixed(0)}k EOY</span>
            <span className="text-white font-medium">
              {metrics.arrTargetProgress}% reached
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${Math.min(metrics.arrTargetProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric 3: Paid Subscriptions */}
      <div className="bg-[#121215] border border-white/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Paid Subscriptions</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
              {metrics.paidSubscriptions.toLocaleString("en-US")}
            </span>
            <span className="text-xs text-zinc-400">Paid Creators</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-white/10">
            {metrics.netChurn}% Net Churn
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            Conv: {metrics.conversionRate}% / {(metrics.totalUsers / 1000).toFixed(1)}k
          </span>
        </div>
      </div>

      {/* Metric 4: ARPU */}
      <div className="bg-[#121215] border border-white/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-lg shadow-black/40">
        <div>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Average Revenue / User</span>
            <BarChart3 className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight">
              ${metrics.arpu.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-400">/ user / mo</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            +{metrics.arpuGrowthQoQ}% QoQ
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            LTV Est: ${(metrics.arpu * 24).toFixed(0)} (24 mo)
          </span>
        </div>
      </div>
    </div>
  );
};
