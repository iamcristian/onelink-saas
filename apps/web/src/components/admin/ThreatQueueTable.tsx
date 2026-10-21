"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  Copy,
  Check,
  Ban,
  UserX,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  SecurityThreatItem,
  apiUpdateThreatStatus,
  apiSuspendUser,
  apiAddDomainBlocklist,
} from "@/lib/api-client";

interface ThreatQueueTableProps {
  threats: SecurityThreatItem[];
  onRefresh: () => void;
}

export function ThreatQueueTable({ threats, onRefresh }: ThreatQueueTableProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleCopy = async (url: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleStatusChange = async (
    flagId: string,
    newStatus: string,
    notes: string
  ) => {
    setProcessingId(flagId);
    try {
      const ok = await apiUpdateThreatStatus(flagId, newStatus, notes);
      if (ok) {
        setActionNotice(`Threat status updated to ${newStatus}`);
        setTimeout(() => setActionNotice(null), 3000);
        onRefresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspendUser = async (userId: string, isBanned: boolean) => {
    setProcessingId(userId);
    try {
      const ok = await apiSuspendUser(
        userId,
        isBanned,
        isBanned ? "Account suspended by Super Admin due to high-risk threats" : "Account reinstated"
      );
      if (ok) {
        setActionNotice(isBanned ? "User account suspended & profile links neutralized" : "User reinstated");
        setTimeout(() => setActionNotice(null), 3000);
        onRefresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlocklistDomain = async (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      const domain = `*.${parsed.hostname.replace(/^www\./, "")}`;
      const ok = await apiAddDomainBlocklist(
        domain,
        "Domain banned directly from threat moderation queue"
      );
      if (ok) {
        setActionNotice(`Added ${domain} to global Redis blocklist`);
        setTimeout(() => setActionNotice(null), 3000);
        onRefresh();
      }
    } catch {
      setActionNotice("Could not parse domain from URL");
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Filter threats
  const filteredThreats = threats.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "CRITICAL") return Number(t.riskScore) >= 0.85;
    if (filter === "BLOCKED") return t.status === "BLOCKED_AUTO" || t.status === "BANNED";
    if (filter === "PENDING") return t.status === "PENDING_REVIEW";
    if (filter === "RESOLVED") return t.status === "RESOLVED_BENIGN";
    return true;
  });

  const getThreatBadge = (threatType: string) => {
    switch (threatType) {
      case "CRYPTO_DRAINER":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "PHISHING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "MALWARE":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
    }
  };

  const getRiskScoreBadge = (score: number) => {
    const num = Number(score);
    if (num >= 0.85) {
      return {
        label: `CRITICAL ${(num).toFixed(2)}`,
        className: "bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold",
      };
    }
    if (num >= 0.6) {
      return {
        label: `HIGH ${(num).toFixed(2)}`,
        className: "bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold",
      };
    }
    return {
      label: `MODERATE ${(num).toFixed(2)}`,
      className: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20 font-medium",
    };
  };

  return (
    <div className="bg-[#121215] border border-white/5 rounded-xl overflow-hidden">
      {/* Top Header & Filter Bar */}
      <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-white">
              Real-Time Threat Inspection Queue
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
              {filteredThreats.length} Flagged
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            URLs intercepted during creator link ingestion via in-process ONNX model
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-1 bg-[#09090b] border border-white/5 p-1 rounded-lg text-xs font-mono">
          {["ALL", "CRITICAL", "PENDING", "BLOCKED", "RESOLVED"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md transition-all ${
                filter === f
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {actionNotice}
          </span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Threats List */}
      <div className="divide-y divide-white/5">
        {filteredThreats.length > 0 ? (
          filteredThreats.map((threat) => {
            const riskInfo = getRiskScoreBadge(threat.riskScore);
            const isUserBanned = threat.user?.isBanned;

            return (
              <div
                key={threat.id}
                className="p-5 hover:bg-white/1.5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left Block: Threat Score + Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] border ${riskInfo.className}`}
                    >
                      {riskInfo.label}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] border ${getThreatBadge(
                        threat.threatType
                      )}`}
                    >
                      {threat.threatType}
                    </span>

                    <span className="text-zinc-500 text-[11px]">
                      AI Confidence: {(Number(threat.aiConfidence) * 100).toFixed(1)}%
                    </span>

                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        threat.status === "RESOLVED_BENIGN"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : threat.status === "BANNED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : threat.status === "PENDING_REVIEW"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-white/5 text-zinc-400 border border-white/5"
                      }`}
                    >
                      {threat.status}
                    </span>
                  </div>

                  {/* Submitted URL */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-medium text-white break-all">
                      {threat.submittedUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(threat.submittedUrl)}
                      className="p-1 text-zinc-500 hover:text-white transition-colors shrink-0"
                      title="Copy URL"
                    >
                      {copiedUrl === threat.submittedUrl ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Creator & Forensic Attribution */}
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>
                      User:{" "}
                      <span className="text-zinc-200 font-medium">
                        @{threat.user?.profile?.username || threat.user?.email || "anonymous"}
                      </span>
                      {isUserBanned && (
                        <span className="ml-1 text-[10px] text-rose-400 bg-rose-500/10 px-1 rounded border border-rose-500/20">
                          BANNED
                        </span>
                      )}
                    </span>

                    {threat.ipAddress && (
                      <span className="font-mono text-zinc-500">
                        IP: {threat.ipAddress}
                      </span>
                    )}

                    {threat.resolutionNotes && (
                      <span className="text-zinc-300 font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded">
                        {threat.resolutionNotes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Block: Tactical Action Buttons */}
                <div className="flex items-center flex-wrap gap-2 shrink-0 pt-2 lg:pt-0">
                  {/* Suspend or Reinstate User */}
                  <button
                    type="button"
                    disabled={processingId === threat.user?.id}
                    onClick={() => handleSuspendUser(threat.userId, !isUserBanned)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isUserBanned
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{isUserBanned ? "Reinstate User" : "Suspend User"}</span>
                  </button>

                  {/* Blocklist Domain */}
                  <button
                    type="button"
                    onClick={() => handleBlocklistDomain(threat.submittedUrl)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#09090b] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all"
                    title="Add domain wildcard to global blocklist"
                  >
                    <Ban className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Ban Domain</span>
                  </button>

                  {/* Resolve as benign */}
                  {threat.status !== "RESOLVED_BENIGN" ? (
                    <button
                      type="button"
                      disabled={processingId === threat.id}
                      onClick={() =>
                        handleStatusChange(
                          threat.id,
                          "RESOLVED_BENIGN",
                          "Dismissed as false positive by admin"
                        )
                      }
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dismiss / Allow</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={processingId === threat.id}
                      onClick={() =>
                        handleStatusChange(
                          threat.id,
                          "BLOCKED_AUTO",
                          "Re-flagged threat by admin"
                        )
                      }
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-zinc-400 hover:text-white transition-all"
                    >
                      <span>Re-Flag</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-zinc-500 text-sm">
            <AlertOctagon className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
            <p className="text-zinc-300 font-medium">No threats match current filter.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Sentinel AI continuously scans inbound link submissions in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
