import { getApiBaseUrl } from "./api-config";
export { getApiBaseUrl };
const API_BASE_URL = {
  toString() {
    return getApiBaseUrl();
  },
};
/**
 * Gets the JWT Bearer token from localStorage for authenticated sessions.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("onelink_token");
}

/**
 * Confirm Stripe Checkout Session and activate subscription
 */
export async function apiConfirmCheckoutSession(
  sessionId: string
): Promise<{ success: boolean; planCode?: string }> {
  const token = await getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/confirm-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API not reachable
  }
  return { success: false };
}

export interface CurrentUserSession {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBanned: boolean;
  createdAt: string;
  profile: {
    id: string;
    username: string;
    title: string | null;
    bio: string | null;
    avatarUrl: string | null;
    isPublished: boolean;
    themeId: string | null;
  } | null;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    plan: {
      id: string;
      code: string;
      name: string;
      priceCents: number;
      interval: string;
    };
  }>;
}

/**
 * Fetch authenticated current user session and creator profile from /api/auth/me
 */
export async function fetchCurrentUser(): Promise<CurrentUserSession | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (res.ok) {
      return (await res.json()) as CurrentUserSession;
    }
  } catch {
    // API not reachable
  }

  return null;
}

/**
 * Clear session token from local storage
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("onelink_token");
  }
}

function authHeaders(token: string | null): Record<string, string> | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/**
 * Fetch full profile and links from API
 */
export async function fetchProfile(username: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profiles/${username}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return null on failure
  }
  return null;
}

/**
 * Fetch all links for a profile (both active and inactive) for Creator Studio
 */
export async function fetchProfileLinks(profileId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/links/profile/${profileId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return null on failure
  }
  return null;
}

/**
 * Create a new link attached to a profile
 */
export async function apiCreateLink(
  profileId: string,
  link: {
    title: string;
    url: string;
    type?: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
    badge?: string | null;
    thumbnailUrl?: string | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    isPasswordProtected?: boolean;
    password?: string | null;
    isAgeRestricted?: boolean;
  }
) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/links/profile/${profileId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(link),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const detail =
      err?.signals && Array.isArray(err.signals) && err.signals.length > 0
        ? ` (${err.signals[0]})`
        : "";
    throw new Error(err?.message ? `${err.message}${detail}` : "Failed to create link.");
  }

  return await res.json();
}

/**
 * Update an existing link (title, URL, isActive, scheduling, protection)
 */
export async function apiUpdateLink(
  linkId: string,
  profileId: string,
  updates: {
    title?: string;
    url?: string;
    isActive?: boolean;
    type?: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
    badge?: string | null;
    thumbnailUrl?: string | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    isPasswordProtected?: boolean;
    password?: string | null;
    isAgeRestricted?: boolean;
  }
) {
  const token = await getAuthToken();
  const res = await fetch(
    `${API_BASE_URL}/api/links/${linkId}/profile/${profileId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const detail =
      err?.signals && Array.isArray(err.signals) && err.signals.length > 0
        ? ` (${err.signals[0]})`
        : "";
    throw new Error(err?.message ? `${err.message}${detail}` : "Failed to update link.");
  }

  return await res.json();
}

/**
 * Unlock a password/PIN protected link
 */
export async function apiUnlockLink(linkId: string, passwordAttempt: string) {
  const res = await fetch(`${API_BASE_URL}/api/links/${linkId}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: passwordAttempt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Incorrect PIN or password.");
  }

  return (await res.json()) as { success: boolean; url: string };
}

/**
 * Delete a link and compact positions
 */
export async function apiDeleteLink(linkId: string, profileId: string) {
  const token = await getAuthToken();
  const res = await fetch(
    `${API_BASE_URL}/api/links/${linkId}/profile/${profileId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  );

  return res.ok;
}

/**
 * Atomically reorder links
 */
export async function apiReorderLinks(profileId: string, linkIds: string[]) {
  const token = await getAuthToken();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const items = linkIds
    .filter((id) => uuidRegex.test(id))
    .map((id, index) => ({ id, position: index }));

  if (items.length === 0) return true;

  const res = await fetch(
    `${API_BASE_URL}/api/links/profile/${profileId}/reorder`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    }
  );

  return res.ok;
}

/**
 * Save custom theme variables (background, button styles, typography)
 */
export async function apiSaveCustomTheme(
  profileId: string,
  themeData: {
    bgType: "SOLID" | "GRADIENT" | "IMAGE";
    bgValue: string;
    btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED";
    btnColor: string;
    btnTextColor: string;
    textColor: string;
    btnRadius: number;
    fontFamily: string;
  }
) {
  const token = await getAuthToken();
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/${profileId}/custom-theme`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(themeData),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to save custom theme.");
  }

  return await res.json();
}

