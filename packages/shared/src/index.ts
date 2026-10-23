import { z } from 'zod';

// ============================================================================
// Constants & Reserved Keywords
// ============================================================================

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'analytics',
  'api',
  'app',
  'appearance',
  'auth',
  'billing',
  'control',
  'dashboard',
  'dev',
  'docs',
  'explore',
  'graphql',
  'health',
  'help',
  'home',
  'legal',
  'links',
  'login',
  'logout',
  'mail',
  'moderation',
  'oauth',
  'onboarding',
  'pricing',
  'privacy',
  'profile',
  'register',
  'root',
  'security',
  'sentinel',
  'settings',
  'share',
  'signin',
  'signout',
  'signup',
  'status',
  'studio',
  'support',
  'system',
  'terms',
  'themes',
  'user',
  'webhook',
  'webhooks',
  'www',
] as const;

export const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

export const UsernameFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(USERNAME_REGEX, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
  .refine(
    (val) => !RESERVED_USERNAMES.includes(val as (typeof RESERVED_USERNAMES)[number]),
    { message: 'This username is reserved by the platform' }
  );

// ============================================================================
// Auth Schemas
// ============================================================================

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
  username: UsernameFieldSchema,
  name: z.string().min(1).max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// ============================================================================
// Profile Schemas
// ============================================================================

export const UpdateProfileSchema = z.object({
  username: UsernameFieldSchema.optional(),
  title: z.string().max(100, 'Title is too long').nullable().optional(),
  bio: z.string().max(500, 'Bio is too long').nullable().optional(),
  avatarUrl: z.string().max(2000, 'Avatar URL too long').nullable().optional(),
  themeId: z.string().uuid().nullable().optional(),
  isPublished: z.boolean().optional(),
  seoTitle: z.string().max(60).nullable().optional(),
  seoDesc: z.string().max(160).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ============================================================================
// Theme & Custom Theme Schemas
// ============================================================================

export const BgTypeEnum = z.enum(['SOLID', 'GRADIENT', 'IMAGE']);
export type BgType = z.infer<typeof BgTypeEnum>;

export const BtnStyleEnum = z.enum(['FILLED', 'OUTLINE', 'SHADOW', 'ROUNDED']);
export type BtnStyle = z.infer<typeof BtnStyleEnum>;

export const UpdateCustomThemeSchema = z.object({
  bgType: BgTypeEnum.default('SOLID'),
  bgValue: z.string().min(1, 'Background value is required'),
  btnStyle: BtnStyleEnum.default('FILLED'),
  btnColor: z.string().min(1, 'Button color is required'),
  btnTextColor: z.string().min(1, 'Button text color is required'),
  fontFamily: z.string().default('Inter'),
  textColor: z.string().default('#000000'),
  btnRadius: z.number().int().min(0).max(9999).default(8),
});

export type UpdateCustomThemeInput = z.infer<typeof UpdateCustomThemeSchema>;

// ============================================================================
// Social Links Schemas
// ============================================================================

export const SocialPlatformEnum = z.enum([
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE',
  'TWITTER',
  'FACEBOOK',
  'LINKEDIN',
  'GITHUB',
  'TWITCH',
  'DISCORD',
  'SPOTIFY',
  'APPLEMUSIC',
  'WEBSITE',
  'EMAIL',
]);
export type SocialPlatform = z.infer<typeof SocialPlatformEnum>;

export const CreateSocialLinkSchema = z.object({
  platform: SocialPlatformEnum,
  url: z.string().min(1, 'URL or account handle is required'),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const UpdateSocialLinkSchema = CreateSocialLinkSchema.partial();

export const ReorderSocialLinksSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

export type CreateSocialLinkInput = z.infer<typeof CreateSocialLinkSchema>;
export type UpdateSocialLinkInput = z.infer<typeof UpdateSocialLinkSchema>;
export type ReorderSocialLinksInput = z.infer<typeof ReorderSocialLinksSchema>;

// ============================================================================
// Link Schemas
// ============================================================================

export const LinkTypeEnum = z.enum(['LINK', 'HEADER', 'DIVIDER', 'DONATION', 'NOTE']);

/**
 * Validates whether a raw string represents a valid internet web URL with a legitimate domain.
 * Rejects bare text like "asdfasdf", strings without dots/TLDs, and invalid protocols.
 */
export function isValidWebUrl(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (trimmed === '#' || trimmed === '') return false;

  const withProto =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(withProto);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname;
    if (!host) return false;

    // Localhost or IPv4/IPv6 loopback for development
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;

    // Standard IPv4 address (e.g. 192.168.1.1)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true;

    // Valid domain must contain at least one dot separating name and TLD (>=2 characters)
    const parts = host.split('.');
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1];
    if (!tld || tld.length < 2) return false;

    return true;
  } catch {
    return false;
  }
}

export const CreateLinkSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
    url: z.string().max(2048).nullable().optional(),
    content: z.string().max(5000).nullable().optional(),
    type: LinkTypeEnum.default('LINK'),
    thumbnailUrl: z.string().max(2048).nullable().optional(),
    isActive: z.boolean().default(true),
    // Scheduling (Creator Pro)
    startsAt: z.string().datetime().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    // Security & Compliance (Enterprise)
    isPasswordProtected: z.boolean().default(false),
    password: z.string().max(100).nullable().optional(),
    isAgeRestricted: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // For standard links and donation tips, a valid web URL with a domain is strictly required
      if (data.type === 'LINK' || data.type === 'DONATION') {
        return Boolean(data.url && isValidWebUrl(data.url));
      }
      return true;
    },
    {
      message:
        'A valid web URL is required (e.g. https://example.com or youtube.com/@channel). Plain text is not allowed.',
      path: ['url'],
    }
  );

export const UpdateLinkSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long').optional(),
    url: z.string().max(2048).nullable().optional(),
    content: z.string().max(5000).nullable().optional(),
    type: LinkTypeEnum.optional(),
    thumbnailUrl: z.string().max(2048).nullable().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    isPasswordProtected: z.boolean().optional(),
    password: z.string().max(100).nullable().optional(),
    isAgeRestricted: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.url !== undefined && (data.type === 'LINK' || data.type === 'DONATION' || !data.type)) {
        return Boolean(data.url && isValidWebUrl(data.url));
      }
      return true;
    },
    {
      message:
        'A valid web URL is required (e.g. https://example.com or youtube.com/@channel). Plain text is not allowed.',
      path: ['url'],
    }
  );

