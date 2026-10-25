import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SocialIcon } from "@/components/profile/SocialIcon";
import { LinkPill } from "@/components/profile/LinkPill";
import { ShareButton } from "@/components/profile/ShareButton";
import { PageViewTracker } from "@/components/profile/PageViewTracker";

interface ProfileData {
  id: string;
  username: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  ogImageUrl: string | null;
  isUnpublished?: boolean;
  theme?: {
    name: string;
    bgType: "SOLID" | "GRADIENT" | "IMAGE";
    bgValue: string;
    btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED";
    btnColor: string;
    btnTextColor: string;
    fontFamily: string;
    textColor: string;
  } | null;
  customTheme?: {
    bgType: "SOLID" | "GRADIENT" | "IMAGE";
    bgValue: string;
    btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED";
    btnColor: string;
    btnTextColor: string;
    fontFamily: string;
    textColor: string;
    btnRadius: number;
  } | null;
  links: Array<{
    id: string;
    title: string;
    url: string | null;
    type: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
    position: number;
    thumbnailUrl: string | null;
    badge?: string | null;
    isPasswordProtected?: boolean;
    isAgeRestricted?: boolean;
  }>;
  socialLinks: Array<{
    id: string;
    platform: string;
    url: string;
    position: number;
  }>;
  removeBranding?: boolean;
  planCode?: string;
}

const CRISTIAN_ARANDO_DEMO: ProfileData = {
  id: "demo-cristian-arando",
  username: "crisarando",
  title: "Cristian Arando",
  bio: "Scaling distributed systems & building clean developer tools.",
  avatarUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  seoTitle: "Cristian Arando | OneLink",
  seoDesc: "Scaling distributed systems & building clean developer tools.",
  ogImageUrl: null,
  theme: {
    name: "Obsidian Carbon",
    bgType: "SOLID",
    bgValue: "#09090b",
    btnStyle: "ROUNDED",
    btnColor: "#18181b",
    btnTextColor: "#fafafa",
    textColor: "#fafafa",
    fontFamily: "Geist",
  },
  links: [
    {
      id: "demo-1",
      title: "Latest Video: 10M req/sec Under the Hood",
      url: "https://youtube.com/watch?v=sysarch",
      type: "LINK",
      position: 0,
      thumbnailUrl: null,
    },
    {
      id: "demo-2",
      title: "Free System Design Architecture Guide",
      url: "https://crisarando.gumroad.com/l/sysdesign",
      type: "LINK",
      position: 1,
      thumbnailUrl: null,
    },
    {
      id: "demo-3",
      title: "Join 15k Engineers on Substack",
      url: "https://newsletter.crisarando.dev",
      type: "LINK",
      position: 2,
      thumbnailUrl: null,
    },
    {
      id: "demo-4",
      title: "Support my work (Buy Me a Coffee)",
      url: "https://buymeacoffee.com/crisarando",
      type: "DONATION",
      position: 3,
      thumbnailUrl: null,
    },
  ],
  socialLinks: [
    { id: "s-1", platform: "GITHUB", url: "https://github.com", position: 0 },
    { id: "s-2", platform: "YOUTUBE", url: "https://youtube.com", position: 1 },
    { id: "s-3", platform: "TWITTER", url: "https://x.com", position: 2 },
    { id: "s-4", platform: "LINKEDIN", url: "https://linkedin.com", position: 3 },
  ],
};

