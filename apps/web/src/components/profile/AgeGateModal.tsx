"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, X } from "lucide-react";

interface AgeGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkTitle: string;
  onConfirm: () => void;
}

export function AgeGateModal({
  isOpen,
  onClose,
  linkTitle,
  onConfirm,
}: AgeGateModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
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

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold mb-2">
            <AlertTriangle className="w-3 h-3" />
            Age Restriction (18+)
          </div>

          <h3
            id="age-gate-title"
            className="text-base font-semibold text-white tracking-tight"
          >
            Verification Required
          </h3>

          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            The link <span className="text-zinc-200 font-medium">&ldquo;{linkTitle}&rdquo;</span> contains age-restricted or adult content (18+).
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            By proceeding, you certify under your own responsibility that you are at least 18 years of age.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs tracking-wide shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all cursor-pointer active:scale-98"
          >
            I am 18 or older — Continue
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 text-xs font-medium transition-all cursor-pointer"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    </div>
  );
}
