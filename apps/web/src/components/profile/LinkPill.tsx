"use client";

import React, { useState } from "react";
import { ChevronRight, Lock, ShieldAlert, Coffee, StickyNote, Copy, Check } from "lucide-react";
import { ProtectedLinkModal } from "./ProtectedLinkModal";
import { AgeGateModal } from "./AgeGateModal";
import { renderLinkIcon } from "@/components/studio/IconHelper";
import { getApiBaseUrl } from "@/lib/api-config";

interface LinkPillProps {
  id: string;
  title: string;
  url: string | null;
  type: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
  thumbnailUrl: string | null;
  profileId: string;
  badge?: string | null;
  btnStyle?: string;
  btnColor?: string;
  btnTextColor?: string;
  btnRadius?: number;
  isPasswordProtected?: boolean;
  isAgeRestricted?: boolean;
}

export function LinkPill({
  id,
  title,
  url,
  type,
  thumbnailUrl,
  profileId,
  badge,
  btnStyle = "FILLED",
  btnColor = "#27272a",
  btnTextColor = "#ffffff",
  btnRadius = 9999,
  isPasswordProtected = false,
  isAgeRestricted = false,
}: LinkPillProps) {
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // 1. Divider type
  if (type === "DIVIDER") {
    return (
      <div className="w-full flex items-center justify-center my-4">
        <div className="w-full border-t border-white/10" />
      </div>
    );
  }

  // 2. Section Header type
  if (type === "HEADER") {
    return (
      <div className="w-full text-center mt-5 mb-2">
        <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
          {title}
        </span>
      </div>
    );
  }

  // Telemetry helper: Beacon API
  const sendClickTelemetry = () => {
    if (typeof window !== "undefined" && navigator.sendBeacon) {
      try {
        const apiUrl = getApiBaseUrl();
        const payload = JSON.stringify({
          linkId: id,
          profileId,
          referrer: document.referrer || undefined,
        });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${apiUrl}/api/track/click`, blob);
      } catch {
        // Fire-and-forget telemetry should never block navigation
      }
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check 18+ gate
    if (isAgeRestricted) {
      const isVerified =
        typeof window !== "undefined" &&
        sessionStorage.getItem("onelink_age_verified") === "true";
      if (!isVerified) {
        e.preventDefault();
        setShowAgeGate(true);
        return;
      }
    }

    // Check PIN / Password protection
    if (isPasswordProtected) {
      e.preventDefault();
      setShowPasswordModal(true);
      return;
    }

    // Direct link click
    sendClickTelemetry();
  };

  const handleAgeConfirmed = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("onelink_age_verified", "true");
    }
    setShowAgeGate(false);

    if (isPasswordProtected) {
      setShowPasswordModal(true);
    } else {
      sendClickTelemetry();
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleUnlockSuccess = (unlockedUrl: string) => {
    sendClickTelemetry();
    window.open(unlockedUrl, "_blank", "noopener,noreferrer");
  };

  // Dynamic styling based on creator's theme
  const getDynamicStyles = (): React.CSSProperties => {
    const baseRadius = `${btnRadius}px`;

    switch (btnStyle) {
      case "OUTLINE":
        return {
          backgroundColor: "transparent",
          borderColor: btnColor,
          color: btnColor,
          borderWidth: "1.5px",
          borderStyle: "solid",
          borderRadius: baseRadius,
        };
      case "SHADOW":
        return {
          backgroundColor: btnColor,
          color: btnTextColor,
          borderRadius: baseRadius,
          border: "2px solid #000000",
          boxShadow: "4px 4px 0px #000000",
        };
      case "ROUNDED":
      case "FILLED":
      default:
        return {
          backgroundColor: btnColor,
          color: btnTextColor,
          borderRadius: baseRadius,
          border: "1px solid rgba(255, 255, 255, 0.08)",
        };
    }
  };

  const destination = isPasswordProtected ? "#" : url || "#";

  // 3. Donation / Tip Block
  if (type === "DONATION") {
    return (
      <>
        <a
          href={destination}
          target={isPasswordProtected ? undefined : "_blank"}
          rel="noopener noreferrer"
          onClick={handleLinkClick}
          className="group relative flex items-center justify-between w-full min-h-14 px-4 py-3 rounded-2xl bg-linear-to-r from-amber-500/15 via-amber-600/10 to-amber-500/15 border border-amber-500/40 hover:border-amber-400 text-left transition-all duration-150 tactile-press shadow-lg shadow-amber-950/20"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <Coffee className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm md:text-base font-semibold text-amber-100 truncate">
                  {title}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Tip
                </span>
              </div>
              <p className="text-[11px] text-amber-300/70 truncate">
                Support creator directly (0% platform fee)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPasswordProtected && (
              <span className="p-1 rounded-full bg-purple-500/20 text-purple-300" title="PIN Required">
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}
            {isAgeRestricted && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold" title="18+ Only">
                18+
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-xs">
              Tip ☕
            </span>
          </div>
        </a>

        {/* Modals for Gated Content */}
        <AgeGateModal
          isOpen={showAgeGate}
          onClose={() => setShowAgeGate(false)}
          linkTitle={title}
          onConfirm={handleAgeConfirmed}
        />

        <ProtectedLinkModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          linkId={id}
          linkTitle={title}
          onSuccess={handleUnlockSuccess}
        />
      </>
    );
  }

  // 4. Note / Announcement Block
  if (type === "NOTE") {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            sendClickTelemetry();
            setShowNoteModal(true);
          }}
          className="group relative flex items-center justify-between w-full min-h-14 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 text-left transition-all duration-150 tactile-press shadow-md cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <StickyNote className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-sm md:text-base font-semibold text-amber-100 truncate block">
                {title}
              </span>
              <p className="text-[11px] text-amber-300/70 truncate">
                Tap to read creator note
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-bold transition-all shadow-xs">
              📝 Note
            </span>
          </div>
        </button>

        {showNoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-tight">
                      {title}
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Creator Note
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setCopiedNote(false);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Note Content */}
              <div className="max-h-60 overflow-y-auto p-4 rounded-xl bg-black/50 border border-white/5 font-sans text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                {url || "(Empty note content)"}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-zinc-500">
                  {(url || "").split(/\s+/).filter(Boolean).length} words
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (url) {
                        navigator.clipboard.writeText(url);
                        setCopiedNote(true);
                        setTimeout(() => setCopiedNote(false), 2000);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center space-x-1.5 transition-all"
                  >
                    {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNote ? "Copied!" : "Copy Note"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteModal(false);
                      setCopiedNote(false);
                    }}
                    className="px-4 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 5. Standard Link with Security & Age Indicators
  return (
    <>
      <a
        href={destination}
        target={isPasswordProtected ? undefined : "_blank"}
        rel="noopener noreferrer"
        onClick={handleLinkClick}
        style={getDynamicStyles()}
        className="group relative flex items-center justify-between w-full min-h-14 px-4 py-3 tactile-press shadow-md shadow-black/20 hover:opacity-95 transition-all duration-150"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          {thumbnailUrl && !thumbnailUrl.startsWith("icon:") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumbnailUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-current opacity-80 shrink-0">
              {renderLinkIcon(thumbnailUrl, url, "w-4 h-4")}
            </div>
          )}
          <span className="text-sm md:text-base font-medium truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/15 border border-white/20 shrink-0">
              {badge}
            </span>
          )}
          {isPasswordProtected && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[11px] font-medium"
              title="Protected with PIN"
            >
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">PIN</span>
            </span>
          )}

          {isAgeRestricted && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px] font-bold"
              title="18+ Content"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>18+</span>
            </span>
          )}

          <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>
      </a>

      {/* Modals for Gated Content */}
      <AgeGateModal
        isOpen={showAgeGate}
        onClose={() => setShowAgeGate(false)}
        linkTitle={title}
        onConfirm={handleAgeConfirmed}
      />

      <ProtectedLinkModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        linkId={id}
        linkTitle={title}
        onSuccess={handleUnlockSuccess}
      />
    </>
  );
}