async function getProfile(username: string): Promise<ProfileData | null> {
  const cleanUsername = username.replace(/^%40|^@/, "").toLowerCase();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "").replace(/\/api\/?$/, "");

  try {
    const res = await fetch(`${apiUrl}/api/profiles/${cleanUsername}`, {
      next: {
        revalidate: 30,
        tags: [`profile-${cleanUsername}`],
      },
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      const data = await res.json().catch(() => null);
      if (
        data?.message &&
        typeof data.message === "string" &&
        data.message.startsWith("PROFILE_UNPUBLISHED:")
      ) {
        return {
          isUnpublished: true,
          id: "",
          username: cleanUsername,
          title: `@${cleanUsername}`,
          bio: null,
          avatarUrl: null,
          seoTitle: null,
          seoDesc: null,
          ogImageUrl: null,
          links: [],
          socialLinks: [],
        };
      }
    }
  } catch {
    // API not reachable, fallback to demo if username matches
  }

  if (cleanUsername === "user" || cleanUsername === "crisarando" || cleanUsername === "alexrivera") {
    return CRISTIAN_ARANDO_DEMO;
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return {
      title: "Profile Not Found | OneLink",
      description: "The requested creator profile does not exist.",
    };
  }

  const cleanUsername = username.replace(/^%40|^@/, "").toLowerCase();

  if (profile.isUnpublished) {
    return {
      title: `@${cleanUsername} is Currently Offline | OneLink`,
      description: "This creator bio page is temporarily deactivated.",
    };
  }

  const pageTitle = profile.seoTitle || profile.title || `@${cleanUsername}`;
  const pageDesc =
    profile.seoDesc ||
    profile.bio ||
    `Check out all links from @${cleanUsername} on OneLink.`;

  return {
    title: `${pageTitle} | OneLink`,
    description: pageDesc,
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      images:
        profile.ogImageUrl || profile.avatarUrl
          ? [profile.ogImageUrl || profile.avatarUrl!]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDesc,
    },
  };
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-between">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="flex justify-between items-center w-full max-w-120 mx-auto px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
          <div className="w-24 h-4 rounded bg-white/10 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
        </div>
      </header>

      <main className="w-full max-w-120 mx-auto px-4 flex-1 flex flex-col items-center pt-8 pb-12">
        <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse mb-4" />
        <div className="w-36 h-6 rounded bg-white/10 animate-pulse mb-2" />
        <div className="w-56 h-4 rounded bg-white/5 animate-pulse mb-6" />

        <div className="w-full flex flex-col gap-3.5 mb-8">
          <div className="w-full h-14 rounded-full bg-white/5 animate-pulse" />
          <div className="w-full h-14 rounded-full bg-white/5 animate-pulse" />
          <div className="w-full h-14 rounded-full bg-white/5 animate-pulse" />
        </div>
      </main>

      <footer className="w-full border-t border-white/5 py-8 text-center">
        <div className="w-32 h-4 rounded bg-white/5 animate-pulse mx-auto" />
      </footer>
    </div>
  );
}

