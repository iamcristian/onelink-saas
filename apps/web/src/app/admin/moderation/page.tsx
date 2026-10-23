"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Shield,
  RefreshCw,
  Download,
  Activity,
  Globe,
  History,
  Sliders,
  Users,
  LogOut,
} from "lucide-react";
import {
  fetchSentinelTelemetry,
  fetchSecurityThreats,
  fetchDomainBlocklist,
  fetchAdminAuditLogs,
  fetchAdminUsers,
  fetchCurrentUser,
  clearAuthToken,
  type SentinelTelemetry,
  type SecurityThreatItem,
  type DomainBlocklistItem,
  type AdminAuditLogItem,
  type AdminUserItem,
  type CurrentUserSession,
} from "@/lib/api-client";
import { TelemetryBentoGrid } from "@/components/admin/TelemetryBentoGrid";
import { LiveUrlSandbox } from "@/components/admin/LiveUrlSandbox";
import { ThreatQueueTable } from "@/components/admin/ThreatQueueTable";
import { DomainBlocklistManager } from "@/components/admin/DomainBlocklistManager";
import { AuditLogsViewer } from "@/components/admin/AuditLogsViewer";
import { UserDirectoryTable } from "@/components/admin/UserDirectoryTable";

const NAV_TABS = [
  { id: "threats", name: "Threat Stream", icon: ShieldAlert },
  { id: "users", name: "User Directory & Access", icon: Users },
  { id: "sandbox", name: "Interception Engine", icon: Activity },
  { id: "domains", name: "Domain Registry", icon: Globe },
  { id: "audit", name: "Audit Ledgers", icon: History },
];

const INITIAL_FALLBACK_THREATS: SecurityThreatItem[] = [
  {
    id: "flag-1",
    userId: "user-1",
    submittedUrl: "http://metamask-security-auth.xyz/drain",
    riskScore: 0.94,
    threatType: "CRYPTO_DRAINER",
    aiConfidence: 0.984,
    ipAddress: "185.220.101.4",
    status: "BLOCKED_AUTO",
    resolutionNotes: "Detected: Punycode Spoofing + Crypto Drainer heuristics",
    createdAt: "2026-10-16T10:20:00Z",
    user: {
      id: "user-1",
      email: "crypto@promo.xyz",
      role: "CREATOR",
      isBanned: true,
      profile: {
        username: "cryptopromos",
        title: "Claim $10,000 Free Airdrop",
        avatarUrl: null,
      },
    },
  },
  {
    id: "flag-2",
    userId: "user-2",
    submittedUrl: "https://paypal-account-verify-login.top/account",
    riskScore: 0.88,
    threatType: "PHISHING",
    aiConfidence: 0.912,
    ipAddress: "194.26.29.112",
    status: "BLOCKED_AUTO",
    resolutionNotes: "Detected: Brand Keyword Hijack (PayPal)",
    createdAt: "2026-10-16T11:45:00Z",
    user: {
      id: "user-2",
      email: "deals@daily-promos.top",
      role: "CREATOR",
      isBanned: false,
      profile: {
        username: "deals_daily",
        title: "Daily Promo Deals",
        avatarUrl: null,
      },
    },
  },
  {
    id: "flag-3",
    userId: "user-3",
    submittedUrl: "http://free-steam-wallet-nitro.ru/gift?id=8271",
    riskScore: 0.92,
    threatType: "MALWARE",
    aiConfidence: 0.965,
    ipAddress: "45.142.214.88",
    status: "PENDING_REVIEW",
    resolutionNotes: "Detected: Free nitro discord gift credential stealer",
    createdAt: "2026-10-16T12:10:00Z",
    user: {
      id: "user-3",
      email: "nitro@giftbot.ru",
      role: "CREATOR",
      isBanned: false,
      profile: {
        username: "nitro_gifts",
        title: "Free Discord Nitro",
        avatarUrl: null,
      },
    },
  },
  {
    id: "flag-4",
    userId: "user-4",
    submittedUrl: "https://binance-airdrop-claim-rewards.cc/connect",
    riskScore: 0.96,
    threatType: "CRYPTO_DRAINER",
    aiConfidence: 0.978,
    ipAddress: "103.152.220.14",
    status: "BANNED",
    resolutionNotes: "Wallet drainer contract detected",
    createdAt: "2026-10-16T12:30:00Z",
    user: {
      id: "user-4",
      email: "binance@claim-airdrop.cc",
      role: "CREATOR",
      isBanned: true,
      profile: {
        username: "binance_airdrop",
        title: "Binance Official Claim",
        avatarUrl: null,
      },
    },
  },
];

