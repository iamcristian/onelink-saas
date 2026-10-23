"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { apiCheckUsername } from "@/lib/api-client";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const initialUsername = searchParams.get("username") || "";

  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);

  // Real-time username check with 300ms debounce
  useEffect(() => {
    const clean = username.replace(/^@/, "").toLowerCase().trim();
    if (clean.length < 3) {
      setUsernameStatus(null);
      return;
    }

    let active = true;
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiCheckUsername(clean);
        if (active) {
          setUsernameStatus(res);
        }
      } catch {
        if (active) setUsernameStatus(null);
      } finally {
        if (active) setCheckingUsername(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanUsername = username.replace(/^@/, "").toLowerCase().trim();

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Registration failed. Try a different username.");
      }

      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem("onelink_token", data.accessToken);
      }
      router.push("/studio/links");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating account.";
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
          Claim Your OneLink
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Reserve your custom vanity slug and launch your bio profile
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-mono uppercase text-zinc-400">
              Vanity Handle
            </label>
            {checkingUsername && (
              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Checking...
              </span>
            )}
            {!checkingUsername && usernameStatus && (
              <span
                className={`text-[10px] font-mono flex items-center gap-1 ${
                  usernameStatus.available ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {usernameStatus.available ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Available
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    {usernameStatus.reason || "Taken"}
                  </>
                )}
              </span>
            )}
          </div>
          <div className={`flex items-center rounded-xl bg-zinc-950 border px-3 py-2 text-xs sm:text-sm transition-all ${
            usernameStatus && !usernameStatus.available
              ? "border-rose-500/50 focus-within:border-rose-500"
              : usernameStatus?.available
                ? "border-emerald-500/50 focus-within:border-emerald-500"
                : "border-white/10 focus-within:border-zinc-400"
          }`}>
            <span className="text-zinc-500 font-mono">onelink.bio/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="yourname"
              required
              className="w-full bg-transparent text-white font-mono pl-0.5 focus:outline-none"
            />
          </div>
        </div>

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
              placeholder="you@domain.com"
              required
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
            Password (min 8 chars)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={8}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all tactile-press disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <span>{loading ? "Reserving Username..." : "Create Free Account"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-xs text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md bg-zinc-900/80 border border-white/10 rounded-2xl p-8 text-center text-zinc-400 text-xs">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
