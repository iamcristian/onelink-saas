"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, X, AlertCircle } from "lucide-react";
import { apiUnlockLink } from "@/lib/api-client";

interface ProtectedLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: string;
  linkTitle: string;
  onSuccess: (url: string) => void;
}

export function ProtectedLinkModal({
  isOpen,
  onClose,
  linkId,
  linkTitle,
  onSuccess,
}: ProtectedLinkModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the PIN or access password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiUnlockLink(linkId, password);
      if (res.success && res.url) {
        onSuccess(res.url);
        onClose();
      } else {
        setError("Incorrect PIN. Please check the passcode and try again.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error unlocking protected link.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="protected-link-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-[#121215] border border-white/10 p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock Icon */}
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold mb-2">
            Protected Content
          </div>

          <h3
            id="protected-link-title"
            className="text-base font-semibold text-white tracking-tight"
          >
            PIN-Protected Link
          </h3>

          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            To view <span className="text-zinc-200 font-medium">&ldquo;{linkTitle}&rdquo;</span>, enter the PIN code assigned by the creator.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter PIN code or password"
              autoFocus
              className={`w-full px-4 py-2.5 rounded-xl bg-zinc-900 border text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-all pr-10 ${
                error
                  ? "border-rose-500 focus:ring-rose-500/30"
                  : "border-white/10 focus:border-purple-500 focus:ring-purple-500/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs tracking-wide shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Unlock Destination"
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
