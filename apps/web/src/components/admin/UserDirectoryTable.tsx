"use client";

import React, { useState } from "react";
import {
  Search,
  ShieldAlert,
  UserX,
  UserCheck,
  ExternalLink,
  Check,
  Lock,
} from "lucide-react";
import {
  AdminUserItem,
  CurrentUserSession,
  apiSuspendUser,
  apiUpdateUserRole,
} from "@/lib/api-client";

interface UserDirectoryTableProps {
  users: AdminUserItem[];
  currentUser?: CurrentUserSession | null;
  onRefresh: () => void;
}

export function UserDirectoryTable({
  users,
  currentUser,
  onRefresh,
}: UserDirectoryTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "BANNED" | "SUSPICIOUS">("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isOwner = currentUser?.role === "OWNER";

  const handleSuspendToggle = async (user: AdminUserItem) => {
    // Safety guard: Cannot suspend self
    if (user.id === currentUser?.id) {
      alert("You cannot suspend your own active account.");
      return;
    }

    // Safety guard: Super Admin cannot suspend an Owner
    if (user.role === "OWNER") {
      alert("Platform OWNER accounts are immune to suspension.");
      return;
    }

    // Safety guard: Only Owner can suspend a Super Admin
    if (user.role === "SUPER_ADMIN" && !isOwner) {
      alert("Only platform OWNER accounts can suspend a Super Admin.");
      return;
    }

    const isBanning = !user.isBanned;
    const confirmMsg = isBanning
      ? `Are you sure you want to suspend user ${user.email}? Their public links and vanity profile will be deactivated immediately.`
      : `Reactivate account access for ${user.email}?`;

    if (!window.confirm(confirmMsg)) return;

    setProcessingId(user.id);
    try {
      const ok = await apiSuspendUser(
        user.id,
        isBanning,
        isBanning
          ? `Account suspended by ${currentUser?.role || "Admin"} due to policy review`
          : `Account reinstated by ${currentUser?.role || "Admin"}`
      );
      if (ok) {
        setActionNotice(
          isBanning
            ? `User ${user.email} suspended and public bio unpublished.`
            : `User ${user.email} reactivated successfully.`
        );
        setTimeout(() => setActionNotice(null), 3500);
        onRefresh();
      } else {
        alert("Failed to update user account status. Please verify permissions.");
      }
    } catch {
      alert("Network error updating user status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (
    targetUser: AdminUserItem,
    newRole: "CREATOR" | "SUPER_ADMIN" | "OWNER"
  ) => {
    if (targetUser.id === currentUser?.id && newRole !== "OWNER") {
      const confirmDemote = window.confirm(
        "Warning: Demoting your own active account will revoke your current administrator privileges. Proceed?"
      );
      if (!confirmDemote) return;
    }

    if (targetUser.role === "OWNER" && !isOwner) {
      alert("Only an existing Platform OWNER can modify another OWNER account.");
      return;
    }

    if (targetUser.role === "SUPER_ADMIN" && !isOwner) {
      alert("Only a Platform OWNER can modify a Super Admin role.");
      return;
    }

    setProcessingId(targetUser.id);
    try {
      const ok = await apiUpdateUserRole(targetUser.id, newRole);
      if (ok) {
        setActionNotice(`Platform role for ${targetUser.email} changed to ${newRole}.`);
        setTimeout(() => setActionNotice(null), 3500);
        onRefresh();
      } else {
        alert("Failed to update role. Please check administrator permissions.");
      }
    } catch {
      alert("Network error updating platform role.");
    } finally {
      setProcessingId(null);
    }
  };

  // Filter and search
  const filteredUsers = users.filter((u) => {
    if (filter === "ACTIVE" && u.isBanned) return false;
    if (filter === "BANNED" && !u.isBanned) return false;
    if (filter === "SUSPICIOUS" && u.threatCount === 0) return false;

    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-purple-400" />
            <span>{actionNotice}</span>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[#121215] border border-white/5">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name or vanity handle..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACTIVE", "BANNED", "SUSPICIOUS"] as const).map((tab) => {
            const count =
              tab === "ALL"
                ? users.length
                : tab === "ACTIVE"
                ? users.filter((u) => !u.isBanned).length
                : tab === "BANNED"
                ? users.filter((u) => u.isBanned).length
                : users.filter((u) => u.threatCount > 0).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                  filter === tab
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="rounded-xl border border-white/5 bg-[#121215] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-950/60 font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">User / Creator</th>
                <th className="py-3 px-4">Platform Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Links</th>
                <th className="py-3 px-4">Threat Flags</th>
                <th className="py-3 px-4 text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 font-mono">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-sm font-semibold text-zinc-300">
                        {users.length === 0
                          ? "No users returned from server."
                          : "No users matching the active filter or search query."}
                      </p>
                      {users.length === 0 && (
                        <p className="text-xs text-zinc-500 font-sans">
                          Make sure you are signed in with an authorized account (cris@onelink.bio or admin@onelink.bio).
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={onRefresh}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-xs font-mono transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        Reload User Directory
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isProcessing = processingId === user.id;
                  const isSuspicious = user.threatCount > 0;
                  const isSelf = user.id === currentUser?.id;
                  const isTargetOwner = user.role === "OWNER";
                  const isTargetSuperAdmin = user.role === "SUPER_ADMIN";

                  // Permissions matrix:
                  // - OWNER can change anyone's role (including Super Admin to Creator or promote to Super Admin)
                  // - SUPER_ADMIN can only change CREATOR roles, cannot demote/change OWNER or other SUPER_ADMIN
                  const canEditRole = isOwner ? !isSelf : !isTargetOwner && !isTargetSuperAdmin;

                  // Suspend permission:
                  // - Nobody can suspend an OWNER
                  // - Nobody can suspend self
                  // - Only OWNER can suspend a SUPER_ADMIN
                  // - SUPER_ADMIN can suspend CREATORs
                  const canSuspend =
                    !isSelf &&
                    !isTargetOwner &&
                    (isOwner || !isTargetSuperAdmin);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-white/2 transition-colors ${
                        user.isBanned
                          ? "bg-rose-950/10"
                          : isSuspicious
                          ? "bg-amber-950/10"
                          : isTargetOwner
                          ? "bg-amber-500/3"
                          : ""
                      }`}
                    >
                      {/* Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3 min-w-50">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.avatarUrl}
                                alt={user.name || user.email}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">
                                {user.name?.charAt(0) || user.email.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-white truncate">
                                {user.name || "Unnamed"}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  YOU
                                </span>
                              )}
                              {user.username && (
                                <a
                                  href={`/${user.username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-zinc-500 hover:text-purple-300 transition-colors inline-flex items-center"
                                  title="View public profile"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-400 truncate">
                              {user.email}
                            </div>
                            {user.username && (
                              <div className="text-[10px] font-mono text-purple-400">
                                @{user.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Selector */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {canEditRole ? (
                          <select
                            value={user.role}
                            disabled={isProcessing}
                            onChange={(e) =>
                              handleRoleChange(
                                user,
                                e.target.value as "CREATOR" | "SUPER_ADMIN" | "OWNER"
                              )
                            }
                            className={`px-2 py-1 rounded text-[11px] font-mono font-semibold border transition-all cursor-pointer bg-zinc-950 ${
                              user.role === "OWNER"
                                ? "border-amber-500/40 text-amber-300"
                                : user.role === "SUPER_ADMIN"
                                ? "border-purple-500/40 text-purple-300"
                                : "border-white/10 text-zinc-300"
                            }`}
                          >
                            <option value="CREATOR">CREATOR</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            {isOwner && <option value="OWNER">OWNER</option>}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-semibold border ${
                              user.role === "OWNER"
                                ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                                : user.role === "SUPER_ADMIN"
                                ? "border-purple-500/40 text-purple-300 bg-purple-500/10"
                                : "border-white/10 text-zinc-400 bg-zinc-900"
                            }`}
                          >
                            <Lock className="w-3 h-3 text-zinc-500" />
                            {user.role}
                          </span>
                        )}
                      </td>

                      {/* Ban Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            SUSPENDED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Links Count */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <span className="text-zinc-300 font-medium">{user.linksCount}</span>
                        <span className="text-zinc-500 text-[10px] ml-1">links</span>
                      </td>

                      {/* Threat Flags */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.threatCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <ShieldAlert className="w-3 h-3" />
                            {user.threatCount} flag{user.threatCount > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px]">0 flags</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canSuspend ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleSuspendToggle(user)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer disabled:opacity-50 ${
                              user.isBanned
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                            }`}
                          >
                            {user.isBanned ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Suspend / Ban</span>
                              </>
                            )}
                          </button>
                        ) : isTargetOwner ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                            <Lock className="w-3 h-3 text-amber-500" />
                            Owner Protected
                          </span>
                        ) : isSelf ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-zinc-500 bg-white/5 border border-white/5 rounded-lg">
                            Active Session
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-zinc-500 bg-white/5 border border-white/5 rounded-lg">
                            <Lock className="w-3 h-3" />
                            Admin Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