const INITIAL_FALLBACK_BLOCKLIST: DomainBlocklistItem[] = [
  {
    id: "b-1",
    domainPattern: "*.xyz",
    reason: "High concentration of malicious Web3 drainer contracts",
    createdAt: "2026-10-16T08:00:00Z",
    addedBy: { id: "admin-1", name: "Cris Super Admin", email: "admin@onelink.bio" },
  },
  {
    id: "b-2",
    domainPattern: "*.top",
    reason: "Rampant brand credential phishing",
    createdAt: "2026-10-16T08:00:00Z",
    addedBy: { id: "admin-1", name: "Cris Super Admin", email: "admin@onelink.bio" },
  },
  {
    id: "b-3",
    domainPattern: "*.ru/gift*",
    reason: "Nitro gift spam bots and credential stealers",
    createdAt: "2026-10-16T08:00:00Z",
    addedBy: { id: "admin-1", name: "Cris Super Admin", email: "admin@onelink.bio" },
  },
  {
    id: "b-4",
    domainPattern: "drainer-*.cc",
    reason: "Known crypto wallet drainer templates",
    createdAt: "2026-10-16T08:00:00Z",
    addedBy: { id: "admin-1", name: "Cris Super Admin", email: "admin@onelink.bio" },
  },
];

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<string>("threats");
  const [loading, setLoading] = useState<boolean>(true);
  const [telemetry, setTelemetry] = useState<SentinelTelemetry | null>(null);
  const [threats, setThreats] = useState<SecurityThreatItem[]>([]);
  const [blocklist, setBlocklist] = useState<DomainBlocklistItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem("onelink_token");
    localStorage.removeItem("onelink_active_workspace");
    window.location.href = "/login";
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const meData = await fetchCurrentUser().catch(() => null);
      if (!meData) {
        window.location.href = "/login";
        return;
      }
      if (meData.role !== "SUPER_ADMIN" && meData.role !== "OWNER") {
        window.location.href = "/studio/links";
        return;
      }
      setCurrentUser(meData);

      const [tData, thData, bData, aData, uData] = await Promise.all([
        fetchSentinelTelemetry(),
        fetchSecurityThreats(50),
        fetchDomainBlocklist(),
        fetchAdminAuditLogs(30),
        fetchAdminUsers(),
      ]);

      if (tData) setTelemetry(tData);
      if (thData) setThreats(thData);
      if (bData) setBlocklist(bData);
      if (aData) setAuditLogs(aData);
      if (uData) setUsers(uData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load moderation feeds";
      setFetchError(msg);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        loadData();
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadData]);

  const criticalThreatsCount = threats.filter(
    (t) => Number(t.riskScore) >= 0.85
  ).length;

  const escapeCsvCell = (val: string) => {
    let s = String(val ?? "");
    if (/^[=+\-@]/.test(s)) {
      s = `'${s}`;
    }
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      s = `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleExportAudit = () => {
    try {
      const rows = [
        ["ID", "Submitted URL", "Risk Score", "Threat Type", "Status", "Created At"],
        ...threats.map((t) => [
          escapeCsvCell(t.id),
          escapeCsvCell(t.submittedUrl),
          escapeCsvCell(Number(t.riskScore).toString()),
          escapeCsvCell(t.threatType),
          escapeCsvCell(t.status),
          escapeCsvCell(t.createdAt),
        ]),
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `sentinel-threat-audit-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans selection:bg-white/20 selection:text-white">
      {/* Tactical Top App Bar */}
      <header className="w-full px-4 sm:px-8 h-16 flex items-center justify-between border-b border-white/5 bg-[#0e0e10]/95 backdrop-blur-md sticky top-0 z-50">
        {/* Brand & Engine Aura */}
        <div className="flex items-center space-x-6 sm:space-x-8">
          <Link
            href="/admin/moderation"
            className="flex items-center space-x-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white transition-transform group-hover:scale-105 shadow-sm">
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white font-mono uppercase">
                ONELINK // TRUST & SAFETY
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Sentinel-Core v4.18.2-rt
              </span>
            </div>
          </Link>

          {/* Online SLA Pill */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SENTINEL ENGINE: ONLINE (18.4ms)</span>
          </div>
        </div>

        {/* Trailing Actions & Super Admin Pill */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-[#121215] border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            title="Refresh threat streams"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-white" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={handleExportAudit}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#121215] border border-white/10 hover:border-white/20 text-xs font-mono text-zinc-300 hover:text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit</span>
          </button>

          {/* Creator Studio link (Only available for Platform OWNER accounts) */}
          {currentUser?.role === "OWNER" && (
            <Link
              href="/studio/links"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-xs font-mono text-purple-300 hover:text-white transition-all cursor-pointer"
              title="Switch to Creator Studio"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Creator Studio</span>
            </Link>
          )}

          {/* Admin / Owner Profile Pill */}
          <div className="flex items-center space-x-2 pl-2 pr-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-white/10 shrink-0 flex items-center justify-center">
              {currentUser?.profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.profile.avatarUrl}
                  alt={currentUser.name || "Administrator"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold text-zinc-300 font-mono">
                  {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || "A"}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-white leading-tight">
                {currentUser?.name || (currentUser?.profile?.username ? `@${currentUser.profile.username}` : "@admin")}
              </span>
              <span
                className={`text-[9px] uppercase font-mono font-bold tracking-wider ${
                  currentUser?.role === "OWNER"
                    ? "text-amber-400"
                    : "text-purple-400"
                }`}
              >
                {currentUser?.role === "OWNER" ? "Platform Owner" : "Super Admin"}
              </span>
            </div>
          </div>

          {/* Log Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer"
            title="Log out or switch account"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-8 flex-1 space-y-8">
        {/* Section 1: Command Header & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/5 gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 mb-1">
              <span>sentinel-core</span>
              <span>/</span>
              <span>in-memory-tensor</span>
              <span>/</span>
              <span className="text-zinc-200">threat-feed</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Real-Time Threat Moderation Studio
            </h1>
          </div>

          {/* Tab Selector */}
          <nav
            aria-label="Moderation views"
            className="flex items-center flex-wrap gap-1 bg-[#121215] p-1 rounded-xl border border-white/10 text-xs font-medium"
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-white text-black font-semibold shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Telemetry Bento Grid */}
        <TelemetryBentoGrid
          totalThreats={threats.length}
          criticalCount={criticalThreatsCount}
          latencySlaMs={telemetry?.latencySlaMs || 18.4}
          activeBlocklistsCount={blocklist.length}
        />

        {/* Section 3: Active Tab Content */}
        {activeTab === "threats" && (
          <section aria-label="Threat Moderation Queue">
            <ThreatQueueTable threats={threats} onRefresh={loadData} />
          </section>
        )}

        {activeTab === "users" && (
          <section aria-label="Platform User Directory & Threat Governance">
            <UserDirectoryTable
              users={users}
              currentUser={currentUser}
              onRefresh={loadData}
            />
          </section>
        )}

        {activeTab === "sandbox" && (
          <section aria-label="Sentinel AI Sandbox">
            <LiveUrlSandbox />
          </section>
        )}

        {activeTab === "domains" && (
          <section aria-label="Domain Blocklist Registry">
            <DomainBlocklistManager
              blocklist={blocklist}
              onRefresh={loadData}
            />
          </section>
        )}

        {activeTab === "audit" && (
          <section aria-label="Immutable Audit Logs">
            <AuditLogsViewer logs={auditLogs} />
          </section>
        )}

        {/* Tactical Footer */}
        <footer className="pt-6 pb-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-500 gap-2">
          <div>
            Sentinel Core Engine • Zero-Token On-Device Machine Learning
          </div>
          <div>
            {lastUpdated ? `Telemetry synced at ${lastUpdated.toLocaleTimeString()}` : "Syncing telemetry..."}
          </div>
        </footer>
      </main>
    </div>
  );
}