export const UnlockLinkSchema = z.object({
  password: z.string().min(1, 'PIN or password is required').max(100),
});
export type UnlockLinkInput = z.infer<typeof UnlockLinkSchema>;

export const ReorderLinksSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
export type UpdateLinkInput = z.infer<typeof UpdateLinkSchema>;
export type ReorderLinksInput = z.infer<typeof ReorderLinksSchema>;

// ============================================================================
// Click Event Tracking Payload (Client Beacon)
// ============================================================================

export const TrackClickSchema = z.object({
  linkId: z.string().uuid(),
  profileId: z.string().uuid(),
  referrer: z.string().max(500).optional(),
});

export const TrackPageViewSchema = z.object({
  profileId: z.string().uuid(),
  referrer: z.string().max(500).optional(),
});

export type TrackClickInput = z.infer<typeof TrackClickSchema>;
export type TrackPageViewInput = z.infer<typeof TrackPageViewSchema>;

// ============================================================================
// OneLink Sentinel AI & Security Schemas
// ============================================================================

export const RoleEnum = z.enum(['CREATOR', 'SUPER_ADMIN', 'OWNER']);
export type Role = z.infer<typeof RoleEnum>;

export const ThreatTypeEnum = z.enum(['PHISHING', 'MALWARE', 'CRYPTO_DRAINER', 'SPAM']);
export type ThreatType = z.infer<typeof ThreatTypeEnum>;

export const SecurityFlagStatusEnum = z.enum([
  'BLOCKED_AUTO',
  'PENDING_REVIEW',
  'RESOLVED_BENIGN',
  'BANNED',
]);
export type SecurityFlagStatus = z.infer<typeof SecurityFlagStatusEnum>;