export interface UpdateProfilePayload {
  username?: string;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isPublished?: boolean;
  seoTitle?: string | null;
  seoDesc?: string | null;
  themeId?: string | null;
}

/**
 * Check if a vanity username handle is available in real time
 */
export async function apiCheckUsername(
  username: string
): Promise<{ available: boolean; username: string; reason?: string }> {
  try {
    const clean = (username || '').replace(/^@/, '').toLowerCase().trim();
    if (!clean) return { available: false, username: '', reason: 'Username is required' };
    const res = await fetch(`${API_BASE_URL}/api/profiles/check-username/${encodeURIComponent(clean)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API failure fallback
  }
  return { available: false, username, reason: 'Unable to check availability' };
}

/**
 * Update profile identity (username, title, bio, avatar, SEO, publication)
 */
export async function apiUpdateProfile(
  profileId: string,
  data: UpdateProfilePayload
) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/profiles/${profileId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to update profile");
  }

  return true;
}

export interface AnalyticsData {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalViews: number;
    viewsGrowth: number;
    totalClicks: number;
    clicksGrowth: number;
    ctr: number;
    activeLinksCount: number;
  };
  timeSeries: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;
  topLinks: Array<{
    id: string;
    title: string;
    url: string | null;
    clicks: number;
    ctr: number;
  }>;
  trafficSources: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  deviceBreakdown: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  osBreakdown: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Fetch aggregated creator analytics from API
 */
export async function fetchProfileAnalytics(
  profileId: string,
  days = 30
): Promise<AnalyticsData | null> {
  const token = await getAuthToken();
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/analytics/profile/${profileId}?days=${days}`,
      {
        headers: authHeaders(token),
        cache: "no-store",
      }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // API not reachable
  }
  return null;
}

// ============================================================================
// Sentinel AI & Super Admin Moderation Types & Client APIs
// ============================================================================

export interface SentinelTelemetry {
  status: string;
  mode: string;
  latencySlaMs: number;
  layersActive: string[];
  totalFlagsRecorded: number;
  breakdown: Array<{ status: string; _count: { id: number } }>;
}

export interface SecurityThreatItem {
  id: string;
  userId: string;
  submittedUrl: string;
  riskScore: number;
  threatType: "PHISHING" | "MALWARE" | "CRYPTO_DRAINER" | "SPAM";
  aiConfidence: number;
  ipAddress: string | null;
  status: "BLOCKED_AUTO" | "PENDING_REVIEW" | "RESOLVED_BENIGN" | "BANNED";
  resolutionNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    isBanned: boolean;
    profile?: {
      username: string;
      title: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface DomainBlocklistItem {
  id: string;
  domainPattern: string;
  reason: string;
  createdAt: string;
  addedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface AdminAuditLogItem {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  adminUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export interface SentinelEvaluationResult {
  url: string;
  isSafe: boolean;
  action: "ALLOW" | "FLAG" | "BLOCK";
  riskScore: number;
  confidence: number;
  threatType: "PHISHING" | "MALWARE" | "CRYPTO_DRAINER" | "SPAM" | null;
  reasons: string[];
  latencyMs: number;
  features?: Record<string, unknown>;
}

/**
 * Gets JWT for Super Admin operations from localStorage.
 */
export async function getAdminAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("onelink_admin_token") || localStorage.getItem("onelink_token");
}

/**
 * Fetch Sentinel Engine Telemetry
 */
export async function fetchSentinelTelemetry(): Promise<SentinelTelemetry | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sentinel/telemetry`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fail gracefully
  }
  return null;
}

/**
 * Fetch recent threats detected by Sentinel AI
 */
export async function fetchSecurityThreats(limit = 50): Promise<SecurityThreatItem[]> {
  const token = await getAdminAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/security/threats?limit=${limit}`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return empty on failure
  }
  return [];
}

/**
 * Test & evaluate an arbitrary URL in real-time with the local ONNX model
 */
export async function evaluateUrlWithSentinel(url: string): Promise<SentinelEvaluationResult | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sentinel/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fail gracefully
  }
  return null;
}

