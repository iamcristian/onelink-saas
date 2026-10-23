"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  RefreshCw,
  Download,
  Sparkles,
  ExternalLink,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchProfile,
  fetchCurrentUser,
  fetchProfileAnalytics,
  fetchMySubscription,
  BillingSubscription,
  type AnalyticsData,
} from "@/lib/api-client";
import { MetricsCards } from "@/components/studio/analytics/MetricsCards";
import { PerformanceChart } from "@/components/studio/analytics/PerformanceChart";
import { TopLinksTable } from "@/components/studio/analytics/TopLinksTable";
import { BreakdownCards } from "@/components/studio/analytics/BreakdownCards";

export default function StudioAnalyticsPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);

  // Fetch telemetry
  const loadAnalytics = useCallback(async (targetId?: string) => {
    const activeId = targetId || profileId;
    if (!activeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchProfileAnalytics(activeId, days);
      if (res) {
        setData(res);
      } else {
        setData(generateZeroData(days));
      }
    } catch {
      setData(generateZeroData(days));
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [profileId, days]);

  // Load profile identity & subscription
  useEffect(() => {
    let mounted = true;
    const initProfile = async () => {
      try {
        const [userSession, sub] = await Promise.all([
          fetchCurrentUser(),
          fetchMySubscription(),
        ]);

        let targetProfileId = "";
        let targetUsername = "";
        let effectiveSub = sub;

        // Check if user selected an active workspace
        const storedWs = typeof window !== "undefined" ? localStorage.getItem("onelink_active_workspace") : null;
        if (storedWs) {
          try {
            const parsedWs = JSON.parse(storedWs);
            if (parsedWs.ownerProfileId && parsedWs.ownerUsername) {
              targetProfileId = parsedWs.ownerProfileId;
              targetUsername = parsedWs.ownerUsername;
              effectiveSub = {
                id: `sub_${parsedWs.ownerUserId}`,
                userId: parsedWs.ownerUserId,
                planId: "plan_enterprise",
                status: "ACTIVE",
                stripeCustomerId: null,
                stripeSubscriptionId: null,
                currentPeriodEnd: null,
                plan: {
                  id: "plan_enterprise",
                  name: "Enterprise Studio",
                  code: parsedWs.ownerPlan || "ENTERPRISE",
                  priceCents: 2900,
                  interval: "MONTHLY",
                  features: {
                    maxLinks: 9999,
                    customDomains: true,
                    removeBranding: true,
                    customThemes: true,
                    analyticsRetentionDays: 365,
                  },
                },
              };
            }
          } catch {
            // Ignore parse error
          }
        }

        if (!targetProfileId && userSession?.profile?.id) {
          targetProfileId = userSession.profile.id;
          targetUsername = userSession.profile.username;
        }

        if (!targetProfileId && userSession?.profile?.username) {
          const p = await fetchProfile(userSession.profile.username);
          if (p?.id) {
            targetProfileId = p.id;
            targetUsername = p.username || userSession.profile.username;
          }
        }

        if (!targetProfileId) {
          if (mounted) {
            router.push("/login");
          }
          return;
        }

        if (mounted) {
          setSubscription(effectiveSub);
          if (effectiveSub?.plan?.code === "FREE" && days > 7) {
            setDays(7);
          }
          if (targetProfileId) {
            setProfileId(targetProfileId);
            setUsername(targetUsername);
            loadAnalytics(targetProfileId);
          }
        }
      } catch {
        if (mounted) {
          setData(generateZeroData(days));
          setLoading(false);
        }
      }
    };

    initProfile();

    const handleWorkspaceChanged = () => {
      initProfile();
    };

    window.addEventListener("workspace_changed", handleWorkspaceChanged);
    return () => {
      mounted = false;
      window.removeEventListener("workspace_changed", handleWorkspaceChanged);
    };
  }, [days, loadAnalytics, router]);

  const handleSelectDays = (targetDays: number) => {
    const planCode = subscription?.plan?.code || "FREE";
    if (planCode === "FREE" && targetDays > 7) {
      setExportNotice(
        "30-day and 90-day telemetry require Creator Pro ($2/mo). Free tier retains 7 days."
      );
      setTimeout(() => setExportNotice(null), 4500);
      return;
    }
    setDays(targetDays);
  };

  const handleExportCSV = () => {
    const planCode = subscription?.plan?.code || "FREE";
    if (planCode !== "ENTERPRISE") {
      setExportNotice(
        "Executive CSV & PDF telemetry export requires Enterprise Studio ($5/mo). Upgrade in Billing."
      );
      setTimeout(() => setExportNotice(null), 4500);
      return;
    }

    if (!data) return;
    try {
      const escape = (val: string | number) =>
        `"${String(val).replace(/"/g, '""')}"`;

      const lines: string[] = [];
      // 1. Report Header
      lines.push([escape("OneLink Enterprise Analytics & Telemetry Report"), escape(`@${username}`)].join(","));
      lines.push([escape("Generated Timestamp"), escape(new Date().toISOString())].join(","));
      lines.push([escape("Reporting Window"), escape(`${days} Days (${data.period.startDate} to ${data.period.endDate})`)].join(","));
      lines.push("");

      // 2. Executive KPI Summary
      lines.push([escape("--- EXECUTIVE KPI SUMMARY ---")].join(","));
      lines.push([escape("Metric"), escape("Value"), escape("Growth")].join(","));
      lines.push([escape("Total Profile Views"), escape(data.metrics.totalViews), escape(`${data.metrics.viewsGrowth}%`)].join(","));
      lines.push([escape("Total Outbound Clicks"), escape(data.metrics.totalClicks), escape(`${data.metrics.clicksGrowth}%`)].join(","));
      lines.push([escape("Click-Through Rate (CTR)"), escape(`${data.metrics.ctr}%`), escape("-")].join(","));
      lines.push([escape("Active Published Links"), escape(data.metrics.activeLinksCount), escape("-")].join(","));
      lines.push("");

      // 3. Daily Engagement Time Series
      lines.push([escape("--- DAILY ENGAGEMENT TELEMETRY ---")].join(","));
      lines.push([escape("Date"), escape("Page Views"), escape("Outbound Clicks")].join(","));
      data.timeSeries.forEach((t) => {
        lines.push([escape(t.date), escape(t.views), escape(t.clicks)].join(","));
      });
      lines.push("");

      // 4. Top Performing Outbound Links
      lines.push([escape("--- TOP OUTBOUND LINKS PERFORMANCE ---")].join(","));
      lines.push([escape("Rank"), escape("Title"), escape("Target URL"), escape("Clicks"), escape("Share %")].join(","));
      data.topLinks.forEach((l, idx) => {
        lines.push([
          escape(idx + 1),
          escape(l.title),
          escape(l.url || "N/A"),
          escape(l.clicks),
          escape(`${l.ctr}%`),
        ].join(","));
      });
      lines.push("");

      // 5. Traffic Acquisition Sources
      lines.push([escape("--- TRAFFIC ACQUISITION SOURCES ---")].join(","));
      lines.push([escape("Source Platform"), escape("Visitor Count"), escape("Percentage")].join(","));
      data.trafficSources.forEach((s) => {
        lines.push([escape(s.name), escape(s.count), escape(`${s.percentage}%`)].join(","));
      });
      lines.push("");

      // 6. Device & OS Breakdown
      lines.push([escape("--- DEVICE & OS BREAKDOWN ---")].join(","));
      lines.push([escape("Device Type"), escape("Visitor Count"), escape("Percentage")].join(","));
      data.deviceBreakdown.forEach((d) => {
        lines.push([escape(d.name), escape(d.count), escape(`${d.percentage}%`)].join(","));
      });

      const csvContent =
        "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute(
        "download",
        `onelink-analytics-${username}-${days}d.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportNotice("Exported complete Enterprise analytics CSV!");
      setTimeout(() => setExportNotice(null), 3500);
    } catch {
      setExportNotice("Failed to export telemetry.");
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 selection:bg-white/20 selection:text-white">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Analytics & Insights
            </h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live TimescaleDB
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Real-time telemetry, visitor conversion, and audience engagement for{" "}
            <Link
              href={`/${username}`}
              target="_blank"
              className="text-zinc-300 hover:text-white font-medium inline-flex items-center gap-1 group"
            >
              onelink.bio/{username}
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </Link>
          </p>
        </div>

        {/* Controls: Time Range Selector, Refresh, Export */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* 7d vs 30d vs 90d Toggle */}
          <div className="flex items-center bg-[#121215] border border-white/10 rounded-lg p-1 text-xs">
            <button
              onClick={() => handleSelectDays(7)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                days === 7
                  ? "bg-white text-[#09090b] shadow-xs font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => handleSelectDays(30)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                days === 30
                  ? "bg-white text-[#09090b] shadow-xs font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>30 Days</span>
              {(!subscription || subscription.plan?.code === "FREE") && (
                <Lock className="w-2.5 h-2.5 text-zinc-500" />
              )}
            </button>
            <button
              onClick={() => handleSelectDays(90)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                days === 90
                  ? "bg-white text-[#09090b] shadow-xs font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>90 Days</span>
              {(!subscription || subscription.plan?.code === "FREE") && (
                <Lock className="w-2.5 h-2.5 text-zinc-500" />
              )}
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadAnalytics()}
            disabled={loading}
            className="p-2 rounded-lg bg-[#121215] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-white" : ""}`}
            />
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#121215] border border-white/10 hover:border-white/20 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
            title={
              subscription?.plan?.code === "ENTERPRISE"
                ? "Export CSV data"
                : "Export CSV data (Requires Enterprise Studio)"
            }
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
            {subscription?.plan?.code !== "ENTERPRISE" && (
              <Lock className="w-2.5 h-2.5 text-zinc-500 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {exportNotice}
          </span>
          <button
            onClick={() => setExportNotice(null)}
            className="text-emerald-400/80 hover:text-emerald-300 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Analytics Content Body */}
      {loading && !data ? (
        <AnalyticsSkeleton />
      ) : data ? (
        <div className="space-y-8">
          {/* Zero-state onboarding notice */}
          {data.metrics.totalViews === 0 && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-white">Your Analytics Dashboard is Active</p>
                <p className="text-zinc-400 mt-1 leading-relaxed">
                  You haven&apos;t received any page views yet. Share your public link{" "}
                  <Link
                    href={`/${username}`}
                    target="_blank"
                    className="text-emerald-400 hover:underline font-mono"
                  >
                    onelink.bio/{username}
                  </Link>{" "}
                  on your social profiles to start seeing live real-time visitor telemetry and click rates!
                </p>
              </div>
            </div>
          )}

          {/* Section 1: KPI Metrics Grid */}
          <section aria-label="Key Performance Indicators">
            <MetricsCards
              totalViews={data.metrics.totalViews}
              viewsGrowth={data.metrics.viewsGrowth}
              totalClicks={data.metrics.totalClicks}
              clicksGrowth={data.metrics.clicksGrowth}
              ctr={data.metrics.ctr}
              activeLinksCount={data.metrics.activeLinksCount}
            />
          </section>

          {/* Section 2: Time-Series Performance Chart */}
          <section
            aria-label="Performance Over Time"
            className="bg-[#121215] rounded-xl border border-white/5 p-5 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/5 gap-2">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Audience Engagement Over Time
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Daily page views vs. outbound link clicks for the past {days}{" "}
                  days
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-zinc-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {data.period.startDate} — {data.period.endDate}
                </span>
              </div>
            </div>

            <PerformanceChart data={data.timeSeries} />
          </section>

          {/* Section 3: Top Performing Outbound Links */}
          <section aria-label="Top Performing Links">
            <TopLinksTable
              links={data.topLinks}
              totalClicks={data.metrics.totalClicks}
            />
          </section>

          {/* Section 4: Acquisition, Devices & Operating Systems */}
          <section aria-label="Audience Technology and Sources">
            <BreakdownCards
              trafficSources={data.trafficSources}
              deviceBreakdown={data.deviceBreakdown}
              osBreakdown={data.osBreakdown}
            />
          </section>

          {/* Footer Info */}
          <div className="pt-4 pb-12 text-center text-xs text-zinc-600 border-t border-white/5">
            Updated {lastRefreshed ? `at ${lastRefreshed.toLocaleTimeString()}` : "just now"} • Powered by OneLink
            Hypertable Telemetry
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-white/5" />
      <div className="h-64 rounded-xl bg-white/5" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-64 rounded-xl bg-white/5" />
        <div className="h-64 rounded-xl bg-white/5" />
        <div className="h-64 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

function generateZeroData(days: number): AnalyticsData {
  const points = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    points.push({ date: dateStr, views: 0, clicks: 0 });
  }

  return {
    period: {
      days,
      startDate: points[0]?.date || "",
      endDate: points[points.length - 1]?.date || "",
    },
    metrics: {
      totalViews: 0,
      viewsGrowth: 0,
      totalClicks: 0,
      clicksGrowth: 0,
      ctr: 0,
      activeLinksCount: 0,
    },
    timeSeries: points,
    topLinks: [],
    trafficSources: [],
    deviceBreakdown: [],
    osBreakdown: [],
  };
}