async function ProfileContent({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cleanUsername = username.replace(/^%40|^@/, "").toLowerCase();
  const profile = await getProfile(username);

  if (!profile) {
    notFound();
  }

  if (profile.isUnpublished) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-between items-center p-6 selection:bg-white/20">
        <header className="w-full max-w-md flex justify-between items-center py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-base tracking-tight hover:opacity-80 transition-opacity"
          >
            <span className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center text-xs font-black shadow-sm">
              1
            </span>
            <span className="text-zinc-200">OneLink</span>
          </Link>
          <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400">
            Offline Mode
          </span>
        </header>

        <main className="w-full max-w-md mx-auto text-center flex flex-col items-center justify-center py-16 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 mb-6 shadow-2xl">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3 font-semibold">
            Bio Deactivated
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            @{cleanUsername} is currently offline
          </h1>
          <p className="text-sm text-zinc-400 max-w-sm mb-8 leading-relaxed">
            This bio page has been temporarily deactivated by the creator. If this is your page, you can reactivate it anytime in Studio Settings.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Link
              href="/studio/settings"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs sm:text-sm hover:bg-zinc-200 transition-all shadow-md active:scale-95 text-center"
            >
              Reactivate in Studio
            </Link>
            <Link
              href="/"
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 font-medium text-xs sm:text-sm hover:bg-zinc-800 border border-white/10 transition-all text-center"
            >
              Explore OneLink
            </Link>
          </div>
        </main>

        <footer className="w-full border-t border-white/5 py-6 text-center text-xs text-zinc-600">
          © 2026 OneLink Platform • All rights reserved
        </footer>
      </div>
    );
  }

  // Active theme resolution: custom theme takes precedence if defined
  const activeTheme = profile.customTheme || profile.theme;
  const bgType = activeTheme?.bgType || "SOLID";
  const bgValue = activeTheme?.bgValue || "#09090b";
  const textColor = activeTheme?.textColor || "#fafafa";
  const btnStyle = activeTheme?.btnStyle || "FILLED";
  const btnColor = activeTheme?.btnColor || "#27272a";
  const btnTextColor = activeTheme?.btnTextColor || "#ffffff";
  const btnRadius =
    profile.customTheme?.btnRadius ?? (btnStyle === "ROUNDED" ? 9999 : 12);

  const containerStyle: React.CSSProperties = {
    color: textColor,
    ...(bgType === "GRADIENT"
      ? { backgroundImage: bgValue }
      : { backgroundColor: bgValue }),
  };

  const displayName = profile.title || `@${cleanUsername}`;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div
      style={containerStyle}
      className="min-h-screen flex flex-col justify-between selection:bg-white/20 selection:text-white transition-colors duration-300"
    >
      <PageViewTracker profileId={profile.id} />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="flex justify-between items-center w-full max-w-120 mx-auto px-4 py-3">
          <ShareButton title={profile.title || undefined} username={cleanUsername} />
          <span className="text-sm font-semibold tracking-tight text-white/90">
            @{cleanUsername}
          </span>
          <Link
            href="/register"
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-1 active:scale-95 shadow-xs"
            title="Create your own OneLink page"
          >
            <span>Create your OneLink</span>
            <span className="text-[10px] opacity-75">→</span>
          </Link>
        </div>
      </header>

      {/* Main Content Column */}
      <main className="w-full max-w-120 mx-auto px-4 flex-1 flex flex-col items-center relative pt-8 pb-12">
        {/* Creator Identity Header */}
        <div className="flex flex-col items-center text-center w-full mb-8">
          {/* Avatar with Glow Effect */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full p-0.5 bg-linear-to-tr from-white/30 via-zinc-600 to-white/10 shadow-2xl shadow-black/50">
              {profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-white">
                  {avatarFallback}
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="flex items-center justify-center mb-0.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {displayName}
            </h1>
          </div>
          <p className="text-xs font-mono text-zinc-400 mb-1">@{cleanUsername}</p>

          {/* Bio text */}
          {profile.bio && (
            <p className="text-sm text-zinc-400 max-w-90 leading-relaxed mt-1">
              {profile.bio}
            </p>
          )}

          {/* Social Icons Strip */}
          {profile.socialLinks && profile.socialLinks.length > 0 && (
            <div className="flex items-center justify-center flex-wrap gap-3 mt-5">
              {profile.socialLinks.map((social) => (
                <SocialIcon
                  key={social.id}
                  platform={social.platform}
                  url={social.url}
                />
              ))}
            </div>
          )}
        </div>

        {/* Links Stack */}
        <section
          aria-label="Creator Links"
          className="w-full flex flex-col gap-3.5 mb-8"
        >
          {profile.links && profile.links.length > 0 ? (
            [...profile.links]
              .sort((a, b) => a.position - b.position)
              .map((link) => (
              <LinkPill
                key={link.id}
                id={link.id}
                title={link.title}
                url={link.url}
                type={link.type}
                thumbnailUrl={link.thumbnailUrl}
                profileId={profile.id}
                badge={link.badge}
                btnStyle={btnStyle}
                btnColor={btnColor}
                btnTextColor={btnTextColor}
                btnRadius={btnRadius}
                isPasswordProtected={link.isPasswordProtected}
                isAgeRestricted={link.isAgeRestricted}
                pageBgColor={bgValue}
                pageTextColor={textColor}
              />
            ))
          ) : (
            <div className="text-center py-10 text-zinc-500 text-sm">
              No links published yet.
            </div>
          )}
        </section>
      </main>

      {/* Minimalistic Carbon Footer (Hidden for Pro & Enterprise creators) */}
      {!profile.removeBranding && (
        <footer className="w-full border-t border-white/5 py-8 px-4 text-center">
          <div className="flex flex-col items-center justify-center gap-2 max-w-120 mx-auto text-xs text-zinc-500">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <span>OneLink</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                Platform
              </span>
            </Link>
            <p>© 2026 OneLink. Create your free creator page.</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}
