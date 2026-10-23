"use client";

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { BillingEvent, fetchBillingEvents } from "@/lib/api-client";

interface InvoicingEventsLedgerProps {
  initialEvents: BillingEvent[];
}

export const InvoicingEventsLedger: React.FC<InvoicingEventsLedgerProps> = ({
  initialEvents,
}) => {
  const [events, setEvents] = useState<BillingEvent[]>(initialEvents);
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await fetchBillingEvents();
      if (updated && updated.length > 0) {
        setEvents(updated);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((evt) => {
    if (filterType === "ALL") return true;
    if (filterType === "PAYMENT") return evt.type.includes("payment");
    if (filterType === "SUBSCRIPTION") return evt.type.includes("subscription");
    if (filterType === "REFUND") return evt.type.includes("refund");
    return true;
  });

  const getStatusBadge = (status: BillingEvent["status"]) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "Active":
        return "bg-white/10 text-white border border-white/20";
      case "Refunded":
        return "bg-zinc-800 text-zinc-400 border border-white/10";
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
  };

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

  const handleExportCSV = () => {
    const headers = ["Event ID", "Type", "Tier", "Handle", "Timestamp", "Status"];
    const rows = filteredEvents.map((e) => [
      escapeCsvCell(e.id),
      escapeCsvCell(e.type),
      escapeCsvCell(e.tier),
      escapeCsvCell(e.handle),
      escapeCsvCell(e.timestamp),
      escapeCsvCell(e.status),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `onelink-billing-events-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="space-y-4 pt-4 pb-12" id="invoices">
      <div className="bg-[#121215] rounded-2xl p-6 border border-white/10 space-y-5 shadow-xl shadow-black/40">
        {/* Header with Live Polling Beacon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Stripe Invoicing & Event Telemetry
            </h2>
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Ingestion Active</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 text-xs font-mono focus:outline-none transition-colors"
            >
              <option value="ALL">Filter: All Events</option>
              <option value="PAYMENT">Invoices / Payments</option>
              <option value="SUBSCRIPTION">Subscriptions</option>
              <option value="REFUND">Refunds</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 text-xs font-mono transition-colors flex items-center space-x-1.5 active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Real-Time Events Feed */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs font-mono text-zinc-400">
                <th className="py-3 px-4 font-medium">Event Identifier</th>
                <th className="py-3 px-4 font-medium">Event Type</th>
                <th className="py-3 px-4 font-medium">Subscription / Tier</th>
                <th className="py-3 px-4 font-medium">Creator Handle</th>
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium text-right">Event Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-white/1.5 transition-colors">
                  <td className="py-3 px-4 text-zinc-500 truncate max-w-37.5">
                    {evt.id}
                  </td>
                  <td className="py-3 px-4 text-white font-medium">
                    <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/5">
                      {evt.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">
                    {evt.tier}
                  </td>
                  <td className="py-3 px-4 text-white font-semibold">
                    {evt.handle}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {evt.timestamp}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono ${getStatusBadge(
                        evt.status
                      )}`}
                    >
                      {evt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
