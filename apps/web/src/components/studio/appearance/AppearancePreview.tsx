"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Monitor,
  Check,
  QrCode,
  Sparkles,
  ChevronRight,
  Wifi,
  BatteryCharging,
  Signal,
  Video,
  BookOpen,
  Mail,
} from "lucide-react";
import { isLightColor } from "@/lib/theme-contrast";

interface AppearancePreviewProps {
  bgValue: string;
  btnRadius: number;
  btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED";
  btnColor: string;
  btnTextColor: string;
  textColor: string;
  fontFamily: string;
  titleWeight: "font-normal" | "font-medium" | "font-semibold" | "font-bold";
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

const SAMPLE_LINKS = [
  {
    id: "preview-1",
    title: "Latest Video: 10M req/sec Under the Hood",
    icon: <Video className="w-3.5 h-3.5" />,
  },
  {
    id: "preview-2",
    title: "Free System Design Architecture Guide",
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  {
    id: "preview-3",
    title: "Join 15k Engineers on Substack",
    icon: <Mail className="w-3.5 h-3.5" />,
  },
];

export function AppearancePreview({
  bgValue,
  btnRadius,
  btnStyle,
  btnColor,
  btnTextColor,
  textColor,
  fontFamily,
  titleWeight,
  username = "alexrivera",
  displayName = "Alex Rivera",
  bio = "Scaling distributed systems & building clean developer tools.",
  avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
}: AppearancePreviewProps) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`https://onelink.bio/${username}`);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compute button styles based on settings
  const getButtonInlineStyle = (): React.CSSProperties => {
    const isPageLight = isLightColor(bgValue);
    const isEffectiveBtnLight = btnStyle === "OUTLINE" ? isPageLight : isLightColor(btnColor);

    const base: React.CSSProperties = {
      borderRadius: `${btnRadius}px`,
      color: btnTextColor,
    };

    if (btnStyle === "FILLED") {
      base.backgroundColor = btnColor;
      base.border =
        isEffectiveBtnLight && isPageLight
          ? "1px solid rgba(0, 0, 0, 0.12)"
          : "1px solid rgba(255, 255, 255, 0.1)";
      if (isEffectiveBtnLight && isPageLight) {
        base.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
      }
    } else if (btnStyle === "OUTLINE") {
      base.backgroundColor = "transparent";
      base.border = `2px solid ${btnColor}`;
    } else if (btnStyle === "SHADOW") {
      base.backgroundColor = btnColor;
      base.boxShadow = "3px 3px 0px rgba(0, 0, 0, 0.85)";
      base.border = "2px solid #000000";
    } else if (btnStyle === "ROUNDED") {
      base.backgroundColor = btnColor;
      base.border =
        isEffectiveBtnLight && isPageLight
          ? "1px solid rgba(0, 0, 0, 0.12)"
          : "1px solid rgba(255, 255, 255, 0.1)";
    }

    return base;
  };

  return (
    <section className="w-full lg:w-[40%] bg-[#09090b] flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 relative min-h-150 border-t lg:border-t-0 lg:border-l border-white/5 select-none">
      {/* Top Preview Control Bar */}
      <div className="w-full max-w-97.5 flex items-center justify-between pb-5">
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
          <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400">
            <QrCode className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Frame Container */}
      <div
        className={`relative my-auto transition-all duration-300 ${
          device === "mobile"
            ? "w-90 sm:w-95 h-180 rounded-[52px] bg-black p-3.5 shadow-2xl ring-1 ring-white/10 border-4 border-zinc-800/80"
            : "w-full max-w-120 h-180 rounded-2xl bg-zinc-950 p-4 shadow-2xl ring-1 ring-white/10 border border-zinc-800"
        }`}
      >
        {/* Dynamic Island Screen Interior with live background */}
        <div
          className={`w-full h-full overflow-y-auto overflow-x-hidden flex flex-col relative px-5 py-4 border border-white/10 transition-colors duration-300 ${
            device === "mobile" ? "rounded-[40px]" : "rounded-xl"
          }`}
          style={{
            background: bgValue,
            fontFamily: fontFamily,
          }}
        >
          {/* Status Bar */}
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 px-2 pt-1 mb-4 select-none">
            <span className="font-semibold text-zinc-300">9:41</span>

            {device === "mobile" && (
              <div className="dynamic-island-aura w-24 h-5 rounded-full bg-black border border-white/10 flex items-center justify-between px-2 cursor-pointer hover:scale-105 transition-transform">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 ring-1 ring-white/10" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}

            <div className="flex items-center space-x-1.5 text-zinc-400">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <BatteryCharging className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col items-center text-center mt-2">
            <div className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-full p-0.5 ring-2 ring-white/40 bg-zinc-900 overflow-hidden transform-gpu group-hover:scale-105 transition-all">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="verified-badge-pulse absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white text-zinc-950 flex items-center justify-center ring-2 ring-[#0e0e10]">
                <Check className="w-3 h-3 stroke-3" />
              </div>
            </div>

            <div className="flex items-center space-x-1.5 mt-3">
              <h2
                className={`text-base tracking-tight ${titleWeight}`}
                style={{ color: textColor }}
              >
                {displayName}
              </h2>
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            </div>

            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              @{username}
            </p>
            <p
              className="text-xs max-w-65 mt-1.5 leading-relaxed opacity-80"
              style={{ color: textColor }}
            >
              {bio}
            </p>
          </div>

          {/* Preview Links Render Stack */}
          <div className="flex flex-col space-y-2.5 mt-6 w-full pb-6">
            {SAMPLE_LINKS.map((link) => (
              <div
                key={link.id}
                style={getButtonInlineStyle()}
                className="w-full flex items-center justify-between p-3 transition-all duration-150 cursor-pointer shadow-xs hover:opacity-90 active:scale-98"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className="shrink-0">{link.icon}</div>
                  <span className="text-xs truncate font-medium">
                    {link.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
