"use client";

import React from "react";
import { Monitor, Smartphone, Tablet, Globe, Compass, Share2 } from "lucide-react";

interface BreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

interface BreakdownCardsProps {
  trafficSources: BreakdownItem[];
  deviceBreakdown: BreakdownItem[];
  osBreakdown: BreakdownItem[];
}

export function BreakdownCards({
  trafficSources,
  deviceBreakdown,
  osBreakdown,
}: BreakdownCardsProps) {
  const getDeviceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("mobile") || lower.includes("phone")) {
      return <Smartphone className="w-4 h-4 text-emerald-400" />;
    }
    if (lower.includes("tablet") || lower.includes("ipad")) {
      return <Tablet className="w-4 h-4 text-amber-400" />;
    }
    return <Monitor className="w-4 h-4 text-blue-400" />;
  };

  const getSourceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("direct")) {
      return <Compass className="w-4 h-4 text-zinc-400" />;
    }
    if (
      lower.includes("instagram") ||
      lower.includes("tiktok") ||
      lower.includes("youtube") ||
      lower.includes("x") ||
      lower.includes("twitter")
    ) {
      return <Share2 className="w-4 h-4 text-pink-400" />;
    }
    return <Globe className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Traffic Sources */}
      <div className="bg-[#121215] rounded-xl border border-white/5 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Traffic Sources</h3>
            <span className="text-xs text-zinc-500">Referrers</span>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Where your profile visitors are arriving from
          </p>

          <div className="space-y-3">
            {trafficSources && trafficSources.length > 0 ? (
              trafficSources.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center space-x-2 text-zinc-200">
                      {getSourceIcon(item.name)}
                      <span className="font-medium capitalize">{item.name}</span>
                    </span>
                    <span className="text-zinc-400 font-mono">
                      {item.count.toLocaleString()} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500/80 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs">
                No referral data recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Device Breakdown */}
      <div className="bg-[#121215] rounded-xl border border-white/5 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Device Breakdown</h3>
            <span className="text-xs text-zinc-500">Hardware</span>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Audience hardware distribution
          </p>

          <div className="space-y-3">
            {deviceBreakdown && deviceBreakdown.length > 0 ? (
              deviceBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center space-x-2 text-zinc-200">
                      {getDeviceIcon(item.name)}
                      <span className="font-medium capitalize">{item.name}</span>
                    </span>
                    <span className="text-zinc-400 font-mono">
                      {item.count.toLocaleString()} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/80 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs">
                No device data recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Operating System */}
      <div className="bg-[#121215] rounded-xl border border-white/5 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Operating Systems</h3>
            <span className="text-xs text-zinc-500">Platforms</span>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            Audience operating environment
          </p>

          <div className="space-y-3">
            {osBreakdown && osBreakdown.length > 0 ? (
              osBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-200 font-medium capitalize">
                      {item.name}
                    </span>
                    <span className="text-zinc-400 font-mono">
                      {item.count.toLocaleString()} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-amber-500/80 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs">
                No OS telemetry recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
