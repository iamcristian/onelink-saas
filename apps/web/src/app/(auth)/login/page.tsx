"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, Sparkles, AlertCircle } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Invalid email or password.");
      }

      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem("onelink_token", data.accessToken);
      }
      window.location.href = "/studio/links";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="w-full max-w-md bg-zinc-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-3 group cursor-pointer" title="OneLink Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt="OneLink"
            className="w-9 h-9 rounded-xl group-hover:scale-105 transition-transform"
          />
          <span className="font-bold text-xl tracking-tight text-white">OneLink</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Welcome to Studio
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Sign in to customize your links, themes, and real-time analytics
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <a
        href="/api/auth/google"
        className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all mb-4 active:scale-98 shadow-sm group"
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
        <span className="group-hover:text-white transition-colors">Continue with Google</span>
      </a>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-[11px] font-mono uppercase text-zinc-500">or with email</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@onelink.bio"
              required
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all tactile-press disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <span>{loading ? "Authenticating..." : "Sign In to Studio"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Demo Credentials Quick-Fill (Click to populate) */}
      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider text-center">
          Demo Test Accounts (Click to Fill)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail("alex@onelink.bio");
              setPassword("Password123!");
            }}
            className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-zinc-500 text-left transition-colors cursor-pointer group"
          >
            <span className="block text-xs font-semibold text-zinc-300 group-hover:text-white">Alex Rivera</span>
            <span className="block text-[10px] text-zinc-500 font-mono truncate">alex@onelink.bio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail("admin@onelink.bio");
              setPassword("AdminPassword123!");
            }}
            className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 hover:border-zinc-500 text-left transition-colors cursor-pointer group"
          >
            <span className="block text-xs font-semibold text-zinc-300 group-hover:text-white">Super Admin</span>
            <span className="block text-[10px] text-zinc-500 font-mono truncate">admin@onelink.bio</span>
          </button>
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-white hover:underline font-medium">
            Claim your link
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md bg-zinc-900/80 border border-white/10 rounded-2xl p-8 text-center text-zinc-400 text-xs">
          Loading login...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
