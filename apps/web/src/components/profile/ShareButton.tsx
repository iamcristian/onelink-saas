"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title?: string;
  username: string;
}

export function ShareButton({ title, username }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = title || `@${username} on OneLink`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard if user dismissed or permission denied
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore clipboard failure
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share Profile"
      className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-150"
    >
      {copied ? (
        <Check className="w-5 h-5 text-emerald-400" />
      ) : (
        <Share2 className="w-5 h-5" />
      )}
    </button>
  );
}
