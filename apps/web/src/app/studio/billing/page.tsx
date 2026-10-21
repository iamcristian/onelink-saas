"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  X,
  Sparkles,
  CreditCard,
  Users,
  Receipt,
  Clock,
  ShieldCheck,
  Building2,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import {
  BillingPlan,
  BillingSubscription,
  BillingInvoice,
  TeamMember,
  fetchBillingPlans,
  fetchMySubscription,
  fetchTeamMembers,
  fetchInvoices,
  apiCreatePortalSession,
  apiConfirmCheckoutSession,
} from "@/lib/api-client";
import { SubscriptionTiersCatalog } from "@/components/studio/billing/SubscriptionTiersCatalog";
import { TeamGovernanceSection } from "@/components/studio/billing/TeamGovernanceSection";

function BillingContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const isCanceled = searchParams.get("canceled") === "true";
  const planParam = searchParams.get("plan");

  const [notification, setNotification] = useState<{
    type: "success" | "canceled";
    message: string;
  } | null>(
    isSuccess
      ? {
          type: "success",
          message: `Payment processed successfully! Your subscription has been updated to ${
            planParam || "the selected plan"
          }. Enjoy your unlocked creator benefits!`,
        }
      : isCanceled
        ? {
            type: "canceled",
            message: "The Stripe checkout session was canceled. No charges were made.",
          }
        : null
  );

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<any | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [maxSeats, setMaxSeats] = useState(5);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [p, s, t, invs] = await Promise.all([
        fetchBillingPlans(),
        fetchMySubscription(),
        fetchTeamMembers(),
        fetchInvoices(),
      ]);

      setPlans(p);
      setInvoices(invs);

      // Check if an active workspace is selected
      const storedWs = typeof window !== "undefined" ? localStorage.getItem("onelink_active_workspace") : null;
      if (storedWs) {
        try {
          const parsedWs = JSON.parse(storedWs);
          if (parsedWs.ownerUserId && parsedWs.ownerUsername) {
            setActiveWorkspace(parsedWs);
            setSubscription({
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
                priceCents: 500,
                interval: "MONTHLY",
                features: {
                  maxLinks: 9999,
                  customDomains: true,
                  removeBranding: true,
                  customThemes: true,
                  analyticsRetentionDays: 365,
                },
              },
            });
            setTeamMembers(t.members);
            setMaxSeats(t.maxSeats);
            return;
          }
        } catch {
          // Ignore
        }
      }

      setActiveWorkspace(null);
      setSubscription(s);
      setTeamMembers(t.members);
      setMaxSeats(t.maxSeats);
    } catch (err) {
      console.error("Failed to load billing view data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const execute = async () => {
      try {
        const sessionId = searchParams.get("session_id");
        if (isSuccess && sessionId) {
          try {
            await apiConfirmCheckoutSession(sessionId);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("subscription_updated"));
            }
          } catch (e) {
            console.warn("Session auto-confirmation notice:", e);
          }
        }

        if (active) {
          await loadData();
        }
      } catch (err) {
        console.error("Failed to load billing view data:", err);
      }
    };

    void execute();

    const handleWorkspaceChanged = () => {
      loadData();
    };
    window.addEventListener("workspace_changed", handleWorkspaceChanged);
    window.addEventListener("subscription_updated", handleWorkspaceChanged);

    return () => {
      active = false;
      window.removeEventListener("workspace_changed", handleWorkspaceChanged);
      window.removeEventListener("subscription_updated", handleWorkspaceChanged);
    };
  }, [isSuccess, searchParams, loadData]);

  const handleOpenCustomerPortal = async () => {
    try {
      setPortalLoading(true);
      setPortalError(null);
      const res = await apiCreatePortalSession();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open Stripe billing portal.";
      setPortalError(msg);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDownloadReceipt = (inv: BillingInvoice) => {
    if (inv.pdfUrl) {
      window.open(inv.pdfUrl, "_blank");
      return;
    }

    // Generate printable receipt window for instant PDF export
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${inv.number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111; max-width: 600px; margin: 0 auto; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .badge { display: inline-block; background: #e6fcf5; color: #0ca678; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
          .details { margin-bottom: 24px; font-size: 13px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
          th { text-align: left; border-bottom: 1px solid #ddd; padding: 8px 0; font-size: 12px; text-transform: uppercase; color: #777; }
          td { padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 16px; }
          .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          @media print { .no-print { display: none; } }
          .btn-print { background: #000; color: #fff; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right;">
          <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
        </div>
        <div class="header">
          <div>
            <div class="logo">OneLink.bio</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">OneLink Global Technologies Inc.</div>
            <div style="font-size: 12px; color: #666;">VAT / Tax ID: US-928341094</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">Paid Tax Invoice</div>
            <div style="font-weight: bold; margin-top: 6px;">${inv.number}</div>
            <div style="font-size: 12px; color: #666;">${new Date(inv.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
        </div>

        <div class="details">
          <strong>Billed To:</strong><br/>
          ${subscription?.userId || "OneLink Creator"}<br/>
          Payment Method: Credit Card / Stripe Checkout (Auto-Renew)
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${inv.planName || subscription?.plan?.name || "OneLink Creator Subscription"} (1 Month)</td>
              <td style="text-align: right; font-weight: 600;">$${(inv.amountCents / 100).toFixed(2)} ${inv.currency}</td>
            </tr>
          </tbody>
        </table>

        <div class="total">
          Total Paid: $${(inv.amountCents / 100).toFixed(2)} ${inv.currency}
        </div>

        <div class="footer">
          Official VAT Tax Invoice &bull; OneLink Bio Technologies Inc. &bull; support@onelink.bio &bull; All rights reserved.
        </div>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(receiptHtml);
      printWin.document.close();
    }
  };

  const activePlanCode = subscription?.plan?.code || "FREE";
  const isPaid = activePlanCode === "PRO" || activePlanCode === "ENTERPRISE";
  const periodEndDate = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const daysRemaining = periodEndDate
    ? Math.max(0, Math.ceil((periodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const proPlan = plans.find((p) => p.code === "PRO");
  const entPlan = plans.find((p) => p.code === "ENTERPRISE");
  const proPriceStr = proPlan ? `$${(proPlan.priceCents / 100).toFixed(2)}` : "$2.00";
  const entPriceStr = entPlan ? `$${(entPlan.priceCents / 100).toFixed(2)}` : "$5.00";

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 selection:bg-white/20">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500 mb-1">
            <span>Studio</span>
            <span>/</span>
            <span className="text-zinc-300">Plans &amp; Subscription</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
            <span>Plans &amp; Billing</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Plan: {activePlanCode === "FREE" ? "Free Tier" : activePlanCode === "PRO" ? "Creator Pro" : "Enterprise Studio"}
            </span>
          </div>

          <Link
            href="/studio/links"
            className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-white/10 transition-colors flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio</span>
          </Link>
        </div>
      </div>

      {/* Workspace Context Switcher Banner */}
      {activeWorkspace && (
        <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-purple-950/60 via-indigo-950/40 to-purple-950/60 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">
                  Workspace Billing: @{activeWorkspace.ownerUsername}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-semibold border border-purple-500/30">
                  {activeWorkspace.role}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                {activeWorkspace.role === "Admin" || activeWorkspace.role === "Owner" || activeWorkspace.role === "Safety Admin"
                  ? "You have administrative authority to manage seats and workspace subscription tier."
                  : "Viewing active enterprise subscription managed by the workspace owner."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("onelink_active_workspace");
              window.dispatchEvent(new CustomEvent("workspace_changed", { detail: null }));
              loadData();
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-semibold border border-white/10 transition-all shrink-0 cursor-pointer active:scale-95"
          >
            Switch to Personal Billing
          </button>
        </div>
      )}

      {/* Checkout Status Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-zinc-400 hover:text-white ml-3 p-1 rounded-lg"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Portal Error Notification */}
      {portalError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{portalError}</span>
          </div>
          <button onClick={() => setPortalError(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-400">
            Loading your subscription plans &amp; benefits...
          </span>
        </div>
      ) : (
        <>
          {/* Section 1: Active Subscription Overview */}
          <div className="bg-[#121215] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl shadow-black/40">
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Status: {subscription?.status || "Active"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {activePlanCode === "FREE" && "Free Creator Plan ($0 / mo)"}
                {activePlanCode === "PRO" && `Creator Pro Subscription (${proPriceStr} / mo)`}
                {activePlanCode === "ENTERPRISE" && `Enterprise Studio Plan (${entPriceStr} / mo)`}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                {activePlanCode === "FREE"
                  ? "You have 5 links enabled, 7-day visitor analytics, and standard theme presets. Upgrade to Creator Pro to unlock 0% tip fees, link scheduling, and custom CSS themes."
                  : activePlanCode === "PRO"
                    ? "You have unlimited dynamic links, 0% platform tip fees, automated link scheduling, 90-day visitor telemetry, and custom theme styling."
                    : "You have all Creator Pro features unlocked, plus 5 team seats, password/age gates, and executive CSV telemetry export."}
              </p>

              {/* Expiration, Renewal & Auto-Downgrade Details */}
              <div className="pt-3 border-t border-white/5 space-y-2">
                {isPaid && periodEndDate ? (
                  <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-zinc-800/80 border border-white/10 text-zinc-200">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Billing Cycle Renews / Expires:{" "}
                        <strong className="text-white">
                          {new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }).format(periodEndDate)}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
                      </span>
                    </div>

                    <div className="w-full text-[11px] text-zinc-400 flex items-center space-x-1.5 pt-0.5">
                      <span className="text-emerald-400 font-bold">✓ Graceful Fallback:</span>
                      <span>
                        If your plan expires or is canceled, your account automatically safely switches to the Free Plan (5 links max). All your links and themes stay saved.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
                    <span>Free Plan: Never expires. Your bio page and 5 active links remain free forever.</span>
                  </div>
                )}
              </div>
            </div>

            {isPaid ? (
              <button
                onClick={handleOpenCustomerPortal}
                disabled={portalLoading}
                className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-mono font-semibold transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-lg shadow-white/10"
              >
                <CreditCard className="w-4 h-4" />
                <span>{portalLoading ? "Connecting to Stripe..." : "Manage Invoices & Cards"}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const el = document.getElementById("billing");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-5 py-2.5 rounded-full bg-emerald-400 text-zinc-950 hover:bg-emerald-300 text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer shadow-lg shadow-emerald-400/10"
              >
                Upgrade to Pro ({proPriceStr}/mo)
              </button>
            )}
          </div>

          {/* Section 2: Subscription Tiers & Pricing Catalog */}
          <SubscriptionTiersCatalog
            plans={plans}
            currentSubscription={subscription}
            onSubscriptionUpdated={loadData}
          />

          {/* Section 3: Team Collaboration */}
          {activePlanCode === "ENTERPRISE" ? (
            <TeamGovernanceSection
              initialMembers={teamMembers}
              maxSeats={maxSeats}
            />
          ) : (
            <div className="bg-[#121215] rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl shadow-black/40">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
                  <Users className="w-4 h-4" />
                  <span>Enterprise Feature</span>
                </div>
                <h3 className="text-lg font-bold text-white">Team Collaboration &amp; Multi-User Governance</h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                  Need to collaborate with brand managers, assistants, or team members? Enterprise Studio ({entPriceStr}/mo) includes 5 user seats with role-based permissions (Admin, Editor, Analyst) to manage links, themes, and analytics.
                </p>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById("billing");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono border border-white/10 font-semibold shrink-0 cursor-pointer transition-colors"
              >
                Unlock with Enterprise ({entPriceStr}/mo)
              </button>
            </div>
          )}

          {/* Section 4: Invoices & Receipts */}
          <div className="bg-[#121215] rounded-2xl p-6 sm:p-8 border border-white/10 shadow-xl shadow-black/40 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Stripe Tax Invoices &amp; Receipts</span>
                </div>
                <h3 className="text-lg font-bold text-white">Billing History &amp; Official Receipts</h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                  {isPaid
                    ? "Official VAT-compliant receipts, tax invoices, and payment history securely processed through Stripe."
                    : "You are currently on the Free Tier ($0/month forever). There are no recurring charges. When you upgrade, your official receipts and downloadable PDF tax invoices will be accessible here via Stripe."}
                </p>
              </div>

              {isPaid && (
                <button
                  onClick={handleOpenCustomerPortal}
                  disabled={portalLoading}
                  className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono border border-white/10 flex items-center space-x-2 shrink-0 cursor-pointer transition-colors shadow-sm"
                  title="Open Stripe Customer Portal to manage cards and subscriptions"
                >
                  <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                  <span>{portalLoading ? "Opening Portal..." : "Manage in Stripe Portal"}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </button>
              )}
            </div>

            {/* Invoices List / Table */}
            {isPaid && invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Billing Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Receipt / Tax Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-200">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span>{inv.number}</span>
                        </td>
                        <td className="py-3 px-3 text-zinc-400">
                          {new Date(inv.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-3 text-zinc-300">
                          {inv.planName || subscription?.plan?.name || "OneLink Subscription"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          ${(inv.amountCents / 100).toFixed(2)} {inv.currency}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-300 uppercase">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDownloadReceipt(inv)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-medium border border-white/10 transition-colors cursor-pointer"
                            title="Download official PDF invoice receipt"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Download PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isPaid ? (
              <div className="py-6 text-center text-xs font-mono text-zinc-400">
                No past invoices generated yet. Your next invoice will appear here automatically upon monthly renewal.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export default function StudioBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-white p-8 flex items-center justify-center text-xs">
          Loading billing portal...
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