/**
 * Update the status of a SecurityFlag (e.g. resolve false positive or ban)
 */
export async function apiUpdateThreatStatus(
  flagId: string,
  status: string,
  notes?: string
): Promise<boolean> {
  const token = await getAdminAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/security/threats/${flagId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status, notes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch list of active domain blocklists
 */
export async function fetchDomainBlocklist(): Promise<DomainBlocklistItem[]> {
  const token = await getAdminAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/security/blocklist`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return empty
  }
  return [];
}

/**
 * Add a domain pattern to global blocklist
 */
export async function apiAddDomainBlocklist(
  domainPattern: string,
  reason: string
): Promise<boolean> {
  const token = await getAdminAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/security/blocklist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ domainPattern, reason }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Remove a domain pattern from global blocklist
 */
export async function apiRemoveDomainBlocklist(id: string): Promise<boolean> {
  const token = await getAdminAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/security/blocklist/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Suspend or reinstate a creator user account
 */
export async function apiSuspendUser(
  userId: string,
  isBanned: boolean,
  reason: string
): Promise<boolean> {
  const token = await getAdminAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/security/users/${userId}/suspend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ isBanned, reason }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch admin audit log entries
 */
export async function fetchAdminAuditLogs(limit = 30): Promise<AdminAuditLogItem[]> {
  const token = await getAdminAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/security/audit-logs?limit=${limit}`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return empty
  }
  return [];
}

// ============================================================================
// Billing & Subscriptions API (Screen 6)
// ============================================================================

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  interval: "MONTHLY" | "YEARLY";
  features: {
    maxLinks?: number;
    customDomains?: boolean;
    removeBranding?: boolean;
    customThemes?: boolean;
    sentinelAiPro?: boolean;
    teamSeats?: number;
    analyticsRetentionDays?: number;
    [key: string]: unknown;
  };
  isActive?: boolean;
}

export interface BillingSubscription {
  id: string;
  userId: string;
  planId: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: BillingPlan;
}

export interface BillingInvoice {
  id: string;
  number: string;
  amountCents: number;
  currency: string;
  status: string;
  date: string;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  planName?: string;
}

export interface BillingMetrics {
  mrr: number;
  mrrGrowthMoM: number;
  netNewMrr: number;
  arr: number;
  arrTarget: number;
  arrTargetProgress: number;
  paidSubscriptions: number;
  netChurn: number;
  conversionRate: number;
  totalUsers: number;
  arpu: number;
  arpuGrowthQoQ: number;
  ltvEst: number;
}

export interface BillingEvent {
  id: string;
  type: string;
  tier: string;
  amount: string;
  handle: string;
  timestamp: string;
  status: "Paid" | "Active" | "Refunded" | "Pending";
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending";
  statusDetail?: string;
  auth: string;
  initials: string;
}

export interface TeamResponse {
  success?: boolean;
  member?: TeamMember;
  members: TeamMember[];
  maxSeats: number;
  usedSeats: number;
}

/**
 * Fetch subscription plans catalog
 */
export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/plans`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {
    // Return fallback
  }
  return [
    {
      id: "plan_free",
      code: "FREE",
      name: "Free Plan",
      priceCents: 0,
      interval: "MONTHLY",
      features: { maxLinks: 5, removeBranding: false, analyticsRetentionDays: 7 },
    },
    {
      id: "plan_pro",
      code: "PRO",
      name: "Creator Pro",
      priceCents: 200,
      interval: "MONTHLY",
      features: { maxLinks: 9999, removeBranding: true, customThemes: true, analyticsRetentionDays: 90 },
    },
    {
      id: "plan_ent",
      code: "ENTERPRISE",
      name: "Enterprise Studio",
      priceCents: 500,
      interval: "MONTHLY",
      features: { maxLinks: 9999, customDomains: true, removeBranding: true, customThemes: true, sentinelAiPro: true, teamSeats: 5, analyticsRetentionDays: 365 },
    },
  ];
}

/**
 * Fetch current creator subscription
 */
export async function fetchMySubscription(): Promise<BillingSubscription | null> {
  const token = await getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/subscription/me`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch {
    // Return null
  }
  return null;
}

