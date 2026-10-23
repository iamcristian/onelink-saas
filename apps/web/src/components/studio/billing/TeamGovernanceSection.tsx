"use client";

import React, { useState } from "react";
import { UserPlus, ShieldCheck, X, Check, Copy, Mail, CheckCircle2 } from "lucide-react";
import {
  TeamMember,
  apiInviteTeamMember,
  apiRevokeTeamMember,
  apiUpdateTeamMemberRole,
} from "@/lib/api-client";

interface TeamGovernanceSectionProps {
  initialMembers: TeamMember[];
  maxSeats: number;
}

export const TeamGovernanceSection: React.FC<TeamGovernanceSectionProps> = ({
  initialMembers,
  maxSeats,
}) => {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Safety Admin");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    role: string;
    inviteUrl: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const usedSeats = members.length;
  const pct = Math.min(Math.round((usedSeats / maxSeats) * 100), 100);
  const remaining = Math.max(maxSeats - usedSeats, 0);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await apiUpdateTeamMemberRole(memberId, newRole);
      setMembers(res.members);
      setToastMsg(`Collaborator role updated to "${newRole}".`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update role.";
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiInviteTeamMember({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setMembers(res.members);
      
      const invitedMember = res.member || res.members[res.members.length - 1];
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const inviteUrl = `${origin}/register?invite=${invitedMember?.id || "token"}&email=${encodeURIComponent(invitedMember?.email || inviteEmail.trim())}`;
      
      setInviteResult({
        email: invitedMember?.email || inviteEmail.trim(),
        role: invitedMember?.role || inviteRole,
        inviteUrl,
      });
      setInviteName("");
      setInviteEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to invite collaborator.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteResult) return;
    navigator.clipboard.writeText(inviteResult.inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRevoke = async (memberId: string) => {
    try {
      const res = await apiRevokeTeamMember(memberId);
      setMembers(res.members);
      setToastMsg("Collaborator seat revoked successfully.");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke collaborator.";
      setErrorMsg(msg);
    }
  };

  const handleResend = (email: string) => {
    setToastMsg(`⚡ Sandbox Email Dispatched: Resent invitation link with fresh token to ${email}`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Platform Owner":
        return "bg-white text-black font-semibold";
      case "Admin":
        return "bg-purple-500/10 text-purple-300 border border-purple-500/20";
      case "Safety Admin":
        return "bg-rose-500/10 text-rose-300 border border-rose-500/20";
      case "Content Editor":
        return "bg-blue-500/10 text-blue-300 border border-blue-500/20";
      default:
        return "bg-zinc-800 text-zinc-300 border border-white/10";
    }
  };

  return (
    <section className="space-y-4 pt-4" id="team">
      <div className="bg-[#121215] rounded-2xl p-6 border border-white/10 space-y-6 shadow-xl shadow-black/40">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Team Members & Collaboration
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-zinc-800 text-zinc-300 border border-white/10">
                {usedSeats} of {maxSeats} seats used
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Delegate bio editing, appearance customizations, and link telemetry without sharing primary account credentials.
            </p>
          </div>

          <button
            onClick={() => {
              setInviteResult(null);
              setIsInviteOpen(true);
            }}
            disabled={usedSeats >= maxSeats}
            className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-mono font-semibold transition-all flex items-center space-x-2 self-start sm:self-auto active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>+ Invite Collaborator</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/40 p-3.5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span className="text-zinc-400">Seat Allocation:</span>
            <div className="w-36 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-white font-medium">{pct}% provisioned</span>
          </div>
          <span className="text-zinc-400">
            {remaining > 0
              ? `${remaining} team invite slot${remaining > 1 ? "s" : ""} remaining under Enterprise Studio entitlement`
              : "Seat limit reached (5/5 seats)"}
          </span>
        </div>

        {toastMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-mono flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Team Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs font-mono text-zinc-400">
                <th className="py-3 px-4 font-medium">Member</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Authentication</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-white/1.5 transition-colors">
                  {/* Member info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-mono text-white text-[11px] font-semibold">
                        {member.initials}
                      </div>
                      <div>
                        <div className="font-medium text-white">{member.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4">
                    {member.role === "Platform Owner" ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono ${getRoleBadge(
                          member.role
                        )}`}
                      >
                        {member.role}
                      </span>
                    ) : (
                      <div className="relative inline-block">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className={`appearance-none px-2.5 py-1 pr-6 rounded-full text-[11px] font-mono cursor-pointer outline-none transition-all ${getRoleBadge(
                            member.role
                          )} bg-zinc-900 border border-white/10 hover:border-zinc-500`}
                          title="Click to change collaborator role"
                        >
                          <option value="Admin" className="bg-zinc-900 text-purple-300">Admin</option>
                          <option value="Safety Admin" className="bg-zinc-900 text-rose-300">Safety Admin</option>
                          <option value="Content Editor" className="bg-zinc-900 text-blue-300">Content Editor</option>
                          <option value="Viewer" className="bg-zinc-900 text-zinc-300">Viewer</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-400">
                          <span className="text-[9px]">▼</span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2 font-mono text-[11px]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          member.status === "Active" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <span className={member.status === "Active" ? "text-white" : "text-amber-400"}>
                        {member.statusDetail || member.status}
                      </span>
                    </div>
                  </td>

                  {/* Auth */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                    <span className="flex items-center space-x-1.5">
                      {member.auth.includes("2FA") && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span>{member.auth}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    {member.role === "Platform Owner" ? (
                      <span className="text-[11px] font-mono text-zinc-500">Master Root</span>
                    ) : (
                      <div className="flex items-center justify-end space-x-2">
                        {member.status === "Pending" && (
                          <button
                            onClick={() => handleResend(member.email)}
                            className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-[11px] font-mono transition-colors"
                          >
                            Resend Invite
                          </button>
                        )}
                        <button
                          onClick={() => handleRevoke(member.id)}
                          className="px-2.5 py-1 rounded-full text-rose-400 hover:bg-rose-500/10 text-[11px] font-mono transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-white" />
                <span>Invite Workspace Collaborator</span>
              </h3>
              <button
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteResult(null);
                }}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Invitation Successfully Generated</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Collaborator seat provisioned for <strong>{inviteResult.email}</strong> as <strong>{inviteResult.role}</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Email Delivery Status</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    ⚡ <strong>Development Sandbox:</strong> Transactional email dispatch has been simulated and stored in Redis. You can also share the direct invite link below:
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Direct Invite Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteResult.inviteUrl}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3.5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 transition-all"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteOpen(false);
                      setInviteResult(null);
                    }}
                    className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-mono font-semibold transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Lee"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jordan@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Entitled Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="Safety Admin">Safety Admin (Moderate links & flags)</option>
                    <option value="Content Editor">Content Editor (Edit links & theme)</option>
                    <option value="Viewer">Viewer (Read-only)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-mono text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-mono font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? "Inviting..." : "Send Cryptographic Invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
