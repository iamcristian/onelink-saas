"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Monitor,
  QrCode,
  ChevronRight,
  Wifi,
  BatteryCharging,
  Signal,
  Coffee,
  Lock,
  StickyNote,
  Copy,
  Check,
} from "lucide-react";
import { StudioLinkItem } from "./LinkCard";
import { renderLinkIcon } from "./IconHelper";

export interface PhonePreviewTheme {
  bgType?: "SOLID" | "GRADIENT" | string;
  bgValue?: string;
  btnStyle?: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED" | string;
  btnColor?: string;
  btnTextColor?: string;
  textColor?: string;
  btnRadius?: number;
  fontFamily?: string;
}

export interface PhonePreviewProps {
  items: StudioLinkItem[];
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  theme?: PhonePreviewTheme | null;
  className?: string;
}

const emptySubscribe = () => () => {};
let cachedClientTime: number | null = null;
const getClientTime = () => {
  if (cachedClientTime === null) {
    cachedClientTime = Date.now();
  }
  return cachedClientTime;
};
const getServerTime = () => null;

export function PhonePreview({
  items,
  username = "alexrivera",
  displayName = "Alex Rivera",
  bio = "Scaling distributed systems & building clean developer tools.",
  avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  theme,
  className = "",
}: PhonePreviewProps) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeNoteModal, setActiveNoteModal] = useState<{ title: string; content: string } | null>(null);
  const [copiedNote, setCopiedNote] = useState(false);

  const now = React.useSyncExternalStore(
    emptySubscribe,
    getClientTime,
    getServerTime
  );

  const activeItems = items.filter((item) => {
    if (!item.isActive) return false;
    if (now === null) return true;
    if (item.startsAt && new Date(item.startsAt).getTime() > now) return false;
    if (item.expiresAt && new Date(item.expiresAt).getTime() < now) return false;
    return true;
  });

  const fullProfileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${username}`
      : `https://onelink.bio/${username}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullProfileUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getLinkIcon = (url: string, thumbnailUrl?: string | null) => {
    return renderLinkIcon(thumbnailUrl, url, "w-3.5 h-3.5 text-zinc-300");
  };

  const isGradient =
    theme?.bgType === "GRADIENT" ||
    (Boolean(theme?.bgValue) && theme!.bgValue!.includes("gradient"));
  const screenBgStyle: React.CSSProperties = isGradient
    ? { backgroundImage: theme?.bgValue, backgroundColor: "#09090b" }
    : { backgroundColor: theme?.bgValue || "#0e0e10" };
  const previewTextColor = theme?.textColor || "#fafafa";
  const previewFont = theme?.fontFamily ? `${theme.fontFamily}, sans-serif` : undefined;

  const getButtonInlineStyle = (): React.CSSProperties => {
    const radius = typeof theme?.btnRadius === "number" ? theme.btnRadius : 9999;
    const btnColor = theme?.btnColor || "#18181b";
    const btnTextColor = theme?.btnTextColor || "#fafafa";
    const btnStyle = theme?.btnStyle || "ROUNDED";

    const base: React.CSSProperties = {
      borderRadius: `${radius}px`,
      color: btnTextColor,
    };

    if (btnStyle === "FILLED") {
      base.backgroundColor = btnColor;
      base.border = "1px solid rgba(255, 255, 255, 0.1)";
    } else if (btnStyle === "OUTLINE") {
      base.backgroundColor = "transparent";
      base.border = `2px solid ${btnColor}`;
    } else if (btnStyle === "SHADOW") {
      base.backgroundColor = btnColor;
      base.boxShadow = "3px 3px 0px rgba(255, 255, 255, 0.45)";
      base.border = "1px solid rgba(255, 255, 255, 0.8)";
    } else {
      // ROUNDED
      base.backgroundColor = btnColor;
      base.border = "1px solid rgba(255, 255, 255, 0.1)";
    }
    return base;
  };

  const renderProfileContent = () => (
    <>
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mt-2">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full p-0.5 ring-2 ring-white/30 bg-zinc-900 overflow-hidden shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full rounded-full object-cover"
          />
        </div>

        {/* Name & Handle */}
        <div className="flex items-center justify-center mt-3">
          <h2
            className="text-base font-semibold tracking-tight"
            style={{ color: previewTextColor }}
          >
            {displayName}
          </h2>
        </div>

        <p className="text-xs font-mono mt-0.5 opacity-60" style={{ color: previewTextColor }}>
          @{username}
        </p>
        <p className="text-xs max-w-65 mt-1.5 leading-relaxed opacity-75" style={{ color: previewTextColor }}>
          {bio}
        </p>
      </div>

      {/* Links Render Stack */}
      <div className="flex flex-col space-y-2.5 mt-6 w-full pb-6">
        {activeItems.length === 0 ? (
          <div className="py-8 text-center px-4 rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-500">
            No active links published yet. Toggle a link on the left to preview it here!
          </div>
        ) : (
          activeItems.map((item) => {
            if (item.type === "HEADER") {
              return (
                <div
                  key={item.id}
                  className="w-full text-center mt-5 mb-2"
                >
                  <span
                    className="text-[11px] uppercase font-semibold tracking-wider"
                    style={{ color: previewTextColor, opacity: 0.7 }}
                  >
                    {item.title}
                  </span>
                </div>
              );
            }

            if (item.type === "DIVIDER") {
              return (
                <div
                  key={item.id}
                  className="w-full flex items-center justify-center my-4"
                >
                  <div className="w-full border-t border-white/10" />
                </div>
              );
            }

            if (item.type === "DONATION") {
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="phone-item w-full flex items-center justify-between p-3 rounded-2xl bg-linear-to-r from-amber-500/20 via-amber-600/10 to-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-left transition-all duration-150 group cursor-pointer shadow-md"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-300">
                      <Coffee className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs text-amber-200 truncate font-semibold block">
                        {item.title}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold shrink-0">
                    Tip ☕
                  </span>
                </a>
              );
            }

            if (item.type === "NOTE") {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNoteModal({ title: item.title, content: item.url || "" })}
                  className="phone-item w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 text-left transition-all duration-150 group cursor-pointer shadow-sm"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-300">
                      <StickyNote className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs text-amber-100 truncate font-semibold block">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-amber-300/70 truncate block">
                        Tap to read creator note
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[9px] font-bold shrink-0">
                    📝 Note
                  </span>
                </button>
              );
            }

            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={getButtonInlineStyle()}
                className="phone-item w-full flex items-center justify-between p-3 text-left transition-all duration-150 group cursor-pointer shadow-sm"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className="shrink-0">{getLinkIcon(item.url, item.thumbnailUrl)}</div>
                  <span
                    className="text-xs truncate font-medium group-hover:opacity-80 transition-opacity"
                    style={{ color: theme?.btnTextColor || "#fafafa" }}
                  >
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  {item.badge && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-white/15 border border-white/20 shrink-0"
                      style={{ color: theme?.btnTextColor || "#fafafa" }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.isPasswordProtected && (
                    <Lock className="w-3 h-3 text-purple-400" />
                  )}
                  {item.isAgeRestricted && (
                    <span className="px-1 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                      18+
                    </span>
                  )}
                  <ChevronRight
                    className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                    style={{ color: theme?.btnTextColor || "#fafafa" }}
                  />
                </div>
              </a>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <section
      className={`w-full lg:w-[40%] bg-[#09090b] flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 relative min-h-150 h-full overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/5 select-none custom-scrollbar ${className}`}
    >
      {/* Top Preview Control Bar */}
      <div className="w-full max-w-97.5 flex items-center justify-between pb-5">
        {/* Device toggle */}
        <div className="relative inline-flex p-1 rounded-full bg-zinc-900 border border-white/10">
          <button
            onClick={() => setDevice("mobile")}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 transition-all ${
              device === "mobile"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-600"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
          <button
            onClick={() => setDevice("desktop")}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 transition-all ${
              device === "desktop"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-600"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Live link badge & QR */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 hover:border-zinc-500 hover:bg-zinc-800/80 text-xs font-mono text-zinc-300 active:scale-95 transition-all group"
            title="Click to copy profile URL"
          >
            <span className="relative flex h-2 w-2">
              <span className="beacon-ripple absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
            <span>{copied ? "Copied!" : `onelink.bio/${username}`}</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 active:scale-90 transition-all"
            title="Show QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      {device === "desktop" ? (
        <div className="w-full max-w-77.5 xs:max-w-85 sm:max-w-105 md:max-w-120 lg:max-w-130 flex flex-col items-center select-none my-auto transition-all duration-300 drop-shadow-2xl">
          {/* Laptop Screen Lid / Shell */}
          <div className="w-full bg-[#1c1c1f] rounded-t-2xl p-2 pb-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-[#38383e] ring-1 ring-white/10 relative">
            {/* Top Display Bezel with Centered Camera & TrueTone Sensor */}
            <div className="w-full flex items-center justify-center pb-1.5 pt-0.5">
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#0a0a0c]/80 border border-zinc-800">
                {/* Ambient Sensor */}
                <div className="w-1 h-1 rounded-full bg-zinc-700/60" />
                {/* Camera Lens */}
                <div className="w-2 h-2 rounded-full bg-[#050505] ring-1 ring-zinc-700/80 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#1b3d54]" />
                </div>
              </div>
            </div>

            {/* Display Glass Panel with 1px Inner Border */}
            <div className="w-full rounded-t-lg overflow-hidden border border-white/5 shadow-inner">
              {/* macOS Browser Chrome Header */}
              <div className="w-full bg-[#141416]/95 backdrop-blur-md px-3.5 py-2 flex items-center justify-between border-b border-white/5 select-none">
                {/* Traffic Light Controls */}
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                </div>

                {/* macOS Safari/Chrome Styled Unified Address Pill */}
                <div className="flex items-center space-x-2 px-4 py-1 rounded-full bg-[#09090b]/80 border border-white/10 text-[11px] font-mono text-zinc-300 max-w-72 truncate shadow-xs">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">https://onelink.bio/{username}</span>
                </div>

                {/* Action Dummy Window Button */}
                <div className="flex items-center space-x-1.5 text-zinc-500">
                  <div className="w-2.5 h-2.5 rounded-xs border border-zinc-600/70" />
                  <div className="w-2.5 h-2.5 rounded-xs border border-zinc-600/70" />
                </div>
              </div>

              {/* Browser Screen Viewport */}
              <div
                style={{ ...screenBgStyle, fontFamily: previewFont }}
                className="w-full h-64 sm:h-80 lg:h-100 overflow-y-auto overflow-x-hidden flex flex-col relative px-4 sm:px-8 py-4 sm:py-6 transition-colors custom-scrollbar"
              >
                {renderProfileContent()}
              </div>
            </div>
          </div>

          {/* Central Recessed Dark Hinge */}
          <div className="w-[45%] h-1 bg-[#101012] border-t border-black/80 shadow-inner z-10" />

          {/* Precision CNC Machined Aluminum Unibody Base / Lower Deck */}
          <div className="w-[104%] h-4 bg-linear-to-b from-[#3a3a40] via-[#25252a] to-[#161619] rounded-b-xl shadow-2xl relative flex items-start justify-center border-t border-zinc-400/30">
            {/* Display Lift Thumb Notch */}
            <div className="w-20 h-1.5 bg-[#09090b] rounded-b-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)] border-b border-white/15" />
          </div>

          {/* Under-Chassis Twin Rubber Feet */}
          <div className="w-[96%] flex justify-between px-6 -mt-0.5">
            <div className="w-6 h-0.5 bg-black/80 rounded-full" />
            <div className="w-6 h-0.5 bg-black/80 rounded-full" />
          </div>

          {/* Realistic Multi-Layer Ambient Perspective Shadows */}
          <div className="w-[98%] h-2 bg-black/60 blur-xs rounded-full -mt-0.5" />
          <div className="w-[86%] h-4 bg-black/40 blur-md rounded-full -mt-1.5" />
        </div>
      ) : (
        /* Mobile iPhone Frame */
        <div className="relative my-auto transition-all duration-300 w-67.5 xs:w-[290px] sm:w-85 lg:w-90 h-120 xs:h-[530px] sm:h-155 lg:h-175 rounded-[36px] sm:rounded-[52px] bg-black p-2.5 sm:p-3.5 shadow-2xl ring-1 ring-white/10 border-2 sm:border-4 border-zinc-800/80 shrink-0">
          {/* Dynamic Island Interior Screen */}
          <div
            style={{ ...screenBgStyle, fontFamily: previewFont }}
            className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col relative px-3.5 sm:px-5 py-3 sm:py-4 border border-white/5 rounded-[28px] sm:rounded-[40px] transition-colors custom-scrollbar"
          >
            {/* Status Bar */}
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 px-2 pt-1 mb-4 select-none">
              <span className="font-semibold text-zinc-300">9:41</span>

              {/* Dynamic Island Pill with aura */}
              <div className="dynamic-island-aura w-24 h-5 rounded-full bg-black border border-white/10 flex items-center justify-between px-2 cursor-pointer hover:scale-105 transition-transform">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 ring-1 ring-white/10" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="flex items-center space-x-1.5 text-zinc-400">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryCharging className="w-3.5 h-3.5" />
              </div>
            </div>

            {renderProfileContent()}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center text-white">
            <h3 className="text-sm font-semibold mb-2">QR Code for @{username}</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Scan with any mobile camera to view your public profile.
            </p>
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-xl flex items-center justify-center shadow-lg">
              {/* High-contrast crisp SVG QR mockup */}
              <div className="w-full h-full border-2 border-black rounded flex flex-col items-center justify-center text-black font-mono text-xs">
                <QrCode className="w-28 h-28 text-black" />
                <span className="text-[10px] mt-1 font-bold">@{username}</span>
              </div>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-6 w-full py-2 rounded-full bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Note Reader Modal */}
      {activeNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">
                    {activeNoteModal.title}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Creator Note from @{username}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveNoteModal(null);
                  setCopiedNote(false);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Note Parchment / Slate Body */}
            <div className="max-h-60 overflow-y-auto p-4 rounded-xl bg-black/50 border border-white/5 font-sans text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
              {activeNoteModal.content || "(Empty note content)"}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-zinc-500">
                {activeNoteModal.content.split(/\s+/).filter(Boolean).length} words
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeNoteModal.content);
                    setCopiedNote(true);
                    setTimeout(() => setCopiedNote(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center space-x-1.5 transition-all"
                >
                  {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNote ? "Copied!" : "Copy Note"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNoteModal(null);
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
    </section>
  );
}