/**
 * Fetch founder financial KPIs
 */
export async function fetchBillingMetrics(): Promise<BillingMetrics> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/metrics`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {
    // Return fallback
  }
  return {
    mrr: 18450.0,
    mrrGrowthMoM: 24.6,
    netNewMrr: 3640.0,
    arr: 221400.0,
    arrTarget: 250000.0,
    arrTargetProgress: 88.5,
    paidSubscriptions: 1520,
    netChurn: 0.8,
    conversionRate: 4.8,
    totalUsers: 31400,
    arpu: 12.14,
    arpuGrowthQoQ: 11.2,
    ltvEst: 340.0,
  };
}

/**
 * Initiate checkout session (real Stripe or simulated instant upgrade)
 */
export async function apiCreateCheckoutSession(
  planCode: string,
  interval: "MONTHLY" | "YEARLY" = "MONTHLY"
): Promise<{ url: string; simulated?: boolean }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/billing/create-checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ planCode, interval }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to initiate checkout session");
  }

  return await res.json();
}

/**
 * Create customer billing portal session
 */
export async function apiCreatePortalSession(): Promise<{ url: string; simulated?: boolean }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/billing/create-portal-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to initiate portal session");
  }

  return await res.json();
}

/**
 * Fetch official billing invoices and downloadable PDF tax receipts
 */
export async function fetchInvoices(): Promise<BillingInvoice[]> {
  const token = await getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/invoices`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch {
    // Return empty on network error
  }
  return [];
}

/**
 * Fetch live Stripe event ledger
 */
export async function fetchBillingEvents(): Promise<BillingEvent[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/events`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {
    // Return empty
  }
  return [];
}

/**
 * Fetch team members and seat allocation
 */
export async function fetchTeamMembers(): Promise<TeamResponse> {
  const token = await getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/team`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch {
    // Return fallback
  }
  return {
    members: [],
    maxSeats: 5,
    usedSeats: 0,
  };
}

/**
 * Invite a collaborator to the workspace
 */
export async function apiInviteTeamMember(data: {
  email: string;
  name: string;
  role: string;
}): Promise<TeamResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/billing/team/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to invite collaborator");
  }

  return await res.json();
}

/**
 * Revoke collaborator access
 */
export async function apiRevokeTeamMember(memberId: string): Promise<TeamResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/billing/team/${memberId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to revoke collaborator");
  }

  return await res.json();
}

/**
 * Update a collaborator's role with hierarchy enforcement
 */
export async function apiUpdateTeamMemberRole(memberId: string, role: string): Promise<TeamResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/billing/team/${memberId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to update collaborator role");
  }

  return await res.json();
}

export interface WorkspaceCollaboration {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerUsername: string;
  ownerProfileId: string;
  ownerAvatarUrl?: string | null;
  ownerPlan: string;
  role: string;
  email: string;
  name: string;
  status: "Active" | "Pending";
  statusDetail?: string;
  createdAt: string;
}

/**
 * Fetch workspaces where the current user is an invitee or collaborator
 */
export async function apiGetCollaborations(): Promise<WorkspaceCollaboration[]> {
  const token = await getAuthToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/collaborations`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch {
    // Return empty list
  }
  return [];
}

/**
 * Accept an invitation to collaborate on an Enterprise workspace
 */
export async function apiAcceptCollaboration(
  memberId: string
): Promise<{ success: boolean; collaboration: WorkspaceCollaboration }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/billing/collaborations/accept/${memberId}`, {
    method: "POST",
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to accept collaboration");
  }

  return await res.json();
}

/**
 * Decline an invitation to collaborate on a workspace
 */
export async function apiDeclineCollaboration(
  memberId: string
): Promise<{ success: boolean }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/billing/collaborations/decline/${memberId}`, {
    method: "POST",
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || "Failed to decline collaboration");
  }

  return await res.json();
}

