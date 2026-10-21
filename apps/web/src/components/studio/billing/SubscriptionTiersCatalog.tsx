"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  X,
  Sparkles,
  Clock,
  Coins,
  Lock,
  FileSpreadsheet,
  Webhook,
  ShieldAlert,
  Users,
  Palette,
  EyeOff,
  BarChart3,
} from "lucide-react";
import {
  BillingPlan,
  BillingSubscription,
  apiCreateCheckoutSession,
  apiCreatePortalSession,
} from "@/lib/api-client";

interface SubscriptionTiersCatalogProps {
  plans: BillingPlan[];
  currentSubscription: BillingSubscription | null;
  onSubscriptionUpdated: () => void;
}

export const SubscriptionTiersCatalog: React.FC<SubscriptionTiersCatalogProps> = ({
  plans = [],
  currentSubscription,
  onSubscriptionUpdated,
}) => {
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const planFree = plans.find((p) => p.code === "FREE");
  const planPro = plans.find((p) => p.code === "PRO");
  const planEnt = plans.find((p) => p.code === "ENTERPRISE");

  const proMonthlyCents = planPro?.priceCents ?? 200;
  const proMonthlyPrice = (proMonthlyCents / 100).toFixed(2);
  const proYearlyTotal = ((proMonthlyCents * 10) / 100).toFixed(0);
  const proYearlyPerMonth = ((proMonthlyCents * 10) / 12 / 100).toFixed(2);

  const entMonthlyCents = planEnt?.priceCents ?? 500;
  const entMonthlyPrice = (entMonthlyCents / 100).toFixed(2);
  const entYearlyTotal = ((entMonthlyCents * 10) / 100).toFixed(0);
  const entYearlyPerMonth = ((entMonthlyCents * 10) / 12 / 100).toFixed(2);

  const activePlanCode = currentSubscription?.plan?.code || "FREE";
  const isPaidPlan = activePlanCode === "PRO" || activePlanCode === "ENTERPRISE";

  const handleSelectPlan = async (planCode: string) => {
    if (planCode === activePlanCode) return;

    if (planCode === "FREE") {
      await handleOpenPortal();
      return;
    }

    try {
      setLoadingPlan(planCode);
      setStatusMessage(null);

      const res = await apiCreateCheckoutSession(planCode, interval);

      if (res.simulated) {
        setStatusMessage({
          text: `Plan successfully switched to ${planCode} (Automated Sandbox Mode active).`,
          type: "success",
        });
        onSubscriptionUpdated();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("subscription_updated"));
        }
      } else if (res.url) {
        // Redirect to live Stripe Checkout
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate checkout.";
      setStatusMessage({ text: msg, type: "error" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      setStatusMessage(null);
      const res = await apiCreatePortalSession();
      if (res.simulated) {
        setStatusMessage({
          text: "Stripe Customer Portal opened in Simulation Mode.",
          type: "success",
        });
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open customer portal.";
      setStatusMessage({ text: msg, type: "error" });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <section className="space-y-6 pt-2" id="billing">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <span>Subscription Tiers &amp; Creator Benefits</span>
            {isPaidPlan && (
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Tier: {activePlanCode}
              </span>
            )}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Monetization powers, link scheduling, gated access &amp; automation tools
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Monthly / Annual Toggle */}
          <div className="p-1 bg-[#121215] border border-white/10 rounded-full flex items-center text-xs font-mono">
            <button
              onClick={() => setInterval("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                interval === "MONTHLY"
                  ? "bg-white text-black font-semibold shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval("YEARLY")}
              className={`px-3.5 py-1.5 rounded-full transition-all flex items-center space-x-1.5 cursor-pointer ${
                interval === "YEARLY"
                  ? "bg-white text-black font-semibold shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                17% off
              </span>
            </button>
          </div>

          {/* Customer Portal Button */}
          {isPaidPlan && (
            <button
              onClick={handleOpenPortal}
              disabled={portalLoading}
              className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-white/10 transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
              <span>{portalLoading ? "Opening..." : "Manage Invoices"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white ml-2 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tiers Grid (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier 1: Free Plan */}
        <div
          className={`bg-[#121215] rounded-2xl p-6 flex flex-col justify-between border transition-all shadow-xl shadow-black/40 ${
            activePlanCode === "FREE"
              ? "border-white/30 bg-[#16161a]"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <div className="space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Getting Started
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Free Plan</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-white/10">
                Default Tier
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline space-x-1">
              <span className="text-4xl font-bold font-mono text-white">$0</span>
              <span className="text-xs text-zinc-400">/ month forever</span>
            </div>

            {/* Value Prop Pill */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono flex items-center justify-between">
              <span className="text-zinc-400">Profile Type:</span>
              <span className="text-zinc-200 font-medium">Personal Link in Bio</span>
            </div>

            {/* Limits & Features */}
            <ul className="space-y-3 pt-2 text-xs text-zinc-300 border-t border-white/5">
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Up to <strong>{planFree?.features?.maxLinks ?? 5} active links</strong> in your bio</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Basic telemetry ({planFree?.features?.analyticsRetentionDays ?? 7}-day retention window)</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Standard minimalist theme presets</span>
              </li>
              <li className="flex items-center space-x-2.5 text-zinc-400">
                <Check className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>&quot;Powered by OneLink&quot; watermark badge</span>
              </li>
              <li className="flex items-center space-x-2.5 text-zinc-400">
                <Check className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>Standard tip transaction fee (10%)</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-white/5">
            <button
              onClick={() => handleSelectPlan("FREE")}
              disabled={activePlanCode === "FREE" || loadingPlan !== null}
              className={`w-full py-2.5 rounded-full text-xs font-mono transition-colors text-center ${
                activePlanCode === "FREE"
                  ? "bg-zinc-800 text-zinc-400 border border-white/10 cursor-default"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 cursor-pointer"
              }`}
            >
              {activePlanCode === "FREE" ? "Current Active Plan" : "Downgrade to Free"}
            </button>
          </div>
        </div>

        {/* Tier 2: Creator Pro (Most Popular) */}
        <div
          className={`bg-[#121215] rounded-2xl p-6 flex flex-col justify-between border-2 relative transition-all shadow-2xl shadow-white/5 ${
            activePlanCode === "PRO"
              ? "border-emerald-500/80 bg-[#141816]"
              : "border-white/30 hover:border-white/50"
          }`}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-black text-[10px] font-mono font-bold tracking-wider uppercase shadow-md flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Most Popular / Creators &amp; Streamers</span>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-start mt-2">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Growth &amp; Direct Monetization
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Creator Pro</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Recommended
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline space-x-1">
              <span className="text-4xl font-bold font-mono text-white">
                {interval === "MONTHLY" ? `$${proMonthlyPrice}` : `$${proYearlyPerMonth}`}
              </span>
              <span className="text-xs text-zinc-400">
                {interval === "MONTHLY" ? "/ month" : `/ month ($${proYearlyTotal} billed yearly)`}
              </span>
            </div>

            {/* Value Prop Pill */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono flex items-center justify-between">
              <span className="text-zinc-400">Creator Perk:</span>
              <span className="text-emerald-400 font-medium">
                0% Tip Fees &amp; Custom Themes
              </span>
            </div>

            {/* Limits & Features */}
            <ul className="space-y-3 pt-2 text-xs text-zinc-200 border-t border-white/5">
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Unlimited links &amp; blocks</strong> in your bio</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Link Scheduling &amp; Timed Drops:</strong> Auto-publish or expire at exact timestamps
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Direct Monetization (0% Platform Fee):</strong> Tip / coffee block with zero platform deductions
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>90-Day Advanced Analytics:</strong> Referrers, countries, devices, and UTM tags</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>No Watermark:</strong> Complete removal of the OneLink brand badge</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Palette className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Custom Theme Engine:</strong> Dynamic CSS variables and color styles</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-white/5">
            {activePlanCode === "PRO" && currentSubscription?.currentPeriodEnd && (
              <p className="text-[11px] font-mono text-zinc-400 text-center mb-2.5">
                Renews {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(currentSubscription.currentPeriodEnd))} • Graceful auto-downgrade to Free
              </p>
            )}
            <button
              onClick={() => handleSelectPlan("PRO")}
              disabled={activePlanCode === "PRO" || loadingPlan !== null}
              className={`w-full py-2.5 rounded-full text-xs font-mono transition-all font-semibold cursor-pointer ${
                activePlanCode === "PRO"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                  : "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10 active:scale-[0.98]"
              }`}
            >
              {loadingPlan === "PRO" ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Setting up Secure Checkout...</span>
                </span>
              ) : activePlanCode === "PRO" ? (
                "Current Active Plan"
              ) : (
                `Upgrade to Creator Pro (${interval === "MONTHLY" ? `$${proMonthlyPrice}/mo` : `$${proYearlyTotal}/yr`})`
              )}
            </button>
          </div>
        </div>

        {/* Tier 3: Enterprise Studio */}
        <div
          className={`bg-[#121215] rounded-2xl p-6 flex flex-col justify-between border transition-all shadow-xl shadow-black/40 ${
            activePlanCode === "ENTERPRISE"
              ? "border-emerald-500/80 bg-[#141816]"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <div className="space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Agencies, Brands &amp; Teams
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Enterprise Studio
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-200 border border-white/10">
                Power Tier
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline space-x-1">
              <span className="text-4xl font-bold font-mono text-white">
                {interval === "MONTHLY" ? `$${entMonthlyPrice}` : `$${entYearlyPerMonth}`}
              </span>
              <span className="text-xs text-zinc-400">
                {interval === "MONTHLY" ? "/ month" : `/ month ($${entYearlyTotal} billed yearly)`}
              </span>
            </div>

            {/* Value Prop Pill */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono flex items-center justify-between">
              <span className="text-zinc-400">Scale Perk:</span>
              <span className="text-emerald-400 font-medium">
                {planEnt?.features?.teamSeats ?? 5} Team Seats &amp; VIP Links
              </span>
            </div>

            {/* Limits & Features */}
            <ul className="space-y-3 pt-2 text-xs text-zinc-200 border-t border-white/5">
              <li className="flex items-center space-x-2.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Everything in Creator Pro included</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>PIN &amp; Password-Protected Links:</strong> Gated access for VIP supporters or sponsor portals
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Age Verification Gate (18+):</strong> Modal verification gate for adult, alcohol, or gaming content
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Executive Report Export (CSV &amp; PDF):</strong> Download complete analytics reports for sponsors
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Webhook className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Outgoing Webhooks &amp; Integrations:</strong> Real-time event forwarding to Zapier, Make, and CRMs
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>{planEnt?.features?.teamSeats ?? 5} Multi-User Team Seats:</strong> Shared collaborative workspace with role-based access control
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-white/5">
            {activePlanCode === "ENTERPRISE" && currentSubscription?.currentPeriodEnd && (
              <p className="text-[11px] font-mono text-zinc-400 text-center mb-2.5">
                Renews {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(currentSubscription.currentPeriodEnd))} • Graceful auto-downgrade to Free
              </p>
            )}
            <button
              onClick={() => handleSelectPlan("ENTERPRISE")}
              disabled={activePlanCode === "ENTERPRISE" || loadingPlan !== null}
              className={`w-full py-2.5 rounded-full text-xs font-mono transition-all font-semibold cursor-pointer ${
                activePlanCode === "ENTERPRISE"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 active:scale-[0.98]"
              }`}
            >
              {loadingPlan === "ENTERPRISE" ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Setting up Secure Checkout...</span>
                </span>
              ) : activePlanCode === "ENTERPRISE" ? (
                "Current Active Plan"
              ) : (
                `Upgrade to Enterprise (${interval === "MONTHLY" ? `$${entMonthlyPrice}/mo` : `$${entYearlyTotal}/yr`})`
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
