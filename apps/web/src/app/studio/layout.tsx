"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  Share2,
  LogOut,
  Sliders,
  BarChart3,
  CreditCard,
  Shield,
  Home,
  Link as LinkIcon,
  Sparkles,
  Building2,
  ChevronDown,
  User,
  Settings,
} from "lucide-react";
import {
  fetchCurrentUser,
  fetchProfile,
  clearAuthToken,
  CurrentUserSession,
  apiGetCollaborations,
  apiAcceptCollaboration,
  apiDeclineCollaboration,
  WorkspaceCollaboration,
} from "@/lib/api-client";

interface StudioLayoutProps {
  children: React.ReactNode;
}

const NAV_TABS = [
  { name: "Links", href: "/studio/links", icon: LinkIcon },
  { name: "Appearance", href: "/studio/appearance", icon: Sliders },
  { name: "Analytics", href: "/studio/analytics", icon: BarChart3 },
  { name: "Billing", href: "/studio/billing", icon: CreditCard },
  { name: "Settings", href: "/studio/settings", icon: Settings },
];

export default function StudioLayout({ children }: StudioLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<CurrentUserSession | null>(null);
  const [collaborations, setCollaborations] = useState<WorkspaceCollaboration[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceCollaboration | null>(null);
  const [activeWorkspaceAvatar, setActiveWorkspaceAvatar] = useState<string | null>(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProcessingCollab, setIsProcessingCollab] = useState<string | null>(null);

  const [profileAvatarOverride, setProfileAvatarOverride] = useState<string | null>(null);

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem("onelink_active_workspace");
    router.push("/login");
  };

  const loadCollaborations = useCallback(async () => {
    try {
      const collabs = await apiGetCollaborations();
      setCollaborations(collabs);

      const stored = localStorage.getItem("onelink_active_workspace");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const matched = collabs.find((c) => c.id === parsed.id && c.status === "Active");
          if (matched) {
            setActiveWorkspace(matched);
            return;
          }
        } catch {
          // Ignore
        }
      }
      setActiveWorkspace(null);
    } catch {
      setCollaborations([]);
    }
  }, []);

  const handleSelectWorkspace = (collab: WorkspaceCollaboration | null) => {
    setActiveWorkspace(collab);
    setIsWorkspaceMenuOpen(false);
    if (collab) {
      localStorage.setItem("onelink_active_workspace", JSON.stringify(collab));
    } else {
      localStorage.removeItem("onelink_active_workspace");
    }
    window.dispatchEvent(new CustomEvent("workspace_changed", { detail: collab }));
  };

  const handleAcceptInvite = async (invId: string) => {
    setIsProcessingCollab(invId);
    try {
      const res = await apiAcceptCollaboration(invId);
      if (res?.collaboration) {
        handleSelectWorkspace(res.collaboration);
      }
      await loadCollaborations();
    } catch (err) {
      console.error("Failed to accept collaboration:", err);
    } finally {
      setIsProcessingCollab(null);
    }
  };

  const handleDeclineInvite = async (invId: string) => {
    setIsProcessingCollab(invId);
    try {
      await apiDeclineCollaboration(invId);
      await loadCollaborations();
    } catch (err) {
      console.error("Failed to decline collaboration:", err);
    } finally {
      setIsProcessingCollab(null);
    }
  };

  const reloadSession = useCallback(() => {
    fetchCurrentUser()
      .then((user) => {
        if (user) {
          setSession(user);
        } else {
          router.push("/login");
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    reloadSession();
    loadCollaborations();

    const handleUpdate = () => {
      reloadSession();
      loadCollaborations();
    };

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatarUrl?: string; username?: string }>;
      if (customEvent.detail?.avatarUrl) {
        setProfileAvatarOverride(customEvent.detail.avatarUrl);
        setActiveWorkspaceAvatar(customEvent.detail.avatarUrl);
      }
      reloadSession();
      loadCollaborations();
    };

    window.addEventListener("subscription_updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    window.addEventListener("collaboration_updated", handleUpdate);
    window.addEventListener("profile_updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("subscription_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("collaboration_updated", handleUpdate);
      window.removeEventListener("profile_updated", handleProfileUpdate);
    };
  }, [reloadSession, loadCollaborations]);

  // Synchronize avatar with active workspace
  useEffect(() => {
    let isMounted = true;
    if (activeWorkspace?.ownerUsername) {
      if (activeWorkspace.ownerAvatarUrl) {
        setActiveWorkspaceAvatar(activeWorkspace.ownerAvatarUrl);
      } else {
        fetchProfile(activeWorkspace.ownerUsername)
          .then((p) => {
            if (isMounted && p?.avatarUrl) {
              setActiveWorkspaceAvatar(p.avatarUrl);
            }
          })
          .catch(() => {});
      }
    } else {
      setActiveWorkspaceAvatar(null);
    }
    return () => {
      isMounted = false;
    };
  }, [activeWorkspace]);

  const username = activeWorkspace?.ownerUsername || session?.profile?.username || "";
  const avatarUrl =
    profileAvatarOverride ||
    (activeWorkspace ? activeWorkspaceAvatar || activeWorkspace.ownerAvatarUrl : null) ||
    session?.profile?.avatarUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${username}`
    : `https://onelink.bio/${username}`;

  const activePlan = activeWorkspace
    ? activeWorkspace.ownerPlan
    : session?.subscriptions?.find((s) => s.status === "ACTIVE")?.plan?.code || "FREE";
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "OWNER";

  const isSplitLayout =
    pathname === "/studio" ||
    pathname?.startsWith("/studio/links") ||
    pathname?.startsWith("/studio/appearance");

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#09090b] text-[#fafafa] font-sans selection:bg-white/20 selection:text-white md:overflow-hidden">
      {/* Pending Workspace Invitations Banner */}
      {collaborations
        .filter((c) => c.status === "Pending")
        .map((inv) => (
          <div
            key={inv.id}
            className="w-full bg-linear-to-r from-purple-950/80 via-indigo-950/80 to-purple-950/80 border-b border-purple-500/30 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-50 shrink-0 animate-in fade-in"
          >
            <div className="flex items-center space-x-2.5 text-zinc-200">
              <span className="p-1 rounded-full bg-purple-500/20 text-purple-300">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span>
                You have been invited to manage <strong>@{inv.ownerUsername}</strong>&apos;s {inv.ownerPlan} workspace as <strong>{inv.role}</strong>.
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleAcceptInvite(inv.id)}
                disabled={isProcessingCollab === inv.id}
                className="px-3 py-1 rounded-full bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessingCollab === inv.id ? "Joining..." : "Accept & Switch"}
              </button>
              <button
                type="button"
                onClick={() => handleDeclineInvite(inv.id)}
                disabled={isProcessingCollab === inv.id}
                className="px-3 py-1 rounded-full bg-white/10 text-zinc-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ))}

      {/* Top App Bar */}
      <header className="w-full px-4 sm:px-8 h-16 flex items-center justify-between border-b border-white/5 bg-[#0e0e10]/90 backdrop-blur-md sticky top-0 z-40 shrink-0">
        {/* Brand Anchor & Navigation Cluster */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-2.5 group cursor-pointer"
            title="Volver a Inicio OneLink"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.svg"
              alt="OneLink"
              className="w-8 h-8 rounded-lg transition-transform duration-200 group-hover:scale-105 active:scale-95 shadow-sm shrink-0"
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-sm sm:text-base font-semibold tracking-tight text-white group-hover:text-zinc-200 transition-colors leading-none">
                OneLink
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Studio</span>
            </div>
          </Link>

          {/* Workspace Switcher Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-zinc-500 text-xs font-medium text-zinc-200 hover:text-white transition-all cursor-pointer"
            >
              {activeWorkspace ? (
                <>
                  <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate max-w-28 sm:max-w-40 font-semibold text-purple-200">
                    @{activeWorkspace.ownerUsername}
                  </span>
                  <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-purple-500/20 text-[10px] text-purple-300 font-mono">
                    {activeWorkspace.role}
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate max-w-24 sm:max-w-36">Personal Bio</span>
                </>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                  isWorkspaceMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isWorkspaceMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-[#121215] border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in duration-150 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-500 font-semibold">
                  Switch Workspace
                </div>

                {/* Personal Workspace */}
                <button
                  type="button"
                  onClick={() => handleSelectWorkspace(null)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    !activeWorkspace
                      ? "bg-white/10 text-white font-semibold"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <User className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div className="truncate">
                      <div className="truncate">Personal Bio (@{session?.profile?.username || "me"})</div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {session?.subscriptions?.find((s) => s.status === "ACTIVE")?.plan?.name || "Free Plan"}
                      </div>
                    </div>
                  </div>
                  {!activeWorkspace && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>

                {/* Collaborations section */}
                {collaborations.filter((c) => c.status === "Active").length > 0 && (
                  <>
                    <div className="border-t border-white/5 my-1" />
                    <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-500 font-semibold">
                      Collaborative Workspaces
                    </div>
                    {collaborations
                      .filter((c) => c.status === "Active")
                      .map((collab) => {
                        const isCurrent = activeWorkspace?.id === collab.id;
                        return (
                          <button
                            key={collab.id}
                            type="button"
                            onClick={() => handleSelectWorkspace(collab)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold"
                                : "text-zinc-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                              <div className="truncate">
                                <div className="truncate">@{collab.ownerUsername}</div>
                                <div className="text-[10px] font-mono text-purple-300/80">
                                  {collab.ownerPlan} • {collab.role}
                                </div>
                              </div>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                          </button>
                        );
                      })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop Semantic Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 h-16" aria-label="Studio navigation">
            {NAV_TABS.map((tab) => {
              const isActive =
                pathname === tab.href ||
                (tab.href === "/studio/links" && pathname === "/studio");
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`text-xs sm:text-sm font-medium flex items-center gap-1.5 h-full px-3.5 relative transition-all duration-150 ${
                    isActive
                      ? "text-white border-b-2 border-white"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg my-auto h-9"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin/moderation"
                className="text-xs sm:text-sm font-medium flex items-center gap-1.5 h-9 px-3 my-auto rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
                title="Sentinel AI Admin Threat Center"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin AI</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Trailing Actions & Profile Pill */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active Plan Pill */}
          <Link
            href="/studio/billing"
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition-all shrink-0 ${
              activePlan === "ENTERPRISE"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 shadow-xs"
                : activePlan === "PRO"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-xs"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white"
            }`}
            title="Manage subscription plan"
          >
            {activePlan === "PRO" && <Sparkles className="w-3 h-3 text-emerald-400" />}
            {activePlan === "ENTERPRISE" && <Sparkles className="w-3 h-3 text-purple-400" />}
            <span>{activePlan === "FREE" ? "Free Tier" : activePlan === "PRO" ? "Creator Pro" : "Enterprise"}</span>
          </Link>

          {/* Creator Profile Link / Pill */}
          <Link
            href={`/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full bg-zinc-900 border border-white/10 hover:border-zinc-500 hover:bg-zinc-800/80 transition-all duration-150 group active:scale-95 shrink-0"
            title="View public live profile"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={username}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-white/30 transition-all shrink-0"
            />
            <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors truncate max-w-20 md:max-w-28 lg:max-w-36">
              @{username}
            </span>
          </Link>

          {/* Share Action Button with Toast Feedback */}
          <div className="relative inline-block shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 rounded-full bg-white text-[#09090b] px-3 py-1.5 sm:px-3.5 sm:py-2 hover:bg-zinc-200 active:scale-95 transition-all duration-150 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md cursor-pointer shrink-0"
              title="Copy public profile link"
            >
              <span className="hidden xl:inline truncate max-w-44">Share onelink.bio/{username}</span>
              <span className="inline xl:hidden">Share</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-3" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-[#09090b]" />
              )}
            </button>

            {/* Copied tooltip bubble */}
            <div
              className={`absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-zinc-800 text-white text-[11px] font-mono shadow-xl border border-white/10 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap flex items-center space-x-1.5 ${
                copied
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-1 pointer-events-none"
              }`}
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Copied to clipboard!</span>
            </div>
          </div>

          {/* Logout / Switch Account Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all cursor-pointer"
            title="Log out or switch account"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Viewport (padded at bottom on mobile to accommodate fixed bottom bar) */}
      <div
        className={`flex-1 flex flex-col min-h-0 ${
          isSplitLayout
            ? "overflow-y-auto md:overflow-hidden pb-20 md:pb-0"
            : "overflow-y-auto custom-scrollbar pb-20 md:pb-12"
        }`}
      >
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on md:hidden mobile viewports) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0e0e10]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around h-16 px-2 shadow-2xl"
      >
        {NAV_TABS.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === "/studio/links" && pathname === "/studio");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-all ${
                isActive ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl mb-0.5 transition-all ${
                  isActive ? "bg-white/15 text-white shadow-xs" : "text-zinc-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span>{tab.name}</span>
            </Link>
          );
        })}

        <Link
          href="/"
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-all"
        >
          <div className="p-1.5 rounded-xl mb-0.5 text-zinc-400">
            <Home className="w-4 h-4" />
          </div>
          <span>Home</span>
        </Link>
      </nav>
    </div>
  );
}
