"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  Music,
  Share2,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  SocialLinkItem,
  apiCreateSocialLink,
  apiUpdateSocialLink,
  apiDeleteSocialLink,
  apiReorderSocialLinks,
} from "@/lib/api-client";

interface SocialLinksManagerProps {
  profileId: string;
  socialLinks: SocialLinkItem[];
  onSocialLinksChange: (links: SocialLinkItem[]) => void;
}

const SUPPORTED_PLATFORMS = [
  { id: "INSTAGRAM", name: "Instagram", prefix: "https://instagram.com/", placeholder: "@username or url" },
  { id: "TIKTOK", name: "TikTok", prefix: "https://tiktok.com/@", placeholder: "@username or url" },
  { id: "YOUTUBE", name: "YouTube", prefix: "https://youtube.com/@", placeholder: "@channel or url" },
  { id: "TWITTER", name: "X (Twitter)", prefix: "https://x.com/", placeholder: "@handle or url" },
  { id: "GITHUB", name: "GitHub", prefix: "https://github.com/", placeholder: "username or url" },
  { id: "LINKEDIN", name: "LinkedIn", prefix: "https://linkedin.com/in/", placeholder: "username or url" },
  { id: "DISCORD", name: "Discord", prefix: "https://discord.gg/", placeholder: "invite-code or url" },
  { id: "TWITCH", name: "Twitch", prefix: "https://twitch.tv/", placeholder: "channel or url" },
  { id: "SPOTIFY", name: "Spotify", prefix: "", placeholder: "https://open.spotify.com/..." },
  { id: "APPLEMUSIC", name: "Apple Music", prefix: "", placeholder: "https://music.apple.com/..." },
  { id: "EMAIL", name: "Email", prefix: "mailto:", placeholder: "your@email.com" },
  { id: "WEBSITE", name: "Website", prefix: "https://", placeholder: "https://yourwebsite.com" },
] as const;

export function SocialLinksManager({
  profileId,
  socialLinks,
  onSocialLinksChange,
}: SocialLinksManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("INSTAGRAM");
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resolveUrl = (platform: string, input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:")) {
      return trimmed;
    }
    const cleanHandle = trimmed.replace(/^@/, "");
    const config = SUPPORTED_PLATFORMS.find((p) => p.id === platform);
    if (platform === "EMAIL") {
      return `mailto:${trimmed}`;
    }
    if (config?.prefix) {
      return `${config.prefix}${cleanHandle}`;
    }
    return `https://${trimmed}`;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      setErrorMsg("Please enter an account handle or URL.");
      return;
    }

    if (!profileId) {
      setErrorMsg("Profile ID not found. Please refresh.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const finalUrl = resolveUrl(selectedPlatform, inputValue);

    try {
      const created = await apiCreateSocialLink(profileId, {
        platform: selectedPlatform,
        url: finalUrl,
        position: socialLinks.length,
        isActive: true,
      });

      const updated = [...socialLinks, created];
      onSocialLinksChange(updated);
      setInputValue("");
      setIsOpen(false);
      setSuccessMsg("Social icon added successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add social link";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (link: SocialLinkItem) => {
    const nextState = !link.isActive;
    const updated = socialLinks.map((it) =>
      it.id === link.id ? { ...it, isActive: nextState } : it
    );
    onSocialLinksChange(updated);

    try {
      await apiUpdateSocialLink(profileId, link.id, { isActive: nextState });
    } catch {
      // Revert on failure
      onSocialLinksChange(socialLinks);
    }
  };

  const handleDelete = async (linkId: string) => {
    const previous = [...socialLinks];
    const updated = socialLinks.filter((it) => it.id !== linkId);
    onSocialLinksChange(updated);

    try {
      await apiDeleteSocialLink(profileId, linkId);
    } catch {
      onSocialLinksChange(previous);
    }
  };

  const handleMove = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= socialLinks.length) return;

    const copy = [...socialLinks];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((it, idx) => ({ ...it, position: idx }));
    onSocialLinksChange(reordered);

    try {
      await apiReorderSocialLinks(
        profileId,
        reordered.map((it) => ({ id: it.id, position: it.position }))
      );
    } catch {
      onSocialLinksChange(socialLinks);
    }
  };

  const renderPlatformBadge = (platform: string) => {
    switch (platform.toUpperCase()) {
      case "INSTAGRAM":
        return <span className="text-pink-400 font-semibold">Instagram</span>;
      case "TIKTOK":
        return <span className="text-cyan-400 font-semibold">TikTok</span>;
      case "YOUTUBE":
        return <span className="text-red-400 font-semibold">YouTube</span>;
      case "TWITTER":
        return <span className="text-sky-400 font-semibold">X (Twitter)</span>;
      case "GITHUB":
        return <span className="text-white font-semibold">GitHub</span>;
      case "LINKEDIN":
        return <span className="text-blue-400 font-semibold">LinkedIn</span>;
      case "DISCORD":
        return <span className="text-indigo-400 font-semibold">Discord</span>;
      case "TWITCH":
        return <span className="text-purple-400 font-semibold">Twitch</span>;
      case "SPOTIFY":
        return <span className="text-emerald-400 font-semibold">Spotify</span>;
      case "APPLEMUSIC":
        return <span className="text-pink-300 font-semibold">Apple Music</span>;
      case "EMAIL":
        return <span className="text-amber-300 font-semibold">Email</span>;
      default:
        return <span className="text-zinc-300 font-semibold">{platform}</span>;
    }
  };

  return (
    <div className="tactile-card rounded-2xl border border-white/5 bg-zinc-900/60 p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold text-white">
                Social Icons Bar
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10">
                {socialLinks.length} active
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Prominently displayed right under your bio in your public link page
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setErrorMsg(null);
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isOpen ? "Cancel" : "Add Social Icon"}</span>
        </button>
      </div>

      {successMsg && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Form Collapsible */}
      {isOpen && (
        <form onSubmit={handleAdd} className="mt-4 p-4 rounded-xl bg-zinc-950/80 border border-white/10">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-2.5">
            Add Social Network or Contact
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {SUPPORTED_PLATFORMS.map((plat) => {
              const isSelected = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(plat.id);
                    setErrorMsg(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-white text-zinc-950 border-white font-semibold shadow-sm"
                      : "bg-zinc-900/90 text-zinc-300 border-white/5 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {plat.name}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  SUPPORTED_PLATFORMS.find((p) => p.id === selectedPlatform)?.placeholder ||
                  "@handle or url"
                }
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 disabled:opacity-50 transition-all shrink-0 cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Icon</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 mt-2 flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}
        </form>
      )}

      {/* Social Links List */}
      <div className="mt-4">
        {socialLinks.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">
            No social icons added yet. Click &quot;Add Social Icon&quot; above to connect your Instagram, TikTok, YouTube, X, or GitHub.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {socialLinks.map((link, idx) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-zinc-950/60 border border-white/5 hover:border-white/10 transition-all text-xs"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "left")}
                      title="Move earlier"
                      className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === socialLinks.length - 1}
                      onClick={() => handleMove(idx, "right")}
                      title="Move later"
                      className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      {renderPlatformBadge(link.platform)}
                      <span className="text-[10px] text-zinc-500 truncate max-w-40 sm:max-w-64 font-mono">
                        {link.url}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(link)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      link.isActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400 border border-white/5"
                    }`}
                  >
                    {link.isActive ? "Visible" : "Hidden"}
                  </button>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                    title="Open link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Delete icon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
