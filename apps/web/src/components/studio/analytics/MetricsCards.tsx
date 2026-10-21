"use client";

import React from "react";
import { Eye, MousePointerClick, TrendingUp, Link2, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricsCardsProps {
  totalViews: number;
  viewsGrowth: number;
  totalClicks: number;
  clicksGrowth: number;
  ctr: number;
  activeLinksCount: number;
}

export function MetricsCards({
  totalViews,
  viewsGrowth,
  totalClicks,
  clicksGrowth,
  ctr,
  activeLinksCount,
}: MetricsCardsProps) {
  const cards = [
    {
      title: "Total Views",
      value: totalViews.toLocaleString(),
      growth: viewsGrowth,
      icon: Eye,
      description: "Profile impressions across web & mobile",
    },
    {
      title: "Link Clicks",
      value: totalClicks.toLocaleString(),
      growth: clicksGrowth,
      icon: MousePointerClick,
      description: "Outbound clicks to creator content",
    },
    {
      title: "Conversion Rate (CTR)",
      value: `${ctr}%`,
      growth: clicksGrowth - viewsGrowth, // Delta conversion momentum
      icon: TrendingUp,
      description: "Ratio of visitors that clicked a link",
    },
    {
      title: "Active Links",
      value: activeLinksCount.toString(),
      growth: null,
      icon: Link2,
      description: "Links currently published on your bio",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.growth !== null && card.growth >= 0;
        const isNeutral = card.growth === null;

        return (
          <div
            key={card.title}
            className="p-5 rounded-xl bg-[#121215] border border-white/5 hover:border-white/10 transition-all duration-200 shadow-sm relative overflow-hidden group"
          >
            {/* Top Row: Icon & Growth Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:bg-white/10 transition-colors">
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </div>

              {!isNeutral && (
                <div
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {card.growth}%
                  </span>
                </div>
              )}
            </div>

            {/* Metric Value */}
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
              {card.value}
            </div>

            {/* Title & Subtitle */}
            <div className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
              {card.title}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 truncate">
              {card.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
