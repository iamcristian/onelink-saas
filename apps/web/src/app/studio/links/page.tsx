"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Heading, Minus, Sparkles, ArrowUpDown, Lock, Coffee, X, CheckCircle2, Sliders, Eye, StickyNote } from "lucide-react";
import { LinkCard, StudioLinkItem } from "@/components/studio/LinkCard";
import { AddEditLinkModal } from "@/components/studio/AddEditLinkModal";
import { PhonePreview, PhonePreviewTheme } from "@/components/studio/PhonePreview";

import {
  fetchProfile,
  fetchCurrentUser,
  fetchMyProfile,
  fetchProfileLinks,
  fetchMySubscription,
  BillingSubscription,
  apiCreateLink,
  apiUpdateLink,
  apiDeleteLink,
  apiReorderLinks,
} from "@/lib/api-client";

export default function StudioLinksPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string>("");
  const [items, setItems] = useState<StudioLinkItem[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StudioLinkItem | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<
    "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE"
  >("LINK");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80");
  const [activeTheme, setActiveTheme] = useState<PhonePreviewTheme | null>(null);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  // Auto-archive configuration state
  const [isAutoArchiveModalOpen, setIsAutoArchiveModalOpen] = useState(false);
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(true);
  const [autoArchiveThresholdDays, setAutoArchiveThresholdDays] = useState(30);
  const [autoArchiveMinClicks, setAutoArchiveMinClicks] = useState(1);
  const [archiveFeedback, setArchiveFeedback] = useState<string | null>(null);
  const [isArchivingNow, setIsArchivingNow] = useState(false);

  // Load from backend API on mount, with graceful local fallback
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [userSession, sub] = await Promise.all([
          fetchCurrentUser(),
          fetchMySubscription(),
        ]);
        if (sub && isMounted) {
          setSubscription(sub);
        }

        let targetProfileId = "";
        let targetUsername = "";

        // Check if user selected an active workspace
        const activeWs = localStorage.getItem("onelink_active_workspace");
        if (activeWs) {
          try {
            const parsedWs = JSON.parse(activeWs);
            if (parsedWs.ownerProfileId && parsedWs.ownerUsername) {
              targetProfileId = parsedWs.ownerProfileId;
              targetUsername = parsedWs.ownerUsername;
              setSubscription({
                id: `sub_${parsedWs.ownerUserId}`,
                userId: parsedWs.ownerUserId,
                planId: "plan_enterprise",
                status: "ACTIVE",
                stripeCustomerId: null,
                stripeSubscriptionId: null,
                currentPeriodEnd: null,
                plan: {
                  id: "plan_enterprise",
                  name: "Enterprise Studio",
                  code: parsedWs.ownerPlan || "ENTERPRISE",
                  priceCents: 19900,
                  interval: "MONTHLY",
                  features: { maxLinks: 9999, customDomains: true, removeBranding: true, customThemes: true },
                },
              });
            }
          } catch {
            // Ignore
          }
        } else if (userSession?.profile?.id) {
          targetProfileId = userSession.profile.id;
          targetUsername = userSession.profile.username;
        }

        if (!targetProfileId || !targetUsername) {
          if (isMounted) {
            router.push("/login");
          }
          return;
        }

        if (isMounted) {
          setProfileId(targetProfileId);
          setProfileUsername(targetUsername);
        }

        // Fetch full profile to retrieve active/custom theme and metadata
        const fullProfile =
          (!activeWs ? await fetchMyProfile() : null) ||
          (await fetchProfile(targetUsername));
        if (fullProfile && isMounted) {
          if (fullProfile.id) setProfileId(fullProfile.id);
          setProfileUsername(fullProfile.username);
          setProfileDisplayName(
            fullProfile.title || fullProfile.username
          );
          if (fullProfile.bio) setProfileBio(fullProfile.bio);
          if (fullProfile.avatarUrl?.trim()) setProfileAvatarUrl(fullProfile.avatarUrl.trim());

          const resolvedTheme = fullProfile.customTheme || fullProfile.theme;
          if (resolvedTheme) {
            setActiveTheme({
              bgType: resolvedTheme.bgType,
              bgValue: resolvedTheme.bgValue,
              btnStyle: resolvedTheme.btnStyle,
              btnColor: resolvedTheme.btnColor,
              btnTextColor: resolvedTheme.btnTextColor,
              textColor: resolvedTheme.textColor,
              btnRadius: typeof resolvedTheme.btnRadius === "number" ? resolvedTheme.btnRadius : 9999,
              fontFamily: resolvedTheme.fontFamily,
            });
          }
        }

        // Fallback to locally saved appearance if activeTheme wasn't set from database
        try {
          const workspaceKey = targetUsername ? `onelink_studio_appearance_${targetUsername}` : null;
          const savedTheme = workspaceKey ? localStorage.getItem(workspaceKey) : null;
          if (savedTheme && isMounted) {
            const p = JSON.parse(savedTheme);
            if (p.bgValue || p.btnColor) {
              setActiveTheme((current) => current || {
                bgType: p.bgType || "SOLID",
                bgValue: p.bgValue || "#09090b",
                btnStyle: p.btnStyle || "FILLED",
                btnColor: p.btnColor || "#18181b",
                btnTextColor: p.btnTextColor || "#fafafa",
                textColor: p.textColor || "#fafafa",
                btnRadius: typeof p.btnRadius === "number" ? p.btnRadius : 9999,
                fontFamily: p.fontFamily || "Geist",
              });
            }
          }
        } catch {
          // Ignore
        }

        // Fetch all studio links (both active and inactive) directly
        const allLinks = await fetchProfileLinks(targetProfileId);
        if (Array.isArray(allLinks) && isMounted) {
          interface ApiLinkItem {
            id: string;
            title: string;
            url?: string | null;
            type: "LINK" | "HEADER" | "DIVIDER" | "DONATION";
            position: number;
            thumbnailUrl?: string | null;
            badge?: string | null;
            isActive?: boolean;
            clickCount?: number;
            startsAt?: string | null;
            expiresAt?: string | null;
            isPasswordProtected?: boolean;
            isAgeRestricted?: boolean;
          }
          const mapped: StudioLinkItem[] = allLinks.map((l: ApiLinkItem) => ({
            id: l.id,
            title: l.title,
            url: l.url || "#",
            type: l.type,
            thumbnailUrl: l.thumbnailUrl,
            badge: l.badge || undefined,
            isActive: l.isActive !== false,
            clicks: typeof l.clickCount === "number" ? l.clickCount : 0,
            position: l.position,
            startsAt: l.startsAt,
            expiresAt: l.expiresAt,
            isPasswordProtected: l.isPasswordProtected,
            isAgeRestricted: l.isAgeRestricted,
          }));
          setItems(mapped);
          return;
        }
      } catch {
        // API not reachable, try localStorage
      }

      try {
        const saved = localStorage.getItem("onelink_studio_items");
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        }
      } catch {
        // Ignore
      }

      // Load automation preferences
      try {
        const storedAuto = localStorage.getItem("onelink_auto_archive_config");
        if (storedAuto && isMounted) {
          const parsed = JSON.parse(storedAuto);
          if (typeof parsed.enabled === "boolean") setAutoArchiveEnabled(parsed.enabled);
          if (typeof parsed.days === "number") setAutoArchiveThresholdDays(parsed.days);
          if (typeof parsed.minClicks === "number") setAutoArchiveMinClicks(parsed.minClicks);
        }
      } catch {
        // Ignore
      }
    };

    const handleWorkspaceChanged = () => {
      loadData();
    };
    window.addEventListener("workspace_changed", handleWorkspaceChanged);

    const timer = setTimeout(loadData, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener("workspace_changed", handleWorkspaceChanged);
    };
  }, [router]);

  // Save to localStorage whenever items change
  const updateItems = (newItems: StudioLinkItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem("onelink_studio_items", JSON.stringify(newItems));
    } catch {
      // Ignore
    }
  };

  // Run auto-archive scan immediately on active destination links
  const handleRunAutoArchive = async () => {
    setIsArchivingNow(true);
    try {
      const eligibleToArchive = items.filter(
        (it) => it.isActive && (it.type === "LINK" || !it.type) && (it.clicks ?? 0) < autoArchiveMinClicks
      );

      if (eligibleToArchive.length === 0) {
        setArchiveFeedback("All active links meet performance thresholds! No links needed archiving.");
        setTimeout(() => setArchiveFeedback(null), 4000);
        return;
      }

      const updated = items.map((it) => {
        if (it.isActive && (it.type === "LINK" || !it.type) && (it.clicks ?? 0) < autoArchiveMinClicks) {
          return { ...it, isActive: false };
        }
        return it;
      });

      updateItems(updated);

      await Promise.all(
        eligibleToArchive.map((it) => apiUpdateLink(it.id, profileId, { isActive: false }).catch(() => {}))
      );

      setArchiveFeedback(
        `Archived ${eligibleToArchive.length} low-performing link${eligibleToArchive.length > 1 ? "s" : ""} automatically.`
      );
      setTimeout(() => setArchiveFeedback(null), 4000);
    } finally {
      setIsArchivingNow(false);
    }
  };

  // Save auto-archive preferences
  const handleSaveAutoArchiveConfig = () => {
    try {
      localStorage.setItem(
        "onelink_auto_archive_config",
        JSON.stringify({
          enabled: autoArchiveEnabled,
          days: autoArchiveThresholdDays,
          minClicks: autoArchiveMinClicks,
        })
      );
    } catch {
      // Ignore
    }
    setArchiveFeedback("Automation settings saved successfully.");
    setTimeout(() => {
      setArchiveFeedback(null);
      setIsAutoArchiveModalOpen(false);
    }, 1200);
  };

  // Toggle active state with database mutation
  const handleToggleActive = async (id: string) => {
    const targetItem = items.find((i) => i.id === id);
    const newActiveState = targetItem ? !targetItem.isActive : true;

    // If turning off while filtering by "active", switch to "all" so the card doesn't disappear from view
    if (!newActiveState && filter === "active") {
      setFilter("all");
    }

    const updated = items.map((item) =>
      item.id === id ? { ...item, isActive: newActiveState } : item
    );
    updateItems(updated);

    try {
      await apiUpdateLink(id, profileId, { isActive: newActiveState });
    } catch {
      // Optimistic update retained
    }
  };

  // Duplicate item
  const handleDuplicate = async (item: StudioLinkItem) => {
    const tempId = `temp-${Date.now()}`;
    const newItem: StudioLinkItem = {
      ...item,
      id: tempId,
      title: `${item.title} (Copy)`,
      clicks: 0,
      position: item.position + 1,
    };
    const updated = [...items];
    const targetIdx = items.findIndex((i) => i.id === item.id);
    updated.splice(targetIdx + 1, 0, newItem);
    const reindexed = updated.map((it, idx) => ({ ...it, position: idx }));
    updateItems(reindexed);

    try {
      const created = await apiCreateLink(profileId, {
        title: newItem.title,
        url: newItem.url,
        type: newItem.type,
      });
      if (created?.id) {
        setItems((prev) =>
          prev.map((it) => (it.id === tempId ? { ...it, id: created.id } : it))
        );
      }
    } catch {
      // Retain optimistic
    }
  };

  // Delete item with database mutation
  const handleDelete = async (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    const reindexed = updated.map((it, idx) => ({ ...it, position: idx }));
    updateItems(reindexed);

    try {
      await apiDeleteLink(id, profileId);
    } catch {
      // Retain optimistic
    }
  };

  // Open modal for new item
  const handleOpenAdd = (type: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE") => {
    setEditingItem(null);
    setModalDefaultType(type);
    setModalOpen(true);
  };

  // Open modal for editing item
  const handleEdit = (item: StudioLinkItem) => {
    setEditingItem(item);
    setModalDefaultType(item.type);
    setModalOpen(true);
  };

  // Save from modal (Create or Update)
  const handleSaveModal = async (
    data: Omit<StudioLinkItem, "position" | "clicks" | "id"> & { id?: string }
  ) => {
    let activeProfileId = profileId;
    if (!activeProfileId) {
      try {
        const userSession = await fetchCurrentUser();
        if (userSession?.profile?.id) {
          activeProfileId = userSession.profile.id;
          setProfileId(activeProfileId);
        }
      } catch {
        // Ignore
      }
    }

    if (!activeProfileId) {
      alert("Profile ID not found. Please reload or log in again.");
      return;
    }

    if (data.id) {
      // Edit existing link
      await apiUpdateLink(data.id, activeProfileId, {
        title: data.title,
        url: data.url,
        type: data.type,
        thumbnailUrl: data.thumbnailUrl,
        badge: data.badge,
        isActive: data.isActive,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
        isPasswordProtected: data.isPasswordProtected,
        password: data.password,
        isAgeRestricted: data.isAgeRestricted,
      });

      const updated = items.map((it) =>
        it.id === data.id
          ? {
              ...it,
              title: data.title,
              url: data.url,
              type: data.type,
              thumbnailUrl: data.thumbnailUrl,
              isActive: data.isActive,
              badge: data.badge,
              startsAt: data.startsAt,
              expiresAt: data.expiresAt,
              isPasswordProtected: data.isPasswordProtected,
              password: data.password,
              isAgeRestricted: data.isAgeRestricted,
            }
          : it
      );
      updateItems(updated);
    } else {
      // Create new link
      const created = await apiCreateLink(activeProfileId, {
        title: data.title,
        url: data.url,
        type: data.type,
        thumbnailUrl: data.thumbnailUrl,
        badge: data.badge,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
        isPasswordProtected: data.isPasswordProtected,
        password: data.password,
        isAgeRestricted: data.isAgeRestricted,
      });

      const newItem: StudioLinkItem = {
        id: created.id,
        title: created.title || data.title,
        url: created.url || data.url,
        type: (created.type as StudioLinkItem["type"]) || data.type,
        thumbnailUrl: created.thumbnailUrl || data.thumbnailUrl,
        isActive: created.isActive ?? data.isActive ?? true,
        badge: data.badge,
        clicks: Number(created.clickCount || 0),
        position: 0,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
        isPasswordProtected: data.isPasswordProtected,
        password: data.password,
        isAgeRestricted: data.isAgeRestricted,
      };

      const updated = [newItem, ...items].map((it, idx) => ({ ...it, position: idx }));
      updateItems(updated);
    }
  };

  // Move up/down
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((it, idx) => ({ ...it, position: idx }));
    updateItems(reordered);
    apiReorderLinks(
      profileId,
      reordered.map((it) => it.id)
    ).catch(() => {});
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    const reordered = updated.map((it, idx) => ({ ...it, position: idx }));
    updateItems(reordered);
    apiReorderLinks(
      profileId,
      reordered.map((it) => it.id)
    ).catch(() => {});
  };

  // Native HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setItems(newItems.map((it, idx) => ({ ...it, position: idx })));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
    updateItems(items);
    apiReorderLinks(
      profileId,
      items.map((it) => it.id)
    ).catch(() => {});
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter === "active") return item.isActive;
    if (filter === "archived") return !item.isActive;
    return true;
  });

  const activeCount = items.filter((i) => i.isActive).length;
  const archivedCount = items.filter((i) => !i.isActive).length;
  const activeDestinationCount = items.filter(
    (i) => (i.type === "LINK" || i.type === "DONATION" || !i.type) && i.isActive
  ).length;
  const isFreeTier = !subscription || subscription.plan?.code === "FREE";
  const freeLimitReached = isFreeTier && activeDestinationCount >= 5;

  return (
    <main className="flex-1 w-full max-w-400 mx-auto flex flex-col lg:flex-row h-full min-h-0 overflow-hidden relative">
      {/* MOBILE SEGMENT CONTROLLER (< lg) */}
      <div className="lg:hidden flex items-center justify-center p-2.5 border-b border-white/5 bg-[#0e0e10]/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-white/10 w-full max-w-xs shadow-inner">
          <button
            type="button"
            onClick={() => setMobileTab("editor")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === "editor"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === "preview"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* LEFT 60% EDITING PANEL */}
      <section
        className={`${
          mobileTab === "editor" ? "flex" : "hidden"
        } lg:flex w-full lg:w-[60%] flex-col p-3.5 sm:p-8 lg:p-10 pb-24 sm:pb-8 h-full overflow-y-auto custom-scrollbar`}
      >
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
                Links &amp; Content
              </h1>
              {subscription && (
                <Link
                  href="/studio/billing"
                  className={`text-[11px] sm:text-xs font-mono font-medium px-2 sm:px-2.5 py-0.5 rounded-full border transition-all ${
                    subscription.plan?.code === "PRO" || subscription.plan?.code === "ENTERPRISE"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-zinc-800 text-zinc-300 border-white/10 hover:border-white/20"
                  }`}
                >
                  {subscription.plan?.code === "PRO" || subscription.plan?.code === "ENTERPRISE"
                    ? `⭐ ${subscription.plan.name} (Unlimited)`
                    : `Free Plan: ${activeDestinationCount}/5 active links`}
                </Link>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Drag, reorder and publish your bio links in real time
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-zinc-400 select-none">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
            <span>Drag handles or use arrows to reorder</span>
          </div>
        </div>

        {/* Subscription Plan Benefit & Quota Alert Banner */}
        {freeLimitReached && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-amber-200 shadow-md">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Free Plan Limit:</span>{" "}
                <span>
                  You have reached {activeDestinationCount} of 5 active destination links. Upgrade to <strong>Creator Pro ($2/mo)</strong> to unlock unlimited links, link scheduling, 0% tip fee, and custom theme styling.
                </span>
              </div>
            </div>
            <Link
              href="/studio/billing"
              className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 text-center shrink-0 shadow transition-all active:scale-95"
            >
              Upgrade to Pro ($2/mo)
            </Link>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Add Link */}
            <button
              onClick={() => handleOpenAdd("LINK")}
              className="inline-flex items-center space-x-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-3" />
              <span>Add Link</span>
            </button>

            {/* Add Header */}
            <button
              onClick={() => handleOpenAdd("HEADER")}
              className="inline-flex items-center space-x-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-zinc-500 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer"
            >
              <Heading className="w-3.5 h-3.5" />
              <span>Add Header</span>
            </button>

            {/* Add Divider */}
            <button
              onClick={() => handleOpenAdd("DIVIDER")}
              className="inline-flex items-center space-x-1.5 border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Add Divider</span>
            </button>

            {/* Add Coffee / Tip */}
            <button
              onClick={() => handleOpenAdd("DONATION")}
              className="inline-flex items-center space-x-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>+ Tip Block</span>
            </button>

            {/* Add Note / Announcement */}
            <button
              onClick={() => handleOpenAdd("NOTE")}
              className="inline-flex items-center space-x-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>+ Add Note</span>
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-full border border-white/5 text-xs font-medium">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full transition-all ${
                filter === "all"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-full transition-all ${
                filter === "active"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter("archived")}
              className={`px-3 py-1 rounded-full transition-all ${
                filter === "archived"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Disabled ({archivedCount})
            </button>
          </div>
        </div>

        {/* Links Stack */}
        <div className="flex flex-col space-y-3 mt-2">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl p-6">
              <p className="text-sm text-zinc-400 mb-2">No links found in this view.</p>
              <button
                onClick={() => handleOpenAdd("LINK")}
                className="text-xs text-white underline hover:text-zinc-300"
              >
                Create your first link
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <LinkCard
                key={item.id}
                item={item}
                index={items.findIndex((it) => it.id === item.id)}
                totalItems={items.length}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))
          )}
        </div>

        {/* Sentinel ML & Automation Tip Banner */}
        <div className="tactile-card mt-8 p-4 rounded-xl border border-white/5 bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-all">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Auto-archive low performing links
              </p>
              <p className="text-xs text-zinc-400">
                Optimizes profile conversion automatically after {autoArchiveThresholdDays} days of inactivity (&lt; {autoArchiveMinClicks} clicks).
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setArchiveFeedback(null);
              setIsAutoArchiveModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            Configure
          </button>
        </div>
      </section>

      {/* RIGHT 40% LIVE PHONE PREVIEW PANEL */}
      <PhonePreview
        items={items}
        username={profileUsername}
        displayName={profileDisplayName}
        bio={profileBio}
        avatarUrl={profileAvatarUrl}
        theme={activeTheme}
        className={mobileTab === "preview" ? "flex" : "hidden lg:flex"}
      />

      {/* Add / Edit Link Modal */}
      <AddEditLinkModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        initialItem={editingItem}
        defaultType={modalDefaultType}
        userPlanCode={subscription?.plan?.code || "FREE"}
      />

      {/* Auto-archive Configuration Modal */}
      {isAutoArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#121215] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Auto-archive Optimization</h3>
              </div>
              <button
                onClick={() => setIsAutoArchiveModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {archiveFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{archiveFeedback}</span>
              </div>
            )}

            <div className="space-y-4 text-xs font-mono">
              {/* Enable toggle */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Automatic Archiving</div>
                  <div className="text-[11px] text-zinc-400">Archive stale destination links automatically</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoArchiveEnabled(!autoArchiveEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    autoArchiveEnabled ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      autoArchiveEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Threshold Days */}
              <div>
                <label className="block text-zinc-400 mb-1.5">Inactivity Period</label>
                <select
                  value={autoArchiveThresholdDays}
                  onChange={(e) => setAutoArchiveThresholdDays(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-white/30"
                >
                  <option value={14}>14 days of low conversion</option>
                  <option value={30}>30 days (Recommended)</option>
                  <option value={60}>60 days of inactivity</option>
                  <option value={90}>90 days of inactivity</option>
                </select>
              </div>

              {/* Click count threshold */}
              <div>
                <label className="block text-zinc-400 mb-1.5">Click Threshold</label>
                <select
                  value={autoArchiveMinClicks}
                  onChange={(e) => setAutoArchiveMinClicks(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-white/30"
                >
                  <option value={1}>Fewer than 1 click (0 clicks total)</option>
                  <option value={5}>Fewer than 5 clicks</option>
                  <option value={10}>Fewer than 10 clicks</option>
                </select>
              </div>

              {/* Guardrails notice */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
                🛡️ <strong>Sentinel Guardrails:</strong> Headers, dividers, and tip donation blocks are permanently protected and will never be archived.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRunAutoArchive}
                disabled={isArchivingNow}
                className="px-3.5 py-2 rounded-full border border-zinc-700 bg-zinc-800 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-500 transition-all disabled:opacity-50"
              >
                {isArchivingNow ? "Scanning..." : "Scan & Archive Now"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAutoArchiveModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAutoArchiveConfig}
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-mono font-semibold transition-all shadow"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
