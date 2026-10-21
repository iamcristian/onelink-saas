"use client";

import React from "react";
import { ExternalLink, MousePointerClick } from "lucide-react";

interface TopLinkItem {
  id: string;
  title: string;
  url: string | null;
  clicks: number;
  ctr: number;
}

interface TopLinksTableProps {
  links: TopLinkItem[];
  totalClicks: number;
}

export function TopLinksTable({ links, totalClicks }: TopLinksTableProps) {
  if (!links || links.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 text-sm bg-[#121215] rounded-xl border border-white/5">
        <MousePointerClick className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No outbound link clicks recorded in this period.</p>
        <p className="text-xs text-zinc-600 mt-1">
          Share your bio link on social media to start tracking clicks.
        </p>
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (rank === 2) {
      return "bg-zinc-400/10 text-zinc-300 border-zinc-400/20";
    }
    if (rank === 3) {
      return "bg-amber-700/10 text-amber-600 border-amber-700/20";
    }
    return "bg-white/5 text-zinc-400 border-white/5";
  };

  return (
    <div className="bg-[#121215] rounded-xl border border-white/5 overflow-hidden">
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Top Performing Links</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ranked by total outbound engagement and conversion rate
          </p>
        </div>
        <span className="text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          {links.length} {links.length === 1 ? "Link" : "Links"} Active
        </span>
      </div>

      <div className="divide-y divide-white/5">
        {links.map((link, index) => {
          const rank = index + 1;
          const sharePct = totalClicks > 0 ? Math.round((link.clicks / totalClicks) * 100) : 0;

          return (
            <div
              key={link.id}
              className="p-4 hover:bg-white/2 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* Left Column: Rank + Title + URL */}
              <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border shrink-0 ${getRankBadge(
                    rank
                  )}`}
                >
                  {rank}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white truncate">
                      {link.title}
                    </span>
                    {link.url && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-white transition-colors shrink-0"
                        title={link.url}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {link.url && (
                    <p className="text-xs text-zinc-500 truncate mt-0.5 max-w-md">
                      {link.url}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Clicks, Share Progress & CTR */}
              <div className="flex items-center space-x-6 sm:space-x-8 pl-9 sm:pl-0 shrink-0">
                {/* Progress bar of share */}
                <div className="w-24 hidden md:block">
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Share</span>
                    <span>{sharePct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${sharePct}%` }}
                    />
                  </div>
                </div>

                {/* Total Clicks */}
                <div className="text-right min-w-16">
                  <div className="text-sm font-semibold text-white">
                    {link.clicks.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zinc-500">clicks</div>
                </div>

                {/* CTR Pill */}
                <div className="text-right min-w-16">
                  <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {link.ctr}% CTR
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
