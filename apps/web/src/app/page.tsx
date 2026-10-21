"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  BarChart3,
  Sliders,
  CheckCircle2,
  Clock,
  Coins,
  Lock,
  ShieldAlert,
  FileSpreadsheet,
  Users,
  EyeOff,
  Palette,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiCheckUsername } from "@/lib/api-client";

export default function Home() {
  const [claimSlug, setClaimSlug] = useState("");
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ available: boolean; reason?: string } | null>(null);
  const [pricingInterval, setPricingInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  // Check username availability in real time
  useEffect(() => {
    const clean = claimSlug.replace(/^@/, "").toLowerCase().trim();
    if (clean.length < 3) {
      setSlugStatus(null);
      return;
    }

    let active = true;
    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiCheckUsername(clean);
        if (active) setSlugStatus(res);
      } catch {
        if (active) setSlugStatus(null);
      } finally {
        if (active) setCheckingSlug(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [claimSlug]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-between selection:bg-white/20 selection:text-white font-sans">
      {/* Navigation Bar */}
      <nav className="w-full border-b border-white/5 backdrop-blur-md bg-[#09090b]/85 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-950 font-bold text-lg group-hover:scale-105 transition-transform">
              1
            </div>
            <span className="font-bold text-lg tracking-tight text-white">OneLink</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-zinc-400">
            <Link href="#features" className="hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#preview" className="hover:text-white transition-colors">
              Product Tour
            </Link>
            <Link href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 tactile-press transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-14 sm:py-20 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 mb-8 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
          <span>Next-Gen Creator Architecture &amp; ML Threat Defense</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.08]">
          One Link for <br className="hidden sm:inline" />
          <span className="bg-linear-to-r from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            Everything You Create.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mb-8 leading-relaxed font-normal">
          Consolidate your content, digital drops, tips, and socials into a single,
          blazing-fast profile page. Protected in real time by in-process Sentinel AI.
        </p>

        {/* Claim Vanity Slug Input & Direct CTA */}
        <div className="w-full max-w-lg flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl shadow-black/60 mb-4">
          <div className="flex items-center gap-1.5 px-4 py-2.5 w-full text-sm text-zinc-400 font-mono">
            <span className="text-zinc-500 font-mono">onelink.bio/</span>
            <input
              type="text"
              value={claimSlug}
              onChange={(e) => setClaimSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="yourname"
              className="w-full bg-transparent text-white focus:outline-none placeholder:text-zinc-600 font-mono"
            />
            {checkingSlug && (
              <span className="text-[10px] text-zinc-400 flex items-center gap-1 shrink-0 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" />
              </span>
            )}
            {!checkingSlug && slugStatus && (
              <span className={`text-[10px] flex items-center gap-1 shrink-0 font-mono font-medium ${
                slugStatus.available ? "text-emerald-400" : "text-amber-400"
              }`}>
                {slugStatus.available ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Available
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Taken
                  </>
                )}
              </span>
            )}
          </div>
          <Link
            href={`/register?username=${encodeURIComponent(claimSlug.replace(/^@/, "").trim())}`}
            className="w-full sm:w-auto whitespace-nowrap px-6 py-3 rounded-xl bg-white text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 tactile-press transition-all cursor-pointer shadow-md"
          >
            <span>Claim Handle</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 1-Click Google OAuth & Instant Sign-up Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 text-xs">
          <a
            href="/api/auth/google"
            className="px-4 py-2.5 rounded-xl border border-white/10 bg-zinc-900/90 hover:bg-zinc-800 text-white font-medium flex items-center gap-2.5 transition-all shadow-sm active:scale-95 group"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="group-hover:text-white transition-colors">Sign up with Google</span>
          </a>

          <div className="px-4 py-2 rounded-xl border border-white/5 bg-zinc-950 text-zinc-500 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Zero setup fees • Cancel anytime</span>
          </div>
        </div>

        {/* Feature Pills Strip */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs text-zinc-500 mb-16">
          <span>✓ Sub-15ms Redis Cache</span>
          <span>✓ 0% Commission Direct Tips</span>
          <span>✓ 97.6% Phishing ML Defense</span>
          <span>✓ Scheduled &amp; PIN Links</span>
        </div>

        {/* Product Preview Showcase (Screenshot / Studio Mockup) */}
        <section id="preview" className="w-full mb-20 scroll-mt-20">
          <div className="relative rounded-2xl sm:rounded-3xl bg-zinc-950/80 border border-white/10 p-2 sm:p-4 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden group">
            {/* Window titlebar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 mb-3 text-xs font-mono text-zinc-500">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[11px] text-zinc-400 font-mono">
                onelink.bio/studio
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Studio Sync</span>
              </div>
            </div>

            {/* Split Mockup: Studio Builder (Left) + Phone Preview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-2 sm:p-4 text-left items-center">
              {/* Studio Builder Mockup */}
              <div className="lg:col-span-7 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white text-black font-bold uppercase">
                      Studio Builder
                    </span>
                    <span className="text-xs font-mono text-zinc-400">Drag &amp; Drop Link Architecture</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">4 Active Items</span>
                </div>

                {/* Simulated Link 1 */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 text-sm">
                      ▶
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white">System Design Masterclass (10M req/sec)</div>
                      <div className="text-[11px] font-mono text-zinc-500 truncate">youtube.com/watch?v=sysarch</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      1,420 clicks
                    </span>
                    <span className="w-8 h-4 rounded-full bg-emerald-500 flex items-center justify-end px-0.5">
                      <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                    </span>
                  </div>
                </div>

                {/* Simulated Tip Block */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      ☕
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-200">Buy Me a Coffee (Tip Block)</div>
                      <div className="text-[11px] font-mono text-amber-300/70">0% OneLink Fee • Instant Creator Payout</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full font-bold">
                    Direct Payout
                  </span>
                </div>

                {/* Simulated Section Header */}
                <div className="py-1 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                    ── Tech Resources &amp; Guides ──
                  </span>
                </div>

                {/* Simulated Link 2 */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                      📖
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white">Full Microservices &amp; Redis Guide</div>
                      <div className="text-[11px] font-mono text-zinc-500 truncate">gumroad.com/l/sysdesign</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      3,890 clicks
                    </span>
                    <span className="w-8 h-4 rounded-full bg-emerald-500 flex items-center justify-end px-0.5">
                      <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone Preview Mockup */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-72 sm:w-80 rounded-[44px] bg-black p-3 shadow-2xl ring-1 ring-white/10 border-4 border-zinc-800/80">
                  <div className="w-full bg-[#0e0e10] rounded-[36px] p-4 flex flex-col items-center text-center space-y-3 border border-white/5">
                    {/* Dynamic Island */}
                    <div className="w-20 h-4 rounded-full bg-black mx-auto mb-1 flex items-center justify-end px-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    {/* Avatar & Info */}
                    <div className="w-16 h-16 rounded-full ring-2 ring-white/30 overflow-hidden bg-zinc-800">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                        alt="Creator Portrait"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1">
                        <span>Alex Rivera</span>
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-400">@alexrivera</p>
                      <p className="text-[11px] text-zinc-400 mt-1 max-w-56 leading-snug">
                        Scaling distributed systems &amp; high-throughput developer tools.
                      </p>
                    </div>

                    {/* Preview Buttons */}
                    <div className="w-full space-y-2 pt-1">
                      <div className="w-full py-2.5 px-3 rounded-full bg-zinc-900 border border-white/10 text-xs text-white font-medium flex items-center justify-between">
                        <span>▶ System Design Masterclass</span>
                        <span className="text-zinc-500 text-[10px]">→</span>
                      </div>
                      <div className="w-full py-2.5 px-3 rounded-full bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 font-semibold flex items-center justify-between">
                        <span>☕ Buy Me a Coffee</span>
                        <span className="text-amber-400 text-[10px] font-bold">Tip</span>
                      </div>
                      <div className="py-0.5 text-center">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">
                          Tech Resources
                        </span>
                      </div>
                      <div className="w-full border-t border-white/10" />
                      <div className="w-full py-2.5 px-3 rounded-full bg-zinc-900 border border-white/10 text-xs text-white font-medium flex items-center justify-between">
                        <span>📖 Microservices Guide</span>
                        <span className="text-zinc-500 text-[10px]">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section id="features" className="w-full text-left mb-20 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-mono mb-3">
              Built for Scale &amp; Trust
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Every Superpower a Modern Creator Needs
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              From zero-commission monetization to neural AI threat defense, built on production-grade infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between h-48">
              <div>
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-200 mb-3 border border-white/5">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-semibold text-sm text-white mb-1">
                  Sub-15ms Edge Cache
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Redis cache-aside with TimescaleDB ensures lightning-fast delivery for viral spikes.
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Redis 7 In-Memory Engine</span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between h-48">
              <div>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 border border-purple-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-white mb-1">
                  Sentinel AI Defense
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  In-process ONNX neural classifier trained on 235k threats screens malicious links before publication.
                </p>
              </div>
              <span className="text-[11px] font-mono text-purple-400">97.6% Threat Block Rate</span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between h-48">
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 border border-emerald-500/20">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-white mb-1">
                  0% Commission Tips
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Accept fan donations and coffee tips directly to Stripe with zero platform commission deductions.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">Direct Creator Payouts</span>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between h-48">
              <div>
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-200 mb-3 border border-white/5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-sm text-white mb-1">
                  Custom Design Engine
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tailored geometries, high-contrast dark modes, Google fonts, and responsive CSS variables.
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Live Studio Synchronizer</span>
            </div>
          </div>
        </section>

        {/* Pricing & Subscription Matrix Section */}
        <section id="pricing" className="w-full text-left mb-20 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/5 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                Transparent Pricing
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Simple Plans. Unmatched Value.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Zero commissions on tips, professional link security, and enterprise grade telemetry.
              </p>
            </div>

            {/* Billing Interval Toggle */}
            <div className="p-1 bg-[#121215] border border-white/10 rounded-full flex items-center text-xs font-mono self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPricingInterval("MONTHLY")}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  pricingInterval === "MONTHLY"
                    ? "bg-white text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPricingInterval("YEARLY")}
                className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                  pricingInterval === "YEARLY"
                    ? "bg-white text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Annual</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  Save 16%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan 1: Free Plan */}
            <div className="bg-[#121215] rounded-2xl p-6 flex flex-col justify-between border border-white/10 shadow-xl">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Getting Started
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">Free Plan</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-white/10">
                    $0 / mo
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono text-white">$0</span>
                  <span className="text-xs text-zinc-400">/ month forever</span>
                </div>

                <ul className="space-y-3 pt-3 text-xs text-zinc-300 border-t border-white/5">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 5 active links in your bio</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Standard minimalist themes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Basic 7-day telemetry window</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Standard Sentinel AI inspection</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-white/5">
                <Link
                  href="/register"
                  className="w-full py-2.5 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-all"
                >
                  Create Free Account
                </Link>
              </div>
            </div>

            {/* Plan 2: Creator Pro (Featured) */}
            <div className="relative bg-linear-to-b from-[#18181f] to-[#121215] rounded-2xl p-6 flex flex-col justify-between border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-mono font-bold tracking-wider uppercase shadow-md">
                Recommended for Creators
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                      Growth &amp; Monetization
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">Creator Pro</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Popular
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono text-white">
                    {pricingInterval === "MONTHLY" ? "$2.00" : "$1.67"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {pricingInterval === "MONTHLY" ? "/ month" : "/ month ($20 billed yearly)"}
                  </span>
                </div>

                <ul className="space-y-3 pt-3 text-xs text-zinc-200 border-t border-white/5">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Unlimited links &amp; blocks</strong> in your bio</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Link Scheduling &amp; Timed Drops:</strong> Auto-publish/expire at exact times</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Direct Monetization (0% Fee):</strong> Dedicated tip / coffee blocks</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>90-Day Advanced Telemetry:</strong> Referrers, countries, and UTM tags</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>No Watermark:</strong> Complete OneLink brand badge removal</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Palette className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Advanced Theme Engine:</strong> Dynamic styles and CSS injection</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-white/5">
                <Link
                  href="/studio/billing"
                  className="w-full py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all shadow-md active:scale-98"
                >
                  Upgrade to Creator Pro ({pricingInterval === "MONTHLY" ? "$2/mo" : "$20/yr"})
                </Link>
              </div>
            </div>

            {/* Plan 3: Enterprise Studio */}
            <div className="bg-[#121215] rounded-2xl p-6 flex flex-col justify-between border border-white/10 shadow-xl">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Agencies &amp; Brands
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">Enterprise Studio</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    VIP &amp; Teams
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono text-white">
                    {pricingInterval === "MONTHLY" ? "$5.00" : "$4.17"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {pricingInterval === "MONTHLY" ? "/ month" : "/ month ($50 billed yearly)"}
                  </span>
                </div>

                <ul className="space-y-3 pt-3 text-xs text-zinc-300 border-t border-white/5">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Everything in Creator Pro included</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>PIN &amp; Password-Protected Links:</strong> VIP gated access</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Age Verification Gate (18+):</strong> Verification for adult/gaming</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>Executive CSV Export:</strong> Instant client and sponsor reports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-purple-400 shrink-0" />
                    <span><strong>5 Collaborative Team Seats</strong> with RBAC</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-white/5">
                <Link
                  href="/studio/billing"
                  className="w-full py-2.5 rounded-full text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all shadow-md active:scale-98"
                >
                  Get Enterprise Studio ({pricingInterval === "MONTHLY" ? "$5/mo" : "$50/yr"})
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Key Architectural Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-200 mb-4 border border-white/5">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white mb-1.5">
              Sub-50ms Hot Path
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Edge ISR and Redis Cache-Aside ensure your visitors never wait for profiles to render.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-200 mb-4 border border-white/5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white mb-1.5">
              Sentinel AI Defense
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              In-process ONNX neural classifier trained on 235k real threats. Intercepts drainers &amp; homoglyphs.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-200 mb-4 border border-white/5">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white mb-1.5">
              TimescaleDB Analytics
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Real-time click telemetry via lightweight Beacon API and continuous hypertables.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Directory */}
      <footer className="w-full border-t border-white/5 py-10 px-6 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-zinc-950 font-bold text-xs">
              1
            </div>
            <span>© 2026 OneLink Platform. Built with Next.js 16 &amp; NestJS 12.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="#preview" className="hover:text-zinc-300 transition-colors">
              Product Tour
            </Link>
            <Link href="#features" className="hover:text-zinc-300 transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-zinc-300 transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="text-zinc-300 hover:text-white font-medium transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
