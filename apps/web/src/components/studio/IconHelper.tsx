import React from "react";
import {
  Globe,
  Video,
  Coffee,
  Mail,
  BookOpen,
  Music,
  Code,
  ShoppingBag,
  Star,
  MessageSquare,
  Gamepad2,
  Heart,
  Zap,
  Download,
  Link2,
} from "lucide-react";

export const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} fill-none stroke-current stroke-2`} viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const TwitterIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.08c-.02 2.1-.64 4.19-1.92 5.86-1.64 2.19-4.32 3.49-7.07 3.49-2.73 0-5.37-1.28-7-3.44-1.64-2.14-2.22-4.96-1.57-7.61.64-2.67 2.53-4.9 5.09-5.99 1.48-.63 3.12-.86 4.72-.66v4.11c-1.12-.34-2.38-.2-3.37.42-.98.6-1.59 1.66-1.63 2.81-.05 1.14.49 2.24 1.42 2.91.93.68 2.18.81 3.24.36 1.05-.44 1.76-1.5 1.77-2.65V.02h-.11z" />
  </svg>
);

export const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export interface IconOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const AVAILABLE_LINK_ICONS: IconOption[] = [
  { id: "globe", label: "Globe", icon: Globe },
  { id: "tiktok", label: "TikTok", icon: TikTokIcon },
  { id: "instagram", label: "Instagram", icon: InstagramIcon },
  { id: "youtube", label: "YouTube / Video", icon: Video },
  { id: "twitter", label: "X / Twitter", icon: TwitterIcon },
  { id: "coffee", label: "Coffee / Tip", icon: Coffee },
  { id: "heart", label: "Heart / Support", icon: Heart },
  { id: "zap", label: "Zap / Highlight", icon: Zap },
  { id: "download", label: "Download / PDF", icon: Download },
  { id: "mail", label: "Newsletter / Email", icon: Mail },
  { id: "book", label: "Guide / Book", icon: BookOpen },
  { id: "music", label: "Music / Spotify", icon: Music },
  { id: "code", label: "Code / GitHub", icon: Code },
  { id: "linkedin", label: "LinkedIn", icon: LinkedInIcon },
  { id: "shop", label: "Store / Shop", icon: ShoppingBag },
  { id: "gamepad", label: "Gaming / Twitch", icon: Gamepad2 },
  { id: "message", label: "Discord / Chat", icon: MessageSquare },
  { id: "star", label: "Featured / Star", icon: Star },
  { id: "link", label: "General Link", icon: Link2 },
];

export function getIconComponent(iconId: string): React.ComponentType<{ className?: string }> {
  const found = AVAILABLE_LINK_ICONS.find((i) => i.id === iconId.toLowerCase());
  return found ? found.icon : Globe;
}

export function renderLinkIcon(
  thumbnailUrl?: string | null,
  url?: string | null,
  className = "w-4 h-4 text-white"
): React.ReactNode {
  // 1. Explicit configured icon
  if (thumbnailUrl?.startsWith("icon:")) {
    const iconId = thumbnailUrl.replace(/^icon:/, "").trim().toLowerCase();
    const IconComp = getIconComponent(iconId);
    return <IconComp className={className} />;
  }

  // 2. Custom image URL thumbnail
  if (thumbnailUrl && (thumbnailUrl.startsWith("http://") || thumbnailUrl.startsWith("https://"))) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={thumbnailUrl}
        alt=""
        className="w-full h-full object-cover rounded-full"
      />
    );
  }

  // 3. Fallback to smart URL heuristics
  if (url) {
    const l = url.toLowerCase();
    if (l.includes("youtube.com") || l.includes("youtu.be")) {
      return <Video className={className} />;
    }
    if (l.includes("tiktok.com") || l.includes("tiktok")) {
      return <TikTokIcon className={className} />;
    }
    if (l.includes("instagram.com")) {
      return <InstagramIcon className={className} />;
    }
    if (l.includes("linkedin.com")) {
      return <LinkedInIcon className={className} />;
    }
    if (l.includes("twitter.com") || l.includes("x.com")) {
      return <TwitterIcon className={className} />;
    }
    if (l.includes("twitch.tv")) {
      return <Gamepad2 className={className} />;
    }
    if (l.includes("spotify.com") || l.includes("soundcloud.com")) {
      return <Music className={className} />;
    }
    if (l.includes("github.com") || l.includes("gitlab.com")) {
      return <Code className={className} />;
    }
    if (l.includes("gumroad.com") || l.includes("guide") || l.includes("book")) {
      return <BookOpen className={className} />;
    }
    if (l.includes("substack.com") || l.includes("newsletter") || l.includes("mail")) {
      return <Mail className={className} />;
    }
    if (l.includes("buymeacoffee.com") || l.includes("coffee") || l.includes("patreon")) {
      return <Coffee className={className} />;
    }
    if (l.includes("discord.gg") || l.includes("discord.com")) {
      return <MessageSquare className={className} />;
    }
  }

  // 4. Default Globe
  return <Globe className={className} />;
}
