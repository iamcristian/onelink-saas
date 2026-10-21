"use client";

import React, { useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import {
  DomainBlocklistItem,
  apiAddDomainBlocklist,
  apiRemoveDomainBlocklist,
} from "@/lib/api-client";

interface DomainBlocklistManagerProps {
  blocklist: DomainBlocklistItem[];
  onRefresh: () => void;
}

export function DomainBlocklistManager({
  blocklist,
  onRefresh,
}: DomainBlocklistManagerProps) {
  const [patternInput, setPatternInput] = useState<string>("");
  const [reasonInput, setReasonInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternInput.trim() || !reasonInput.trim()) return;

    setIsSubmitting(true);
    try {
      const ok = await apiAddDomainBlocklist(
        patternInput.trim().toLowerCase(),
        reasonInput.trim()
      );
      if (ok) {
        setPatternInput("");
        setReasonInput("");
        setActionNotice(`Added ${patternInput} to global blocklist`);
        setTimeout(() => setActionNotice(null), 3000);
        onRefresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string, pattern: string) => {
    try {
      const ok = await apiRemoveDomainBlocklist(id);
      if (ok) {
        setActionNotice(`Removed ${pattern} from blocklist`);
        setTimeout(() => setActionNotice(null), 3000);
        onRefresh();
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="bg-[#121215] border border-white/5 rounded-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold text-white">
              Global O(1) Domain Blocklist Registry
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Redis Set Shield
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Synchronized immediately to Redis 7 for sub-millisecond edge rejection during creator link submissions
          </p>
        </div>

        <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          {blocklist.length} Patterns Active
        </span>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Add New Rule Form */}
      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-[#09090b] border border-white/5"
      >
        <div className="sm:col-span-4">
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">
            Domain Pattern
          </label>
          <input
            type="text"
            value={patternInput}
            onChange={(e) => setPatternInput(e.target.value)}
            placeholder="e.g. *.drainer-portal.cc"
            className="w-full bg-[#121215] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-hidden focus:border-white/30"
            required
          />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">
            Reason / Threat Classification
          </label>
          <input
            type="text"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="e.g. Known phishing campaign or crypto drainer template"
            className="w-full bg-[#121215] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-white/30"
            required
          />
        </div>

        <div className="sm:col-span-2 flex items-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 active:scale-98 text-xs font-semibold tracking-wide transition-all disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Rule</span>
          </button>
        </div>
      </form>

      {/* Blocklist Table */}
      <div className="border border-white/5 rounded-xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {blocklist.length > 0 ? (
            blocklist.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:px-4 hover:bg-white/1.5 transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {item.domainPattern}
                    </span>
                    <span className="text-xs text-zinc-300 truncate">
                      {item.reason}
                    </span>
                  </div>
                  {item.addedBy && (
                    <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                      Added by: {item.addedBy.name || item.addedBy.email}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id, item.domainPattern)}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                  title="Remove domain rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              No domain patterns registered in blocklist.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
