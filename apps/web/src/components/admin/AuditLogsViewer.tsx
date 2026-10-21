"use client";

import React from "react";
import { History } from "lucide-react";
import { AdminAuditLogItem } from "@/lib/api-client";

interface AuditLogsViewerProps {
  logs: AdminAuditLogItem[];
}

export function AuditLogsViewer({ logs }: AuditLogsViewerProps) {
  const getActionBadge = (action: string) => {
    if (action.includes("SUSPEND")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (action.includes("BLOCKLIST")) {
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    }
    if (action.includes("BENIGN") || action.includes("REINSTATE")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    return "bg-white/5 text-zinc-300 border-white/5";
  };

  return (
    <div className="bg-[#121215] border border-white/5 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold text-white">
              Immutable Trust & Safety Audit Ledger
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cryptographically timestamped audit trail of all manual and automated moderation interventions
          </p>
        </div>

        <History className="w-4 h-4 text-zinc-500" />
      </div>

      <div className="border border-white/5 rounded-xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {logs && logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 sm:px-4 hover:bg-white/1.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs text-zinc-300 font-medium truncate">
                      {log.reason}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-x-3 text-[11px] text-zinc-500 font-mono">
                    <span>
                      Operator: {log.adminUser?.name || log.adminUser?.email || "System Daemon"}
                    </span>
                    <span>Target: {log.targetType}</span>
                    {log.targetId && (
                      <span className="truncate max-w-xs text-zinc-600">
                        ID: {log.targetId}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 font-mono shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              No audit records logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
