"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (!token) return;

    try {
      localStorage.setItem("onelink_token", token);
    } catch {
      // localStorage may fail in restricted/incognito frames
    }

    const timer = setTimeout(() => {
      router.replace("/studio/links");
    }, 600);

    return () => clearTimeout(timer);
  }, [token, router]);

  const hasError = Boolean(errorParam || !token);
  const errorMessage = errorParam || "No authorization token received from provider";

  return (
    <div className="w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center">
      {hasError ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full border border-rose-500/30 bg-rose-500/10 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Authentication Failed</h2>
            <p className="text-xs text-rose-400/90 mt-1">{errorMessage}</p>
          </div>
          <Link
            href="/login"
            className="mt-4 px-4 py-2 rounded-xl border border-white/10 bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium transition-all inline-block"
          >
            Return to Login
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-14 h-14 rounded-full bg-blue-500/20 animate-ping opacity-60" />
            <div className="relative w-12 h-12 rounded-full border border-blue-500/30 bg-zinc-950 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Authenticating with Google</h2>
            <p className="text-xs text-zinc-400 mt-1">Verifying your account credentials & syncing profile...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-xs text-zinc-400">Loading authorization...</p>
            </div>
          </div>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