export const UpdateThreatStatusSchema = z.object({
  status: SecurityFlagStatusEnum,
  notes: z.string().max(1000).optional(),
});
export type UpdateThreatStatusInput = z.infer<typeof UpdateThreatStatusSchema>;

export const SuspendUserSchema = z.object({
  isBanned: z.boolean(),
  reason: z.string().max(500).optional(),
});
export type SuspendUserInput = z.infer<typeof SuspendUserSchema>;

export const UpdateUserRoleSchema = z.object({
  role: RoleEnum,
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

export const EvaluateUrlSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .refine((val) => isValidWebUrl(val), {
      message: 'Must be a valid web URL with a domain (e.g. https://example.com). Plain text is not allowed.',
    }),
});
export type EvaluateUrlInput = z.infer<typeof EvaluateUrlSchema>;

export const CreateBlocklistSchema = z.object({
  domainPattern: z.string().min(3, 'Domain pattern must be at least 3 characters'),
  reason: z.string().min(3, 'Reason is required').max(500),
});
export type CreateBlocklistInput = z.infer<typeof CreateBlocklistSchema>;

// ============================================================================
// SaaS Owner & Billing Schemas
// ============================================================================

export const UpdatePlanSchema = z.object({
  priceCents: z.number().int().min(0).optional(),
  features: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;

export const PlanIntervalEnum = z.enum(['MONTHLY', 'YEARLY']);
export type PlanInterval = z.infer<typeof PlanIntervalEnum>;

export const CreateCheckoutSessionSchema = z.object({
  planCode: z.string().min(1, 'Plan code is required'),
  interval: PlanIntervalEnum.default('MONTHLY'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionSchema>;

export const InviteCollaboratorSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.string().min(1, 'Role is required'),
});
export type InviteCollaboratorInput = z.infer<typeof InviteCollaboratorSchema>;

export const UpdateTeamMemberRoleSchema = z.object({
  role: z.string().min(1, 'Role is required'),
});
export type UpdateTeamMemberRoleInput = z.infer<typeof UpdateTeamMemberRoleSchema>;

export interface PlanFeatures {
  maxLinks: number;
  customDomains: boolean;
  removeBranding: boolean;
  customThemes: boolean;
  analyticsRetentionDays: number;
  directMonetizationFeePercent: number;
  scheduledLinks: boolean;
  passwordProtection: boolean;
  ageRestriction: boolean;
  analyticsExport: boolean;
  webhooks: boolean;
  teamSeats: number;
}

export interface CanonicalPlan {
  id: string;
  code: 'FREE' | 'PRO' | 'ENTERPRISE';
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  features: PlanFeatures;
}

export const CANONICAL_PLANS: Record<'FREE' | 'PRO' | 'ENTERPRISE', CanonicalPlan> = {
  FREE: {
    id: 'plan_free',
    code: 'FREE',
    name: 'Free Plan',
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    features: {
      maxLinks: 5,
      customDomains: false,
      removeBranding: false,
      customThemes: false,
      analyticsRetentionDays: 7,
      directMonetizationFeePercent: 10,
      scheduledLinks: false,
      passwordProtection: false,
      ageRestriction: false,
      analyticsExport: false,
      webhooks: false,
      teamSeats: 1,
    },
  },
  PRO: {
    id: 'plan_pro',
    code: 'PRO',
    name: 'Creator Pro',
    monthlyPriceCents: 200,
    yearlyPriceCents: 2000,
    features: {
      maxLinks: 9999,
      customDomains: false,
      removeBranding: true,
      customThemes: true,
      analyticsRetentionDays: 90,
      directMonetizationFeePercent: 0,
      scheduledLinks: true,
      passwordProtection: false,
      ageRestriction: false,
      analyticsExport: false,
      webhooks: false,
      teamSeats: 1,
    },
  },
  ENTERPRISE: {
    id: 'plan_ent',
    code: 'ENTERPRISE',
    name: 'Enterprise Studio',
    monthlyPriceCents: 500,
    yearlyPriceCents: 5000,
    features: {
      maxLinks: 9999,
      customDomains: true,
      removeBranding: true,
      customThemes: true,
      analyticsRetentionDays: 365,
      directMonetizationFeePercent: 0,
      scheduledLinks: true,
      passwordProtection: true,
      ageRestriction: true,
      analyticsExport: true,
      webhooks: true,
      teamSeats: 5,
    },
  },
};

// ============================================================================
// Canonical Theme Presets
// ============================================================================

export interface CanonicalThemePreset {
  id: string;
  name: string;
  bgType: 'SOLID' | 'GRADIENT';
  bgValue: string;
  btnStyle: 'FILLED' | 'OUTLINE' | 'SHADOW' | 'ROUNDED';
  btnColor: string;
  btnTextColor: string;
  textColor: string;
  btnRadius: number;
  fontFamily: string;
  isDefault?: boolean;
}

export const CANONICAL_THEME_PRESETS: CanonicalThemePreset[] = [
  {
    id: 'obsidian-carbon',
    name: 'Obsidian Carbon',
    bgType: 'SOLID',
    bgValue: '#09090b',
    btnStyle: 'FILLED',
    btnColor: '#18181b',
    btnTextColor: '#fafafa',
    textColor: '#fafafa',
    btnRadius: 9999,
    fontFamily: 'Geist',
    isDefault: true,
  },
  {
    id: 'minimalist-paper',
    name: 'Alpine Snow',
    bgType: 'SOLID',
    bgValue: '#f8fafc',
    btnStyle: 'FILLED',
    btnColor: '#ffffff',
    btnTextColor: '#0f172a',
    textColor: '#0f172a',
    btnRadius: 12,
    fontFamily: 'Inter',
  },
  {
    id: 'sunset-aurora',
    name: 'Sunset Aurora',
    bgType: 'GRADIENT',
    bgValue: 'linear-gradient(135deg, #180d24 0%, #2e0854 50%, #4a154b 100%)',
    btnStyle: 'FILLED',
    btnColor: '#ffffff',
    btnTextColor: '#1a0933',
    textColor: '#ffffff',
    btnRadius: 9999,
    fontFamily: 'Inter',
  },
  {
    id: 'emerald-forest',
    name: 'Forest Emerald',
    bgType: 'GRADIENT',
    bgValue: 'linear-gradient(135deg, #022018 0%, #064e3b 100%)',
    btnStyle: 'FILLED',
    btnColor: '#ffffff',
    btnTextColor: '#064e3b',
    textColor: '#ecfdf5',
    btnRadius: 12,
    fontFamily: 'Inter',
  },
  {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    bgType: 'GRADIENT',
    bgValue: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
    btnStyle: 'FILLED',
    btnColor: '#1e293b',
    btnTextColor: '#38bdf8',
    textColor: '#f8fafc',
    btnRadius: 12,
    fontFamily: 'Inter',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    bgType: 'GRADIENT',
    bgValue: 'linear-gradient(135deg, #09090b 0%, #020617 100%)',
    btnStyle: 'OUTLINE',
    btnColor: '#06b6d4',
    btnTextColor: '#22d3ee',
    textColor: '#f8fafc',
    btnRadius: 8,
    fontFamily: 'Space Grotesk',
  },
  {
    id: 'bento-linen',
    name: 'Bento Linen',
    bgType: 'SOLID',
    bgValue: '#faf8f5',
    btnStyle: 'FILLED',
    btnColor: '#1c1917',
    btnTextColor: '#faf8f5',
    textColor: '#1c1917',
    btnRadius: 16,
    fontFamily: 'Inter',
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold',
    bgType: 'SOLID',
    bgValue: '#0c0a09',
    btnStyle: 'FILLED',
    btnColor: '#eab308',
    btnTextColor: '#000000',
    textColor: '#fef08a',
    btnRadius: 9999,
    fontFamily: 'Space Grotesk',
  },
];

