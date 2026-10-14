import { z } from 'zod';

// ============================================================================
// Constants & Reserved Keywords
// ============================================================================

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'dashboard',
  'dev',
  'docs',
  'help',
  'home',
  'login',
  'mail',
  'oauth',
  'privacy',
  'profile',
  'register',
  'root',
  'settings',
  'signin',
  'signout',
  'signup',
  'status',
  'support',
  'terms',
  'webhook',
  'www',
] as const;

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// ============================================================================
// Auth Schemas
// ============================================================================

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      USERNAME_REGEX,
      'Username can only contain letters, numbers, underscores and hyphens'
    )
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val.toLowerCase() as (typeof RESERVED_USERNAMES)[number]),
      { message: 'This username is reserved' }
    ),
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
  title: z.string().max(100, 'Title is too long').nullable().optional(),
  bio: z.string().max(500, 'Bio is too long').nullable().optional(),
  themeId: z.string().uuid().nullable().optional(),
  isPublished: z.boolean().optional(),
  seoTitle: z.string().max(60).nullable().optional(),
  seoDesc: z.string().max(160).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ============================================================================
// Link Schemas
// ============================================================================

export const LinkTypeEnum = z.enum(['LINK', 'HEADER', 'DIVIDER']);

export const CreateLinkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  url: z.string().url('Must be a valid URL').nullable().optional(),
  type: LinkTypeEnum.default('LINK'),
  thumbnailUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateLinkSchema = CreateLinkSchema.partial();

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

export const EvaluateUrlSchema = z.object({
  url: z.string().url('Must be a valid URL to evaluate'),
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

export const InviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: RoleEnum,
});
export type InviteTeamMemberInput = z.infer<typeof InviteTeamMemberSchema>;

