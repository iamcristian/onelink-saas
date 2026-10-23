# OneLink Monorepo — Senior Software Engineering Audit & Remediation Guide

> **Scope**: Exhaustive line-by-line review of `apps/api` (NestJS 12), `apps/web` (Next.js 16 / React 19), `packages/prisma` (Prisma 7 / PostgreSQL / TimescaleDB), `packages/shared` (Zod schemas & domain constants), `tools/ml` (Python ONNX training pipeline), and CI/CD infrastructure.
>
> **Categories Covered**:
> 1. **Security Vulnerabilities (`SEC-01` – `SEC-11`)**
> 2. **Functional Bugs & Logic Mistakes (`BUG-01` – `BUG-10`)**
> 3. **Clean Architecture Violations (`ARCH-01` – `ARCH-05`)**
> 4. **DRY (Don't Repeat Yourself) Violations (`DRY-01` – `DRY-06`)**
> 5. **KISS (Keep It Simple, Stupid) Violations (`KISS-01` – `KISS-04`)**
> 6. **Clean Code & TypeScript Best Practices (`CLEAN-01` – `CLEAN-04`)**
> 7. **Infrastructure, DevOps & CI/CD Issues (`OPS-01` – `OPS-03`)**

---

## Executive Summary & Issue Index

| ID | Category | Severity | Title | Primary File(s) |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Security | **CRITICAL** | Password-Protected Link URL Leak & Unauthenticated Full Link Table Dump (with Password Hashes) | `apps/api/src/modules/profile/profile.service.ts`, `apps/api/src/modules/link/link.controller.ts`, `apps/api/src/modules/link/link.service.ts` |
| **SEC-02** | Security | **CRITICAL** | Production Google OAuth Bypass, Missing `state` CSRF Check, Open Redirect & JWT in URL Query | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.controller.ts` |
| **SEC-03** | Security | **CRITICAL** | Stripe Webhook Signature Bypass & Broken `rawBody` Verification | `apps/api/src/main.ts`, `apps/api/src/modules/billing/billing.controller.ts`, `apps/api/src/modules/billing/billing.service.ts` |
| **SEC-04** | Security | **CRITICAL** | Free Subscription Privilege Escalation via Error Fallback & Unverified Session Confirmation | `apps/api/src/modules/billing/billing.service.ts` |
| **SEC-05** | Security | **HIGH** | Unauthenticated Founder Financial KPIs (`/billing/metrics`) & Customer Ledger (`/billing/events`) | `apps/api/src/modules/billing/billing.controller.ts` |
| **SEC-06** | Security | **HIGH** | Hardcoded Fallback JWT Secret, Unrevocable 30-Day Tokens for Banned Users & Stale Profile Cache | `apps/api/src/modules/auth/auth.module.ts`, `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`, `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts` |
| **SEC-07** | Security | **HIGH** | Broken Collaborator RBAC (`Viewer` Role Granted Full Write/Delete Access to Workspace) | `apps/api/src/common/services/profile-access.service.ts` |
| **SEC-08** | Security | **HIGH** | Arbitrary Origin Reflection in CORS (`origin: true, credentials: true`) & Proxy Origin Spoofing | `apps/api/src/main.ts`, `apps/web/src/app/api/[...path]/route.ts` |
| **SEC-09** | Security | **HIGH** | Social Links Bypass URL Validation & Sentinel AI Phishing/Malware Scanner | `packages/shared/src/index.ts`, `apps/api/src/modules/profile/profile.service.ts` |
| **SEC-10** | Security | **MEDIUM** | HTML Injection / Stored XSS in Team Invite Emails, Printable Receipts & CSV Formula Injection | `apps/api/src/infrastructure/email/email.service.ts`, `apps/web/src/app/studio/billing/page.tsx`, `apps/web/src/components/studio/billing/InvoicingEventsLedger.tsx` |
| **SEC-11** | Security | **MEDIUM** | JWT Stored in `localStorage`, Missing Next.js `middleware.ts` & Unprotected Admin Moderation UI | `apps/web/src/lib/api-client.ts`, `apps/web/src/app/admin/moderation/page.tsx` |
| **BUG-01** | Bug / Logic | **HIGH** | Sentinel AI Domain Blocklist Wildcards (`*.xyz`, `*.top`) Never Match in Redis `SISMEMBER` | `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts`, `packages/prisma/seed.ts` |
| **BUG-02** | Bug / Logic | **HIGH** | Missing `@UsePipes(new ZodValidationPipe(...))` Across Billing, Admin & Link Unlock Endpoints | `apps/api/src/modules/billing/billing.controller.ts`, `apps/api/src/modules/sentinel-ai/admin-security.controller.ts`, `apps/api/src/modules/link/link.controller.ts` |
| **BUG-03** | Bug / Logic | **HIGH** | Subscription Quota & Feature Gate Bypasses (Wrong User Checked, Block Types Ignored, Unenforced Gates) | `apps/api/src/modules/link/link.service.ts`, `apps/api/src/modules/profile/profile.service.ts`, `apps/api/src/modules/billing/billing.service.ts` |
| **BUG-04** | Bug / Logic | **HIGH** | ML Training-Serving Skew Between Python `urllib.parse.urlparse` and Node.js WHATWG `URL` | `tools/ml/train_sentinel_model.py`, `apps/api/src/modules/sentinel-ai/utils/features.util.ts` |
| **BUG-05** | Bug / Logic | **MEDIUM** | Analytics Top Links Click Count & CTR Inflation Bug (`||` Fallback on `0` Period Clicks) | `apps/api/src/modules/analytics/analytics.service.ts` |
| **BUG-06** | Bug / Logic | **MEDIUM** | Public Profile 1-Hour Redis Cache Serves Expired Links & Delays Scheduled Link Drops | `apps/api/src/modules/profile/profile.service.ts` |
| **BUG-07** | Bug / Logic | **MEDIUM** | Frontend Link Reordering & Drag-and-Drop Mutates Wrong Items When Filter Tab Is Active | `apps/web/src/app/studio/links/page.tsx` |
| **BUG-08** | Bug / Logic | **MEDIUM** | Team Collaborations Vanish When Redis Evicts Keys (No PostgreSQL Fallback) | `apps/api/src/modules/billing/billing.service.ts` |
| **BUG-09** | Bug / Logic | **LOW** | `updateThreatStatus` Audit Log Records New Status as `previousStatus` | `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts` |
| **BUG-10** | Bug / Logic | **LOW** | `UpdateProfileSchema` Missing Reserved Username Check & Case-Sensitivity Mismatch | `packages/shared/src/index.ts` |
| **ARCH-01** | Clean Arch | **HIGH** | Controllers Directly Inject `PrismaService` & Execute Persistence/Domain Logic | `apps/api/src/modules/sentinel-ai/admin-security.controller.ts`, `apps/api/src/modules/sentinel-ai/sentinel-ai.controller.ts` |
| **ARCH-02** | Clean Arch | **MEDIUM** | Dual `PrismaClient` & PG Pool Instantiation Across `@repo/prisma` and `apps/api` | `packages/prisma/index.ts`, `apps/api/src/infrastructure/database/prisma.service.ts` |
| **ARCH-03** | Clean Arch | **MEDIUM** | Monolithic 1,240-Line Frontend `api-client.ts` Mixing Transport, Auth Storage, Types & Mock Data | `apps/web/src/lib/api-client.ts` |
| **ARCH-04** | Clean Arch | **MEDIUM** | God-Services & God-Pages (`BillingService` 1,308 LOC; `appearance/page.tsx` 969 LOC; `links/page.tsx` 786 LOC) | `apps/api/src/modules/billing/billing.service.ts`, `apps/web/src/app/studio/**` |
| **ARCH-05** | Clean Arch | **MEDIUM** | Overloaded Database Column (`Link.url`) Used to Store Multi-Line Note Body Text | `packages/prisma/schema.prisma`, `apps/web/src/components/studio/AddEditLinkModal.tsx` |
| **DRY-01** | DRY | **MEDIUM** | `RESERVED_USERNAMES` Duplicated with Divergent Lists in `@repo/shared` and `ProfileService` | `packages/shared/src/index.ts`, `apps/api/src/modules/profile/profile.service.ts` |
| **DRY-02** | DRY | **MEDIUM** | `PRESET_THEMES` Duplicated Across `packages/prisma/seed.ts` and `studio/appearance/page.tsx` | `packages/prisma/seed.ts`, `apps/web/src/app/studio/appearance/page.tsx` |
| **DRY-03** | DRY | **MEDIUM** | Subscription Auto-Downgrade Logic Copy-Pasted Between `AuthService` and `BillingService` | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/billing/billing.service.ts` |
| **DRY-04** | DRY | **MEDIUM** | Active Workspace Resolution (`onelink_active_workspace`) Copy-Pasted Across 6 Studio Pages | `apps/web/src/app/studio/**` |
| **DRY-05** | DRY | **LOW** | Button Style Computation & Block Rendering Duplicated Across `LinkPill`, `PhonePreview` & `AppearancePreview` | `apps/web/src/components/profile/LinkPill.tsx`, `apps/web/src/components/studio/PhonePreview.tsx` |
| **DRY-06** | DRY | **LOW** | Debounced Username Availability Check Duplicated Across 3 Pages | `apps/web/src/app/page.tsx`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/studio/appearance/page.tsx` |
| **KISS-01** | KISS | **HIGH** | Dual Redis + PostgreSQL Primary Storage for Team Members, Invitations & Billing Events | `apps/api/src/modules/billing/billing.service.ts` |
| **KISS-02** | KISS | **MEDIUM** | Production Services Polluted with Unit-Test Mock Guards (`if (this.prisma.user?.findUnique)`) | `apps/api/src/common/services/profile-access.service.ts`, `apps/api/src/modules/link/link.service.ts`, `apps/api/src/modules/billing/billing.service.ts` |
| **KISS-03** | KISS | **LOW** | Clever `API_BASE_URL` Object `toString()` Coercion Trick | `apps/web/src/lib/api-client.ts` |
| **KISS-04** | KISS | **MEDIUM** | Silent Mock Fallback Data in Production API Client Masking Real Backend Errors | `apps/web/src/lib/api-client.ts`, `apps/web/src/app/admin/moderation/page.tsx` |
| **CLEAN-01** | Clean Code | **MEDIUM** | Global `BigInt.prototype.toJSON` Prototype Mutation | `apps/api/src/main.ts` |
| **CLEAN-02** | Clean Code | **MEDIUM** | Pervasive `any` Casts and Untyped JSON Columns (`Theme.config`, `Plan.features`) | Multiple files in `apps/api` and `apps/web` |
| **CLEAN-03** | Clean Code | **LOW** | Dead Code (`AppearancePreview.tsx` 338 LOC, No-Op `handleResend` in `TeamGovernanceSection.tsx`) | `apps/web/src/components/studio/appearance/AppearancePreview.tsx`, `apps/web/src/components/studio/billing/TeamGovernanceSection.tsx` |
| **CLEAN-04** | Clean Code | **LOW** | Swallowed Exceptions (`catch {}`) Without Logging or User Feedback | Multiple files in `apps/api` and `apps/web` |
| **OPS-01** | DevOps / CI | **HIGH** | CI Pipeline Skips `lint` and `test` & Runs `typecheck` Before Workspace Package Builds | `.github/workflows/ci.yml`, `turbo.json` |
| **OPS-02** | DevOps / Sec | **MEDIUM** | Environment Files Tracking & Plaintext Credentials in Repo Config | `.gitignore`, `.env`, `apps/api/.env`, `apps/web/.env.local` |
| **OPS-03** | DevOps / Sec | **HIGH** | Missing Rate Limiting (`@nestjs/throttler`) on Auth, PIN Unlock, and Analytics Endpoints | `apps/api/src/app.module.ts` |

---

## Part 1: Security Vulnerabilities

### SEC-01 (CRITICAL): Password-Protected Link Destination URL Leak & Unauthenticated Full Link Table Dump

#### Affected Files
- `apps/api/src/modules/profile/profile.service.ts` (Lines 76–86, 134–144)
- `apps/api/src/modules/link/link.controller.ts` (Lines 46–50)
- `apps/api/src/modules/link/link.service.ts` (Lines 186–192)

#### Problem
1. **Public Profile Leaks Protected URLs**: `ProfileService.getPublicProfile()` queries `links` with `select: { url: true, isPasswordProtected: true, ... }` and returns `link.url` directly in the public JSON payload (and caches it in Redis) even when `link.isPasswordProtected === true`. Any visitor can inspect the page HTML/RSC payload or network response to read the secret URL without entering the PIN.
2. **Unauthenticated Endpoint Dumps `password` Bcrypt Hashes & All Draft Links**: `GET /api/links/profile/:profileId` in `LinkController.getLinks()` has **no `@UseGuards(JwtAuthGuard)`** and no `ProfileAccessService` check! Worse, `LinkService.getLinksByProfile()` executes `this.prisma.link.findMany({ where: { profileId } })` with no `select` clause—returning **every column** of **every link** (including `password` bcrypt hashes, unredacted `url`, and inactive/draft links) to any unauthenticated user who passes `profileId` (which is publicly visible in `GET /api/profiles/:username`).

#### Solution

1. **Redact `url` for password-protected links in `apps/api/src/modules/profile/profile.service.ts`**:
```typescript
// apps/api/src/modules/profile/profile.service.ts (inside getPublicProfile, before caching/returning)
const sanitizedProfile = {
  ...profile,
  links: profile.links.map((link) => ({
    ...link,
    url: link.isPasswordProtected ? null : link.url,
  })),
};

await this.redis.set(
  cacheKey,
  JSON.stringify(sanitizedProfile),
  this.CACHE_TTL_SECONDS,
);

return sanitizedProfile;
```

2. **Require authentication, verify workspace access, and strip `password` hashes in `apps/api/src/modules/link/link.controller.ts` & `link.service.ts`**:
```typescript
// apps/api/src/modules/link/link.controller.ts
@Get('profile/:profileId')
@UseGuards(JwtAuthGuard)
async getLinks(
  @CurrentUser('sub') userId: string,
  @Param('profileId') profileId: string,
) {
  return this.linkService.getLinksByProfile(userId, profileId);
}
```

```typescript
// apps/api/src/modules/link/link.service.ts
async getLinksByProfile(userId: string, profileId: string) {
  await this.profileAccess.verifyProfileAccess(userId, profileId, 'VIEWER');

  const links = await this.prisma.link.findMany({
    where: { profileId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      profileId: true,
      title: true,
      url: true,
      type: true,
      position: true,
      isActive: true,
      isHighlighted: true,
      thumbnailUrl: true,
      startsAt: true,
      expiresAt: true,
      isPasswordProtected: true,
      isAgeRestricted: true,
      clickCount: true,
      createdAt: true,
      updatedAt: true,
      // NEVER select `password: true`
    },
  });

  return links;
}
```

---

### SEC-02 (CRITICAL): Production Google OAuth Authentication Bypass, Missing `state` CSRF Check, Open Redirect & JWT in URL Query

#### Affected Files
- `apps/api/src/modules/auth/auth.service.ts` (Lines 304–313, 412–444)
- `apps/api/src/modules/auth/auth.controller.ts` (Lines 66–92)

#### Problem
1. **Authentication Bypass in Production (`auth.service.ts` L304–313)**:
   `getGoogleProfileFromCode()` checks `if (code.startsWith('mock_google_dev_code_') || !clientId || !clientSecret)` without checking `process.env.NODE_ENV !== 'production'`. Any attacker in production can request `GET /api/auth/google/callback?code=mock_google_dev_code_1` to mint a valid JWT for `alex.rivera@google.com` or pass `state=link_<victimUserId>` to link a mock Google identity to any victim's account!
2. **Account Linking CSRF (`auth.service.ts` L412–444)**:
   `handleGoogleCallback(code, state)` uses `state` directly as `link_<userId>` (`const linkUserId = state.replace('link_', '')`) without verifying a cryptographically signed or Redis-stored CSRF nonce. An attacker can trick a logged-in user into visiting a callback URL to link the attacker's Google account to the victim's OneLink account.
3. **Host Header Injection / Open Redirect Token Theft (`auth.controller.ts` L66–76)**:
   `resolveFrontendUrl(req)` checks `if (forwardedHost.startsWith('localhost') || forwardedHost.startsWith('127.0.0.1'))`. A spoofed header `X-Forwarded-Host: localhost.evil.com` passes `.startsWith('localhost')` and redirects the user's newly minted `?token=<JWT>` directly to `http://localhost.evil.com/auth/callback?token=<JWT>`.

#### Solution

```typescript
// apps/api/src/modules/auth/auth.service.ts
private async getGoogleProfileFromCode(
  code: string,
  redirectUri: string,
): Promise<{ googleId: string; email: string; name: string; avatarUrl: string }> {
  const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
  const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
  const isDev = this.config.get<string>('NODE_ENV') === 'development';

  // Strictly restrict mock codes to local development only
  if (isDev && (code.startsWith('mock_google_dev_code_') || !clientId || !clientSecret)) {
    const isSecondary = code.endsWith('_2');
    return {
      googleId: isSecondary ? 'google_oauth2_1092837465' : 'google_oauth2_9988776655',
      email: isSecondary ? 'creator.studio@gmail.com' : 'alex.rivera@google.com',
      name: isSecondary ? 'Creator Studio' : 'Alex Rivera',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&q=80',
    };
  }

  if (!clientId || !clientSecret) {
    throw new UnauthorizedException('Google OAuth is not configured on this server.');
  }
  // ... existing token exchange ...
}
```

For `state` and `resolveFrontendUrl`:
```typescript
// apps/api/src/modules/auth/auth.controller.ts
private resolveFrontendUrl(req: Request): string {
  const configuredUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL must be configured in production');
  }
  return 'http://localhost:3000';
}
```
And for OAuth account linking, sign the `state` payload with `this.jwtService.sign({ mode: 'link', sub: userId, nonce: randomUUID() }, { expiresIn: '10m' })` when initiating the OAuth flow, and verify it with `this.jwtService.verify(state)` inside `handleGoogleCallback()`.

---

### SEC-03 (CRITICAL): Stripe Webhook Signature Bypass & Broken `rawBody` Verification

#### Affected Files
- `apps/api/src/main.ts` (Line 13)
- `apps/api/src/modules/billing/billing.controller.ts` (Lines 80–90)
- `apps/api/src/modules/billing/billing.service.ts` (Lines 607–625)

#### Problem
1. **Missing `rawBody: true`**: `NestFactory.create(AppModule)` in `main.ts` does not enable `{ rawBody: true }`, and `BillingController.handleWebhook` passes `req.body` (already parsed JSON object) instead of `req.rawBody` (`Buffer`). `stripe.webhooks.constructEvent()` requires the exact raw `Buffer`/`string` payload, so real Stripe webhook verification will **always fail**.
2. **Trivial Signature Bypass**: In `BillingService.handleWebhook()` (L611):
   ```typescript
   if (this.stripe && webhookSecret && signature) {
     event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
   } else {
     event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
   }
   ```
   If an attacker sends a `POST /api/billing/webhook` **without** a `stripe-signature` header (`signature` is `undefined`), the `if` condition evaluates to `false` and the `else` branch blindly trusts the attacker's JSON body! An attacker can forge `checkout.session.completed` to upgrade any `userId` to `ENTERPRISE` for free.

#### Solution

1. **Enable `rawBody: true` in `apps/api/src/main.ts`**:
```typescript
// apps/api/src/main.ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,
});
```

2. **Pass `req.rawBody` in `apps/api/src/modules/billing/billing.controller.ts`**:
```typescript
// apps/api/src/modules/billing/billing.controller.ts
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

@Post('webhook')
@HttpCode(HttpStatus.OK)
async handleWebhook(
  @Req() req: RawBodyRequest<Request>,
  @Headers('stripe-signature') signature?: string,
) {
  return this.billingService.handleWebhook(req.rawBody ?? req.body, signature);
}
```

3. **Enforce signature verification in `apps/api/src/modules/billing/billing.service.ts`**:
```typescript
// apps/api/src/modules/billing/billing.service.ts
async handleWebhook(rawBody: Buffer | string | Record<string, any>, signature?: string) {
  const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
  const isProd = this.config.get<string>('NODE_ENV') === 'production';

  let event: Stripe.Event;

  if (this.stripe && webhookSecret) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') {
      throw new BadRequestException('Webhook requires raw request body Buffer');
    }
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  } else if (!isProd) {
    event = (typeof rawBody === 'string' || Buffer.isBuffer(rawBody)
      ? JSON.parse(rawBody.toString())
      : rawBody) as Stripe.Event;
  } else {
    throw new BadRequestException('Stripe webhook secret is not configured');
  }
  // ... process event ...
}
```

---

### SEC-04 (CRITICAL): Free Subscription Privilege Escalation via Error Fallback & Unverified Session Confirmation

#### Affected Files
- `apps/api/src/modules/billing/billing.service.ts` (Lines 372–425, 523–602)

#### Problem
1. **Checkout Error Grants Free Upgrade (`billing.service.ts` L372–425)**:
   Inside `createCheckoutSession()`, if `this.stripe` is configured and `this.stripe.checkout.sessions.create(...)` throws an error (for example, the caller passes a malformed `successUrl` or invalid parameter), the `catch (err)` block logs a warning and **falls through to the Automated Simulation Flow** (L379–425), which immediately writes an `ACTIVE` `PRO` or `ENTERPRISE` subscription to PostgreSQL for free!
2. **IDOR / Replay in `confirmCheckoutSession` (`billing.service.ts` L530–580)**:
   `confirmCheckoutSession(userId, sessionId)` fetches the Stripe checkout session (`this.stripe.checkout.sessions.retrieve(sessionId)`) and upgrades the calling `userId` **without verifying**:
   - `session.metadata?.userId === userId` (any user can pass another user's `sessionId` to upgrade their own account), and
   - `session.payment_status === 'paid'` (an unpaid/open checkout session can be confirmed to activate a paid plan).

#### Solution

```typescript
// apps/api/src/modules/billing/billing.service.ts

// 1. Inside createCheckoutSession: rethrow Stripe errors instead of falling through to free simulation
if (this.stripe) {
  try {
    // ... stripe.checkout.sessions.create ...
    return { url: session.url, sessionId: session.id, simulated: false };
  } catch (err: any) {
    this.logger.error(`Stripe checkout session creation failed: ${err.message}`);
    throw new BadRequestException('Unable to create Stripe checkout session.');
  }
}

// Restrict simulation mode strictly to non-production when Stripe is not configured
if (this.config.get<string>('NODE_ENV') === 'production') {
  throw new BadRequestException('Stripe billing is not configured.');
}
```

```typescript
// 2. Inside confirmCheckoutSession: verify session ownership and payment status
if (this.stripe && !sessionId.startsWith('cs_sim_')) {
  const session = await this.stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.userId !== userId) {
    throw new ForbiddenException('Checkout session does not belong to the authenticated user.');
  }

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    throw new BadRequestException('Checkout session payment is not complete.');
  }
  // ... proceed with provisioning ...
}
```

---

### SEC-05 (HIGH): Unauthenticated Founder Financial KPIs & Live Customer Billing Ledger

#### Affected Files
- `apps/api/src/modules/billing/billing.controller.ts` (Lines 40–45, 104–109)

#### Problem
`GET /api/billing/metrics` (`getFinancialMetrics`) and `GET /api/billing/events` (`getEvents`) have **no `@UseGuards(JwtAuthGuard, RolesGuard)`** and **no `@Roles(Role.OWNER)`** decorator. Even though the JSDoc says *"Founder / Platform Owner financial telemetry (MRR, ARR, Paid Subscriptions, ARPU)"*, any anonymous internet user can query both endpoints to scrape company revenue metrics and live customer handles/invoices.

#### Solution

```typescript
// apps/api/src/modules/billing/billing.controller.ts
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@repo/prisma';

@Get('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.SUPER_ADMIN)
async getMetrics() {
  return this.billingService.getFinancialMetrics();
}

@Get('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.SUPER_ADMIN)
async getEvents() {
  return this.billingService.getRecentBillingEvents();
}
```

---

### SEC-06 (HIGH): Hardcoded Fallback JWT Secret, Unrevocable 30-Day Tokens for Banned Users & Stale Profile Cache on Suspension

#### Affected Files
- `apps/api/src/modules/auth/auth.module.ts` (Lines 16–18)
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` (Lines 14–34)
- `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts` (Lines 448–488)

#### Problem
1. **Hardcoded JWT Secret (`auth.module.ts` L17)**: `secret: config.get<string>('JWT_SECRET') || 'onelink-super-secret-jwt-key-2026'`. If `JWT_SECRET` is omitted in production, anyone who knows this public fallback string can forge `OWNER` JWTs.
2. **Banned Users Retain API Access for 30 Days (`jwt-auth.guard.ts` L23–30)**: `JwtAuthGuard` only calls `this.jwtService.verifyAsync(token)` and never checks whether the user has been banned (`isBanned: true`) or deleted since the 30-day token was issued.
3. **Banned User Profile Remains Live in Redis (`sentinel-ai.service.ts` L448–488)**: `SentinelAiService.suspendUser()` sets `user.isBanned = true` and deactivates all links in PostgreSQL, **but never deletes `profile:${username}` from Redis**. The suspended phishing/malware profile remains publicly accessible for up to 1 hour (`CACHE_TTL_SECONDS = 3600`).

#### Solution

1. **Fail fast if `JWT_SECRET` is missing in production (`apps/api/src/modules/auth/auth.module.ts`)**:
```typescript
JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret && config.get<string>('NODE_ENV') === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
    }
    return {
      secret: secret || 'dev-only-jwt-secret-do-not-use-in-prod',
      signOptions: { expiresIn: '7d' },
    };
  },
}),
```

2. **Check Redis revocation / ban set in `JwtAuthGuard` (`apps/api/src/modules/auth/guards/jwt-auth.guard.ts`)**:
```typescript
// Inject RedisService into JwtAuthGuard
const payload = await this.jwtService.verifyAsync(token);
const isBanned = await this.redis.sismember('auth:banned_users', payload.sub);
if (isBanned) {
  throw new UnauthorizedException('Your account has been suspended.');
}
request.user = payload;
```

3. **Evict `profile:${username}` and record ban in Redis in `SentinelAiService.suspendUser()` (`apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts`)**:
```typescript
// Inside suspendUser(adminId, targetUserId, isBanned, reason)
const user = await this.prisma.user.update({
  where: { id: targetUserId },
  data: { isBanned },
  include: { profile: true },
});

if (isBanned) {
  await this.redis.sadd('auth:banned_users', targetUserId);
} else {
  await this.redis.srem('auth:banned_users', targetUserId);
}

if (user.profile) {
  if (isBanned) {
    await this.prisma.link.updateMany({
      where: { profileId: user.profile.id },
      data: { isActive: false },
    });
  }
  // Immediately evict cached public profile
  await this.redis.del(`profile:${user.profile.username.toLowerCase()}`);
}
```
And in `ProfileService.getPublicProfile()`, add `user: { isBanned: false }` to the `where` filter so banned profiles return `404 NotFoundException`.

---

### SEC-07 (HIGH): Broken Collaborator RBAC (`Viewer` Role Granted Full Write/Delete Access)

#### Affected Files
- `apps/api/src/common/services/profile-access.service.ts` (Lines 25–92)
- `apps/web/src/components/studio/billing/TeamGovernanceSection.tsx` (Lines 250, 440)

#### Problem
`ProfileAccessService.verifyProfileAccess(userId, profileId)` only checks if a `TeamMember` record exists with `status: 'Active'`, completely ignoring `member.role`! Consequently, a collaborator invited with the read-only `Viewer` (or `Viewer / Auditor`) role can create, edit, reorder, and delete links, overwrite themes, and change the workspace username/bio.
Additionally, `TeamGovernanceSection.tsx` uses `"Viewer / Auditor"` in the invite modal (`L440`) but `"Viewer"` in the member table role dropdown (`L250`).

#### Solution

Add a `minimumRole` parameter to `ProfileAccessService.verifyProfileAccess`:
```typescript
// apps/api/src/common/services/profile-access.service.ts
export type CollaboratorPermissionLevel = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';

const ROLE_WEIGHT: Record<string, number> = {
  'Viewer': 1,
  'Viewer / Auditor': 1,
  'Content Editor': 2,
  'Safety Admin': 3,
  'Admin': 3,
  'Platform Owner': 4,
};

const REQUIRED_WEIGHT: Record<CollaboratorPermissionLevel, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

async verifyProfileAccess(
  userId: string,
  profileId: string,
  requiredLevel: CollaboratorPermissionLevel = 'EDITOR',
) {
  const profile = await this.prisma.profile.findUnique({
    where: { id: profileId },
  });
  if (!profile) {
    throw new NotFoundException('Profile not found');
  }

  // Primary owner always has full access
  if (profile.userId === userId) {
    return profile;
  }

  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, isBanned: true },
  });
  if (!user?.email || user.isBanned) {
    throw new ForbiddenException('You do not have permission to access this profile');
  }

  const member = await this.prisma.teamMember.findFirst({
    where: {
      ownerId: profile.userId,
      email: user.email.toLowerCase(),
      status: 'Active',
    },
  });

  if (!member) {
    throw new ForbiddenException('You do not have permission to access this profile');
  }

  const memberWeight = ROLE_WEIGHT[member.role] ?? 1;
  if (memberWeight < REQUIRED_WEIGHT[requiredLevel]) {
    throw new ForbiddenException(
      `Your collaborator role (${member.role}) does not permit this action.`,
    );
  }

  return profile;
}
```
Then pass `'VIEWER'` on read-only endpoints (`getLinksByProfile`, `getAnalyticsOverview`, `getPublicProfileById`) and `'EDITOR'` (the default) on mutating endpoints (`createLink`, `updateLink`, `deleteLink`, `updateProfile`, `upsertCustomTheme`).

---

### SEC-08 (HIGH): Arbitrary Origin Reflection in CORS (`origin: true, credentials: true`) & Proxy Origin Spoofing

#### Affected Files
- `apps/api/src/main.ts` (Lines 16–19)
- `apps/web/src/app/api/[...path]/route.ts` (Lines 27, 60–65, 111–125)

#### Problem
1. In `apps/api/src/main.ts` (L16–19), `app.enableCors({ origin: true, credentials: true })` reflects **any** `Origin` header back in `Access-Control-Allow-Origin` with `Access-Control-Allow-Credentials: true`.
2. In `apps/web/src/app/api/[...path]/route.ts` (L60–65, L111–125), the Next.js API proxy also reflects `req.headers.get("origin") || "*"` with `Access-Control-Allow-Credentials: "true"`, and at Line 27 overwrites the upstream origin header with `forwardHeaders.set("origin", "http://localhost:3000")`, bypassing any origin check on the backend.

#### Solution

```typescript
// apps/api/src/main.ts
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
});
```

And in `apps/web/src/app/api/[...path]/route.ts`, remove the wildcard reflection and forward the real client origin:
```typescript
// apps/web/src/app/api/[...path]/route.ts
const clientOrigin = req.headers.get("origin");
if (clientOrigin) {
  forwardHeaders.set("origin", clientOrigin);
}
```

---

### SEC-09 (HIGH): Social Links Bypass URL Validation & Sentinel AI Threat Scanning

#### Affected Files
- `packages/shared/src/index.ts` (Lines 137–144)
- `apps/api/src/modules/profile/profile.service.ts` (Lines 350–409)
- `apps/api/src/modules/profile/profile.controller.ts` (Lines 85–110)

#### Problem
1. `CreateSocialLinkSchema` in `packages/shared/src/index.ts` (L139) defines `url: z.string().min(1, 'Social URL or handle is required')` without calling `isValidWebUrl()`.
2. `ProfileService.createSocialLink()` and `ProfileService.updateSocialLink()` write `dto.url` directly to the database **without running `SentinelAiService.evaluateUrl(dto.url)`** and without sanitizing `javascript:` or `data:` URIs (when someone passes a URL directly in `updateSocialLink`, `normalizeSocialUrl` is not even called!). A malicious user can bypass Sentinel AI completely by placing phishing/drainer URLs or `javascript:alert(1)` in their social links.

#### Solution

1. **Enforce `normalizeSocialUrl` + `isValidWebUrl` + `SentinelAiService.evaluateUrl` in `ProfileService` (`apps/api/src/modules/profile/profile.service.ts`)**:
```typescript
// apps/api/src/modules/profile/profile.service.ts
// Inject SentinelAiService into ProfileService constructor
async createSocialLink(
  userId: string,
  profileId: string,
  dto: CreateSocialLinkDto,
  ipAddress?: string,
) {
  const profile = await this.profileAccess.verifyProfileAccess(userId, profileId, 'EDITOR');
  const normalizedUrl = this.normalizeSocialUrl(dto.platform, dto.url);

  if (!isValidWebUrl(normalizedUrl)) {
    throw new BadRequestException('Invalid social link URL');
  }

  await this. enforceSentinelSafety(userId, normalizedUrl, ipAddress);

  const link = await this.prisma.socialLink.create({
    data: {
      profileId,
      platform: dto.platform.toLowerCase().trim(),
      url: normalizedUrl,
      position: dto.position ?? 0,
    },
  });

  await this.invalidateCache(profile.username);
  return link;
}

async updateSocialLink(
  userId: string,
  profileId: string,
  socialId: string,
  dto: UpdateSocialLinkDto,
  ipAddress?: string,
) {
  const profile = await this.profileAccess.verifyProfileAccess(userId, profileId, 'EDITOR');
  const existing = await this.prisma.socialLink.findFirst({
    where: { id: socialId, profileId },
  });
  if (!existing) {
    throw new NotFoundException('Social link not found');
  }

  let normalizedUrl = existing.url;
  const targetPlatform = dto.platform ? dto.platform.toLowerCase().trim() : existing.platform;

  if (dto.url !== undefined) {
    normalizedUrl = this.normalizeSocialUrl(targetPlatform, dto.url);
    if (!isValidWebUrl(normalizedUrl)) {
      throw new BadRequestException('Invalid social link URL');
    }
    await this.enforceSentinelSafety(userId, normalizedUrl, ipAddress);
  }

  const updated = await this.prisma.socialLink.update({
    where: { id: socialId },
    data: {
      platform: targetPlatform,
      url: normalizedUrl,
      ...(dto.position !== undefined ? { position: dto.position } : {}),
    },
  });

  await this.invalidateCache(profile.username);
  return updated;
}
```

---

### SEC-10 (MEDIUM): HTML Injection / Stored XSS in Team Invite Emails, Printable Receipts & CSV Formula Injection

#### Affected Files
- `apps/api/src/infrastructure/email/email.service.ts` (Lines 77–104)
- `apps/web/src/app/studio/billing/page.tsx` (Lines 195–268)
- `apps/web/src/components/studio/billing/InvoicingEventsLedger.tsx` (Lines 49–69)

#### Problem
1. **Email HTML Injection (`email.service.ts` L77–104)**: `sendTeamInvitation()` interpolates `params.inviteeName`, `params.inviterName`, `params.inviterUsername`, `params.role`, and `params.actionUrl` directly into an HTML template string without escaping `<`, `>`, `&`, `"`, or `'`.
2. **DOM XSS in Printable Receipt (`studio/billing/page.tsx` L195–268)**: `handleDownloadInvoice()` interpolates `inv.number`, `inv.planName`, and `inv.currency` into a raw HTML string and passes it to `printWin.document.write(receiptHtml)`.
3. **CSV Injection & Broken URI Encoding (`InvoicingEventsLedger.tsx` L49–69)**: `handleExportCSV()` joins fields with `,` without quoting or neutralizing leading `=`, `+`, `-`, `@` characters (CSV Formula Injection in Excel/Google Sheets), and uses `encodeURI("data:text/csv;charset=utf-8," + ...)` instead of `Blob` + `URL.createObjectURL()`, which truncates the CSV if any value contains `#`.

#### Solution

1. **Add an HTML escaper helper in `EmailService` and `studio/billing/page.tsx`**:
```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```
Wrap all interpolated values (`escapeHtml(params.inviteeName)`, `escapeHtml(inv.planName)`, etc.) before inserting into HTML templates.

2. **Safe CSV Export in `apps/web/src/components/studio/billing/InvoicingEventsLedger.tsx`**:
```typescript
const escapeCsvCell = (value: unknown): string => {
  const str = String(value ?? "");
  // Prevent CSV formula injection
  const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
};

const handleExportCSV = () => {
  const headers = ["Event ID", "Type", "Tier", "Handle", "Timestamp", "Status"];
  const rows = filteredEvents.map((e) => [
    e.id,
    e.type,
    e.tier,
    e.handle,
    e.timestamp,
    e.status,
  ]);
  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `onelink-billing-events-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

---

### SEC-11 (MEDIUM): JWT Stored in `localStorage`, Missing Next.js `middleware.ts` & Unprotected Admin Moderation UI

#### Affected Files
- `apps/web/src/lib/api-client.ts` (Lines 12–34)
- `apps/web/src/app/admin/moderation/page.tsx` (Lines 173–230)

#### Problem
1. **Client-Only Auth & `localStorage` Token**: The JWT is stored in `localStorage.getItem("onelink_token")` (accessible to any XSS payload) and there is no `apps/web/src/middleware.ts` to protect `/studio/*` or `/admin/*` on the server before delivering HTML/JS.
2. **Unprotected `/admin/moderation` Page (`admin/moderation/page.tsx` L173–230)**: Unlike `studio/layout.tsx`, `AdminModerationPage` **never redirects unauthenticated or non-admin users**! When an anonymous visitor or standard `CREATOR` navigates to `/admin/moderation`, `fetchCurrentUser()` returns `null` or `role: "CREATOR"`, the admin API calls fail, `loadData()` falls back to `INITIAL_FALLBACK_THREATS` / `INITIAL_FALLBACK_BLOCKLIST`, and the entire Super Admin Threat Moderation Studio UI renders publicly with fake data and interactive controls!

#### Solution

Add an authentication and role guard in `apps/web/src/app/admin/moderation/page.tsx`:
```tsx
// apps/web/src/app/admin/moderation/page.tsx
import { useRouter } from "next/navigation";

export default function AdminModerationPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);
  // ... existing state ...

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await fetchCurrentUser();
      if (!me) {
        router.replace("/login");
        return;
      }
      if (me.role !== "SUPER_ADMIN" && me.role !== "OWNER") {
        router.replace("/studio/links");
        return;
      }
      setAuthorized(true);
      setCurrentUser(me);

      const [threatsData, blocklistData, logsData, usersData] = await Promise.all([
        fetchAdminThreats(),
        fetchAdminBlocklist(),
        fetchAdminAuditLogs(),
        fetchAdminUsers(),
      ]);
      // ... update state ...
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-mono text-xs">
        Verifying Super Admin clearance...
      </div>
    );
  }
  // ... render Admin UI ...
}
```

---

## Part 2: Functional Bugs & Logic Mistakes

### BUG-01 (HIGH): Sentinel AI Domain Blocklist Wildcards (`*.xyz`, `*.top`) Never Match in Redis `SISMEMBER`

#### Affected Files
- `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts` (Lines 144–163, 396–415)
- `packages/prisma/seed.ts` (Lines 585–605)
- `apps/web/src/components/admin/ThreatQueueTable.tsx` (Line 83)

#### Problem
1. In `packages/prisma/seed.ts` (L585–605) and `ThreatQueueTable.tsx` (L83), blocklist patterns are stored with wildcards and paths such as `*.xyz`, `*.top`, `*.ru/gift*`, `drainer-*.cc`, and `*.metamask-security-auth.xyz`.
2. In `SentinelAiService.syncBlocklistToRedis()`, these wildcard strings are pushed into a Redis Set (`sentinel:blocked_domains`).
3. In `SentinelAiService.evaluateUrl()` (L145–146):
   ```typescript
   const isBlockedInRedis = await this.redis.sismember(
     this.REDIS_BLOCKLIST_KEY,
     hostname,
   );
   ```
   `SISMEMBER` only checks **exact string equality**! Checking whether `"metamask-security-auth.xyz"` is a member of `{"*.xyz", "*.top", "*.metamask-security-auth.xyz"}` **always returns `0` (`false`)**! Layer 1 of Sentinel AI (`Redis O(1) Domain Blocklist`) is completely non-functional for every wildcard rule in the database.

#### Solution

Match exact hostnames, parent domain suffixes (`*.domain.tld`, `*.tld`), and glob patterns in `SentinelAiService`:
```typescript
// apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts
private async isUrlMatchingBlocklist(hostname: string, fullUrl: string): Promise<string | null> {
  // 1. Check candidate exact & wildcard suffix matches in Redis O(k) where k = label count
  const labels = hostname.split('.');
  const candidates = new Set<string>([hostname, `*.${hostname}`]);
  for (let i = 0; i < labels.length; i++) {
    const suffix = labels.slice(i).join('.');
    candidates.add(suffix);
    candidates.add(`*.${suffix}`);
  }

  const blockedSet = await this.redis.smembers(this.REDIS_BLOCKLIST_KEY);
  for (const pattern of blockedSet) {
    const normalizedPattern = pattern.toLowerCase().trim();
    if (candidates.has(normalizedPattern)) {
      return pattern;
    }
    // Support general glob wildcards (e.g. "drainer-*.cc" or "*.ru/gift*")
    if (normalizedPattern.includes('*')) {
      const target = normalizedPattern.includes('/') ? fullUrl.toLowerCase() : hostname;
      const regexStr =
        '^' +
        normalizedPattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*') +
        '$';
      if (new RegExp(regexStr, 'i').test(target)) {
        return pattern;
      }
    }
  }
  return null;
}
```
Then in `evaluateUrl()`:
```typescript
const matchedPattern = await this.isUrlMatchingBlocklist(hostname, rawUrl);
if (matchedPattern) {
  return {
    isSafe: false,
    riskScore: 0.99,
    aiConfidence: 0.999,
    threatType: ThreatType.PHISHING,
    signals: [`Domain matched global blocklist pattern (${matchedPattern})`],
    normalizedDomain: hostname,
    latencyMs: Number((performance.now() - startTime).toFixed(2)),
    action: 'BLOCK',
  };
}
```

---

### BUG-02 (HIGH): Missing `@UsePipes(new ZodValidationPipe(...))` Across Billing, Admin & Link Unlock Endpoints

#### Affected Files
- `apps/api/src/modules/billing/billing.controller.ts` (Lines 53–73, 118–159)
- `apps/api/src/modules/sentinel-ai/admin-security.controller.ts` (Lines 107–148, 173–229)
- `apps/api/src/modules/link/link.controller.ts` (Lines 52–59)

#### Problem
Although Zod schemas (`CreateCheckoutSessionSchema`, `InviteCollaboratorSchema`, `UpdateTeamMemberRoleSchema`, `UpdateThreatStatusSchema`, `SuspendUserSchema`, `UnlockLinkSchema`) are defined in `@repo/shared` and imported as DTO types, **none of the corresponding controller routes attach `@UsePipes(new ZodValidationPipe(...))`**!
- `POST /api/billing/checkout` accepts any unvalidated body.
- `POST /api/billing/team/invite` accepts invalid emails or arbitrary role strings.
- `PATCH /api/admin/security/users/:id/role` (`admin-security.controller.ts` L176) uses an inline `@Body() body: { role: 'CREATOR' | 'SUPER_ADMIN' | 'OWNER' }` with zero runtime validation—passing `{"role": "INVALID"}` causes an unhandled Prisma database error (HTTP 500).
- `POST /api/links/:id/unlock` (`link.controller.ts` L52) does not apply `ZodValidationPipe(UnlockLinkSchema)`.

#### Solution

Attach `@UsePipes(new ZodValidationPipe(...))` to every endpoint accepting a request body:
```typescript
// apps/api/src/modules/billing/billing.controller.ts
@Post('checkout')
@UseGuards(JwtAuthGuard)
@UsePipes(new ZodValidationPipe(CreateCheckoutSessionSchema))
async createCheckout(
  @CurrentUser('sub') userId: string,
  @Body() dto: CreateCheckoutSessionDto,
) {
  return this.billingService.createCheckoutSession(userId, dto);
}

@Post('team/invite')
@UseGuards(JwtAuthGuard)
@UsePipes(new ZodValidationPipe(InviteCollaboratorSchema))
async inviteTeamMember(
  @CurrentUser('sub') userId: string,
  @Body() dto: InviteCollaboratorDto,
) {
  return this.billingService.inviteTeamMember(userId, dto);
}

@Patch('team/:id/role')
@UseGuards(JwtAuthGuard)
@UsePipes(new ZodValidationPipe(UpdateTeamMemberRoleSchema))
async updateTeamMemberRole(
  @CurrentUser('sub') userId: string,
  @Param('id') memberId: string,
  @Body() dto: UpdateTeamMemberRoleDto,
) {
  return this.billingService.updateTeamMemberRole(userId, memberId, dto.role);
}
```
And apply `ZodValidationPipe` to `AdminSecurityController.updateThreatStatus`, `AdminSecurityController.suspendUser`, `AdminSecurityController.addDomainBlocklist`, `AdminSecurityController.updateUserRole`, and `LinkController.unlockLink`.

---

### BUG-03 (HIGH): Subscription Quota & Feature Gate Bypasses (Wrong User Checked, Block Types Ignored, Unenforced Gates)

#### Affected Files
- `apps/api/src/modules/link/link.service.ts` (Lines 123–141, 197–263)
- `apps/api/src/modules/profile/profile.service.ts` (Lines 290–348)
- `apps/api/src/modules/billing/billing.service.ts` (Lines 774–863)

#### Problem
1. **Checks Collaborator's Subscription Instead of Workspace Owner's (`link.service.ts` L125–128)**:
   `createLink(userId, profileId, ...)` queries `this.prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' } })`. When a team collaborator (`FREE` plan) edits an `ENTERPRISE` workspace (`profile.userId`), `createLink` checks the collaborator's `FREE` subscription and blocks them at 5 links! Conversely, a `PRO` collaborator can add unlimited links to a `FREE` workspace. It must check `where: { userId: profile.userId, status: 'ACTIVE' }`.
2. **Quota Bypass via Block Type Conversion (`link.service.ts` L131–133, L197–263)**:
   `createLink` only checks the quota when `blockType === LinkType.LINK`, allowing unlimited `DONATION`, `NOTE`, `HEADER`, and `DIVIDER` blocks on the `FREE` plan, and `updateLink()` allows changing a `HEADER` to `LINK` without running the quota check.
3. **Unenforced Plan Feature Gates on Backend**:
   - `LinkService.createLink` & `updateLink` allow `FREE` users to set `startsAt`/`expiresAt` (`scheduledLinks: false`), `isPasswordProtected` (`passwordProtection: false`), and `isAgeRestricted` (`ageRestriction: false`).
   - `ProfileService.upsertCustomTheme` allows `FREE` users to save custom themes (`customThemes: false`).
   - `BillingService.inviteTeamMember` hardcodes `maxSeats: 5` for every user (even `FREE` and `PRO` users whose plan has `teamSeats: 1`).

#### Solution

Create a shared entitlement helper in `BillingService` (or `ProfileAccessService`) that resolves the **workspace owner's** active plan features (`profile.userId`) and enforces them in `LinkService`, `ProfileService`, and `BillingService`:
```typescript
// Inside LinkService.createLink & updateLink
const ownerSubscription = await this.prisma.subscription.findFirst({
  where: { userId: profile.userId, status: 'ACTIVE' },
  include: { plan: true },
});
const features = (ownerSubscription?.plan?.features as Record<string, any>) ?? {
  maxLinks: 5,
  scheduledLinks: false,
  passwordProtection: false,
  ageRestriction: false,
};

if ((dto.startsAt || dto.expiresAt) && !features.scheduledLinks) {
  throw new ForbiddenException('Scheduled links require the Creator Pro or Enterprise plan.');
}
if (dto.isPasswordProtected && !features.passwordProtection) {
  throw new ForbiddenException('PIN-protected links require the Enterprise Studio plan.');
}
if (dto.isAgeRestricted && !features.ageRestriction) {
  throw new ForbiddenException('Age-restricted links require the Enterprise Studio plan.');
}
```

---

### BUG-04 (HIGH): ML Training-Serving Skew Between Python `urllib.parse.urlparse` and Node.js WHATWG `URL`

#### Affected Files
- `tools/ml/train_sentinel_model.py` (Lines 62–135)
- `apps/api/src/modules/sentinel-ai/utils/features.util.ts` (Lines 44–129)

#### Problem
The ONNX Random Forest model is trained in Python (`train_sentinel_model.py`) and served in Node.js (`features.util.ts`), but the 16-feature vector is computed differently in Python vs. TypeScript:
1. **`query_length` (`feature[3]`) Skew**:
   - In Python (`train_sentinel_model.py` L73): `parsed.query` does **not** include the leading `?` (e.g. `watch?v=123` has `query = "v=123"`, length `5`).
   - In TypeScript (`features.util.ts` L52): `parsed.search` **includes** the leading `?` (e.g. `search = "?v=123"`, length `6`).
2. **IDN / Punycode (`feature[1]`, `feature[9]`, `feature[10]`) Skew**:
   - In Python (`train_sentinel_model.py` L68, L112): `urlparse("http://p\u0430ypal.com/signin").hostname` remains raw Unicode `"p\u0430ypal.com"`, so `is_punycode` (`"xn--" in hostname`) evaluates to **`0.0`** during training even for the explicit homoglyph training sample at Line 229!
   - In Node.js (`features.util.ts` L46, L86): `new URL("http://p\u0430ypal.com/signin").hostname` automatically punycodes to `"xn--pypal-4ve.com"`, so `is_punycode` is **`1.0`**, `domain_length` is `17` (vs `10` in Python), and `entropy` is computed on `"xn--pypal-4ve"` (vs `"p\u0430ypal"` in Python).

#### Solution

1. **Strip the leading `?` from `parsed.search` in `apps/api/src/modules/sentinel-ai/utils/features.util.ts`**:
```typescript
// apps/api/src/modules/sentinel-ai/utils/features.util.ts (Line 52)
const search = parsed.search.startsWith('?')
  ? parsed.search.slice(1).toLowerCase()
  : parsed.search.toLowerCase();
```

2. **Encode IDN hostnames to ASCII Punycode in `tools/ml/train_sentinel_model.py` so Python matches WHATWG `URL`**:
```python
# tools/ml/train_sentinel_model.py (Lines 68-73)
raw_hostname = (parsed.hostname or "").lower()
if raw_hostname.startswith("www."):
    raw_hostname = raw_hostname[4:]
try:
    hostname = raw_hostname.encode("idna").decode("ascii")
except Exception:
    hostname = raw_hostname
```

---

### BUG-05 (MEDIUM): Analytics Top Links Click Count & CTR Inflation Bug (`||` Fallback on `0` Period Clicks)

#### Affected Files
- `apps/api/src/modules/analytics/analytics.service.ts` (Lines 261–273)

#### Problem
In `AnalyticsService.getOverview()` (L261–273):
```typescript
const clickMap = new Map(
  clicksByLink.map((item) => [item.linkId, item._count._all]),
);

const topLinks = links
  .map((l) => {
    const clicks = clickMap.get(l.id) || Number(l.clickCount);
    const linkCtr =
      currentViews > 0 ? Number(((clicks / currentViews) * 100).toFixed(1)) : 0;
```
When a link has **`0` clicks** in the selected `7d` or `30d` window, `clickMap.get(l.id)` is `undefined`. Because the code uses `|| Number(l.clickCount)`, it falls back to the link's **all-time** cumulative `clickCount`! Worse, it divides that all-time `clickCount` by the short window's `currentViews`, producing nonsensical CTRs (e.g., `450% CTR`) and ranking links with 0 period clicks above links that actually received clicks in the period.

#### Solution

Use nullish coalescing (`?? 0`) for period-windowed clicks:
```typescript
// apps/api/src/modules/analytics/analytics.service.ts
const topLinks = links
  .map((l) => {
    const clicks = clickMap.get(l.id) ?? 0;
    const linkCtr =
      currentViews > 0
        ? Number(Math.min((clicks / currentViews) * 100, 100).toFixed(1))
        : 0;
    return {
      id: l.id,
      title: l.title,
      url: l.isPasswordProtected ? null : l.url,
      clicks,
      allTimeClicks: Number(l.clickCount),
      ctr: linkCtr,
    };
  })
  .sort((a, b) => b.clicks - a.clicks);
```

---

### BUG-06 (MEDIUM): Public Profile 1-Hour Redis Cache Serves Expired Links & Delays Scheduled Link Drops

#### Affected Files
- `apps/api/src/modules/profile/profile.service.ts` (Lines 51–145)

#### Problem
`ProfileService.getPublicProfile()` filters `startsAt <= now` and `expiresAt >= now` inside the PostgreSQL `findUnique` query and caches the resulting JSON in Redis for `3600` seconds (1 hour).
- If a link is scheduled to go live at `12:00:00`, and a visitor views the profile at `11:59:50`, the profile is cached **without** the scheduled link until `12:59:50` (a 1-hour delay!).
- Conversely, if a link expires at `12:00:00`, and the profile was cached at `11:05:00`, the expired link continues to be served for 55 minutes after expiration.

#### Solution

Query all active links for the profile (without filtering `startsAt`/`expiresAt` in SQL), cache the profile in Redis, and filter `startsAt`/`expiresAt` against `new Date()` **on every read after deserializing from cache**:
```typescript
// apps/api/src/modules/profile/profile.service.ts
private filterActiveTimeWindowLinks<T extends { startsAt?: Date | string | null; expiresAt?: Date | string | null }>(
  links: T[],
): T[] {
  const now = Date.now();
  return links.filter((link) => {
    if (link.startsAt && new Date(link.startsAt).getTime() > now) return false;
    if (link.expiresAt && new Date(link.expiresAt).getTime() < now) return false;
    return true;
  });
}

async getPublicProfile(username: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const cacheKey = `profile:${normalizedUsername}`;

  const cached = await this.redis.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        links: this.filterActiveTimeWindowLinks(parsed.links || []),
      };
    } catch {
      this.logger.warn(`Corrupted cache key ${cacheKey}, falling back to DB`);
    }
  }
  // ... fetch from DB (where: { isActive: true } without startsAt/expiresAt filter), redact password URLs, cache in Redis, and return with this.filterActiveTimeWindowLinks(sanitizedProfile.links) ...
}
```

---

### BUG-07 (MEDIUM): Frontend Link Reordering & Drag-and-Drop Mutates Wrong Items When Filter Tab Is Active

#### Affected Files
- `apps/web/src/app/studio/links/page.tsx` (Lines 460–521, 719–735)

#### Problem
In `StudioLinksPage` (`apps/web/src/app/studio/links/page.tsx` L719–735):
```tsx
{filteredItems.map((item, idx) => (
  <LinkCard
    key={item.id}
    item={item}
    index={idx}
    total={filteredItems.length}
    onMoveUp={handleMoveUp}
    onMoveDown={handleMoveDown}
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}
```
`idx` is the index inside `filteredItems` (e.g., when `filter === "active"` or `filter === "archived"`), **not** the index inside `items`! Yet `handleMoveUp(index)`, `handleMoveDown(index)`, `handleDragStart(index)`, and `handleDragOver(e, index)` index directly into `items` (`[updated[index - 1], updated[index]] = ...`). When any filter other than `"all"` is active, moving or dragging a link swaps the wrong items in `items`.

#### Solution

Resolve item positions by `id` (or pass the real index in `items`):
```tsx
// apps/web/src/app/studio/links/page.tsx
{filteredItems.map((item) => {
  const realIndex = items.findIndex((i) => i.id === item.id);
  return (
    <LinkCard
      key={item.id}
      item={item}
      index={realIndex}
      total={items.length}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      // ...
    />
  );
})}
```

---

### BUG-08 (MEDIUM): Team Collaborations Vanish When Redis Evicts Keys (No PostgreSQL Fallback)

#### Affected Files
- `apps/api/src/modules/billing/billing.service.ts` (Lines 994–1102)

#### Problem
While `getTeamMembers()` falls back to PostgreSQL (`this.prisma.teamMember.findMany`) when Redis key `billing:team:${userId}` is empty, `getUserCollaborations()`, `acceptCollaboration()`, and `declineCollaboration()` **only read from Redis key `billing:user_invites:${email}`**!
- Any team members seeded in PostgreSQL (`packages/prisma/seed.ts` L555–582) or persisted before a Redis restart/eviction never appear in the collaborator's Workspace Switcher (`GET /api/billing/collaborations`) and cannot be accepted or declined!

#### Solution

Query `this.prisma.teamMember` directly (with `owner` and `owner.profile` included) in `getUserCollaborations`, `acceptCollaboration`, and `declineCollaboration`:
```typescript
// apps/api/src/modules/billing/billing.service.ts
async getUserCollaborations(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return [];

  const memberships = await this.prisma.teamMember.findMany({
    where: { email: user.email.toLowerCase() },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: { select: { id: true, username: true, displayName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return memberships
    .filter((m) => m.owner?.profile)
    .map((m) => ({
      memberId: m.id,
      ownerId: m.ownerId,
      ownerName: m.owner.profile?.displayName || m.owner.name || m.owner.email,
      ownerUsername: m.owner.profile!.username,
      ownerEmail: m.owner.email,
      profileId: m.owner.profile!.id,
      role: m.role,
      status: m.status as 'Active' | 'Pending',
      invitedAt: m.createdAt.toISOString(),
    }));
}
```

---

### BUG-09 (LOW): `updateThreatStatus` Audit Log Records New Status as `previousStatus`

#### Affected Files
- `apps/api/src/modules/sentinel-ai/sentinel-ai.service.ts` (Lines 420–439)

#### Problem
In `SentinelAiService.updateThreatStatus()`:
```typescript
const flag = await this.prisma.securityFlag.update({
  where: { id: flagId },
  data: { status: status as ThreatStatus, ... },
});

await this.prisma.adminAuditLog.create({
  data: {
    ...
    metadata: {
      submittedUrl: flag.submittedUrl,
      previousStatus: flag.status, // <-- Bug: flag.status is already the NEW status!
      newStatus: status,
    },
  },
});
```

#### Solution

Fetch the existing flag before updating so `previousStatus` is accurate (and throw `NotFoundException` if `flagId` does not exist):
```typescript
const existing = await this.prisma.securityFlag.findUnique({
  where: { id: flagId },
});
if (!existing) {
  throw new NotFoundException('Security threat flag not found');
}

const flag = await this.prisma.securityFlag.update({
  where: { id: flagId },
  data: {
    status: status as ThreatStatus,
    resolvedById: adminId,
    resolutionNotes: notes || `Updated to ${status} by administrator`,
  },
});

await this.prisma.adminAuditLog.create({
  data: {
    adminId,
    action: `THREAT_STATUS_${status}`,
    targetType: 'SECURITY_FLAG',
    targetId: flagId,
    reason: notes || `Changed threat status from ${existing.status} to ${status}`,
    metadata: {
      submittedUrl: flag.submittedUrl,
      previousStatus: existing.status,
      newStatus: status,
    },
  },
});
```

---

### BUG-10 (LOW): `UpdateProfileSchema` Missing Reserved Username Check & Case-Sensitivity Mismatch

#### Affected Files
- `packages/shared/src/index.ts` (Lines 7–36, 48–59, 76–81, 248–260)

#### Problem
1. `RegisterSchema` allows uppercase letters (`USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/`) and refines against `RESERVED_USERNAMES`, whereas `UpdateProfileSchema` uses a different regex (`/^[a-z0-9_-]+$/`) and omits the `.refine((val) => !RESERVED_USERNAMES.has(val.toLowerCase()))` check.
2. `UpdateLinkSchema` (L248–260) checks `if (data.url && (! data.type || data.type === 'LINK'))`, which allows updating a `LINK` with `url: ""` or `url: null` because `""` and `null` are falsy!

#### Solution

```typescript
// packages/shared/src/index.ts
export const UsernameFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(/^[a-z0-9_-]{3,30}$/, 'Username can only contain lowercase letters, numbers, underscores, and hyphens')
  .refine((val) => !RESERVED_USERNAMES.has(val), {
    message: 'This username is reserved by the platform',
  });
```
Use `UsernameFieldSchema` in both `RegisterSchema` and `UpdateProfileSchema`. And in `UpdateLinkSchema`:
```typescript
export const UpdateLinkSchema = LinkBaseSchema.partial()
  .extend({
    isActive: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.url !== undefined && (!data.type || data.type === 'LINK')) {
        return data.url !== null && isValidWebUrl(data.url);
      }
      return true;
    },
    {
      message: 'A valid web URL or domain (e.g., https://example.com) is required',
      path: ['url'],
    },
  );
```

---

## Part 3: Clean Architecture Violations

### ARCH-01 (HIGH): Controllers Directly Inject `PrismaService` & Execute Persistence/Domain Logic

#### Affected Files
- `apps/api/src/modules/sentinel-ai/admin-security.controller.ts` (Lines 45–234)
- `apps/api/src/modules/sentinel-ai/sentinel-ai.controller.ts` (Lines 25–43)

#### Problem
In Clean Architecture / Hexagonal Architecture, **Controllers belong to the Presentation/Transport layer** and should only handle HTTP routing, DTO validation, and delegating to Application/Domain Services.
- `AdminSecurityController` injects `PrismaService` directly (`private readonly prisma: PrismaService`) and contains 140+ lines of raw database queries, role-hierarchy business rules (`OWNER` vs `SUPER_ADMIN` vs `CREATOR`), and `adminAuditLog.create()` calls inside `getThreats()`, `getBlocklist()`, `getAuditLogs()`, `getUsersDirectory()`, and `updateUserRole()`.
- `SentinelAiController.getStats()` (`sentinel-ai.controller.ts` L36–41) also queries `this.prisma.securityFlag.groupBy(...)` directly inside the controller.

#### Solution

Move all database queries and role-governance business rules out of `AdminSecurityController` and `SentinelAiController` into `SentinelAiService` (or a dedicated `AdminGovernanceService`), and remove `PrismaService` from both controllers' constructors:
```typescript
// apps/api/src/modules/sentinel-ai/admin-security.controller.ts
@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER)
export class AdminSecurityController {
  constructor(private readonly sentinelService: SentinelAiService) {}

  @Get('threats')
  async getThreats(@Query('status') status?: ThreatStatus) {
    return this.sentinelService.getThreats(status);
  }

  @Get('users')
  async getUsersDirectory() {
    return this.sentinelService.getUsersDirectory();
  }

  @Patch('users/:id/role')
  @UsePipes(new ZodValidationPipe(UpdateUserRoleSchema))
  async updateUserRole(
    @CurrentUser('sub') adminId: string,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.sentinelService.updateUserRole(adminId, targetUserId, dto.role);
  }
  // ...
}
```

---

### ARCH-02 (MEDIUM): Dual `PrismaClient` & PG Pool Instantiation Across `@repo/prisma` and `apps/api`

#### Affected Files
- `packages/prisma/index.ts` (Lines 1–26)
- `apps/api/src/infrastructure/database/prisma.service.ts` (Lines 1–29)

#### Problem
`packages/prisma/index.ts` creates a `new PrismaPg({ connectionString })` and `new PrismaClient({ adapter })` immediately at module import time when `import { Role, LinkType } from '@repo/prisma'` is executed anywhere in `apps/api`. Then `PrismaService` in `apps/api` extends `PrismaClient` and creates a **second** `PrismaPg` connection pool!

#### Solution

Export types and enums from `@repo/prisma` without eagerly instantiating a connection pool on import, or use a lazy getter for the standalone client:
```typescript
// packages/prisma/index.ts
export * from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL ?? '';
    const adapter = new PrismaPg({ connectionString });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}
```

---

### ARCH-03 (MEDIUM): Monolithic 1,240-Line Frontend `api-client.ts` Mixing Transport, Auth Storage, Types & Mock Data

#### Affected Files
- `apps/web/src/lib/api-client.ts` (Lines 1–1240)

#### Problem
`apps/web/src/lib/api-client.ts` is a 1,240-line God-file that mixes:
1. Low-level HTTP transport and token management (`getAuthToken`, `authHeaders`)
2. Domain DTO interfaces duplicated from `@repo/shared` (`ProfilePayload`, `LinkItemPayload`, `BillingPlan`, `BillingSubscription`, `SecurityThreatItem`, etc.)
3. Hardcoded mock fallback datasets (`fetchBillingPlans` fallback, `fetchBillingMetrics` fallback, etc.)
4. 45+ API functions across 6 bounded contexts (`auth`, `profile`, `links`, `analytics`, `billing`, `admin-security`).

#### Solution

Split `apps/web/src/lib/api-client.ts` into domain-scoped API modules backed by a single typed `httpClient` helper:
```text
apps/web/src/lib/api/
  ├── http-client.ts       # Shared fetch wrapper, auth headers, error normalization
  ├── auth.api.ts          # login, register, fetchCurrentUser, changePassword
  ├── profile.api.ts       # fetchProfile, updateMyProfile, checkUsername, socialLinks
  ├── links.api.ts         # createLink, updateLink, deleteLink, reorderLinks, unlockLink
  ├── analytics.api.ts     # fetchAnalyticsOverview, trackPageView, trackLinkClick
  ├── billing.api.ts       # plans, subscription, checkout, invoices, team governance
  └── admin-security.api.ts # threats, blocklist, auditLogs, users, evaluateUrl
```
And import shared Zod-inferred types directly from `@repo/shared` instead of redeclaring them.

---

### ARCH-04 (MEDIUM): God-Services & God-Pages (`BillingService` 1,308 LOC; `appearance/page.tsx` 969 LOC; `links/page.tsx` 786 LOC)

#### Affected Files
- `apps/api/src/modules/billing/billing.service.ts` (1,308 lines)
- `apps/web/src/app/studio/appearance/page.tsx` (969 lines)
- `apps/web/src/app/studio/links/page.tsx` (786 lines)
- `apps/web/src/app/studio/billing/page.tsx` (595 lines)

#### Problem
1. `BillingService` handles **three distinct bounded contexts** in a single 1,308-line class:
   - Stripe Subscription & Checkout Lifecycle (`getPlans`, `getUserSubscription`, `createCheckoutSession`, `handleWebhook`, `getUserInvoices`)
   - Founder Executive Financial Telemetry (`getFinancialMetrics`, `getRecentBillingEvents`)
   - Multi-User Team Workspace RBAC & Invitations (`getTeamMembers`, `inviteTeamMember`, `revokeTeamMember`, `updateTeamMemberRole`, `getUserCollaborations`, `acceptCollaboration`, `declineCollaboration`)
2. Frontend Studio pages (`appearance/page.tsx`, `links/page.tsx`, `billing/page.tsx`) combine data fetching, `localStorage` synchronization, complex state transitions, HTML receipt generation, and hundreds of lines of JSX in single files.

#### Solution

- **Backend**: Split `BillingService` into:
  1. `SubscriptionService` (Plans, Stripe Checkout, Portal, Webhooks, Invoices)
  2. `BillingTelemetryService` (Founder MRR/ARR/ARPU KPIs & Event Ledger)
  3. `WorkspaceTeamService` (Team members, invitations, collaborations, seat limits)
- **Frontend**: Extract custom hooks (`useActiveWorkspace()`, `useStudioLinks()`, `useThemeCustomization()`, `useUsernameAvailability()`) and move sub-views (e.g., `ProfileIdentityForm`, `BackgroundCustomizer`, `InvoiceReceiptPrinter`) into dedicated components.

---

### ARCH-05 (MEDIUM): Overloaded Database Column (`Link.url`) Used to Store Multi-Line Note Body Text

#### Affected Files
- `packages/prisma/schema.prisma` (Lines 129–156)
- `apps/web/src/components/studio/AddEditLinkModal.tsx` (Line 179)
- `apps/web/src/components/profile/LinkPill.tsx` (Line 374)

#### Problem
For `NOTE` blocks, the frontend stores the multi-line text/announcement body inside `link.url` (`url: type === "NOTE" ? noteBody.trim() : ...`) and renders `link.url` as paragraph text in `LinkPill.tsx`. Overloading a semantic `url` column with arbitrary prose:
- Causes confusion in analytics tables (`TopLinksTable.tsx` had to add hacks to filter out non-URLs),
- Risks triggering URL validation or Sentinel AI false positives if not carefully special-cased everywhere.

#### Solution

Add an explicit nullable `content` (or `metadata` JSONB) column to `Link` in `packages/prisma/schema.prisma`:
```prisma
model Link {
  id                  String    @id @default(uuid()) @db.Uuid
  profileId           String    @map("profile_id") @db.Uuid
  title               String
  url                 String?
  content             String?   @db.Text // Used for NOTE body or block-specific description
  type                LinkType  @default(LINK)
  // ...
}
```

---

## Part 4: DRY (Don't Repeat Yourself) Violations

### DRY-01 (MEDIUM): `RESERVED_USERNAMES` Duplicated with Divergent Lists in `@repo/shared` and `ProfileService`

#### Affected Files
- `packages/shared/src/index.ts` (Lines 7–34)
- `apps/api/src/modules/profile/profile.service.ts` (Lines 180–200)

#### Problem
`RESERVED_USERNAMES` is defined in `@repo/shared`, and a second `private readonly RESERVED_USERNAMES = new Set([...])` is defined in `ProfileService` with a different set of words (e.g., `ProfileService` includes `'user'`, `'analytics'`, `'billing'`, `'links'`, `'appearance'`, `'moderation'` which are missing from `@repo/shared`, while `@repo/shared` includes `'onboarding'`, `'webhooks'`, `'health'`, `'docs'`, `'terms'`, `'privacy'`, `'security'`, `'root'`, `'system'` which are missing from `ProfileService`!).

#### Solution

Merge all reserved words into `RESERVED_USERNAMES` in `packages/shared/src/index.ts` and import `RESERVED_USERNAMES` in `ProfileService`:
```typescript
// packages/shared/src/index.ts
export const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'auth', 'billing', 'Control', 'dashboard', 'docs',
  'explore', 'graphql', 'health', 'help', 'legal', 'links', 'login',
  'logout', 'moderation', 'onboarding', 'pricing', 'privacy', 'profile',
  'register', 'root', 'security', 'sentinel', 'settings', 'Share',
  'signup', 'status', 'studio', 'support', 'system', 'terms', 'user',
  'webhooks', 'analytics', 'appearance', 'themes',
]);
```
```typescript
// apps/api/src/modules/profile/profile.service.ts
import { RESERVED_USERNAMES } from '@repo/shared';
// Remove this.RESERVED_USERNAMES and use RESERVED_USERNAMES.has(normalized)
```

---

### DRY-02 (MEDIUM): `PRESET_THEMES` Duplicated Across `packages/prisma/seed.ts` and `studio/appearance/page.tsx`

#### Affected Files
- `packages/prisma/seed.ts` (Lines 15–104)
- `apps/web/src/app/studio/appearance/page.tsx` (Lines 65–162)

#### Problem
All 8 default theme presets (`Obsidian Noir`, `Emerald Matrix`, `alabaster Minimal`, `Cyber Sunset`, `Crimson Velvet`, `Solar Flare`, `Matcha Zen`, `Cotton Candy`) and their color/button configurations are hardcoded in both `packages/prisma/seed.ts` and `apps/web/src/app/studio/appearance/page.tsx`.

#### Solution

Export `CANONICAL_THEME_PRESETS` from `packages/shared/src/index.ts` (just like `CANONICAL_PLANS`) and import it in both `packages/prisma/seed.ts` and `apps/web/src/app/studio/appearance/page.tsx`.

---

### DRY-03 (MEDIUM): Subscription Auto-Downgrade Logic Copy-Pasted Between `AuthService` and `BillingService`

#### Affected Files
- `apps/api/src/modules/auth/auth.service.ts` (Lines 185–217)
- `apps/api/src/modules/billing/billing.service.ts` (Lines 182–213)

#### Problem
The exact 32-line block that checks `activeSubscription.currentPeriodEnd < now`, marks the expired subscription as `'CANCELED'`, finds the `'FREE'` plan, and creates or updates a `'FREE'` subscription is duplicated verbatim in `AuthService.getMe()` and `BillingService.getUserSubscription()`.

#### Solution

Extract `ensureValidSubscription(userId: string)` in `BillingService` (or a shared domain service) and call it from both places:
```typescript
// apps/api/src/modules/billing/billing.service.ts
async ensureActiveSubscription(userId: string) {
  let activeSub = await this.prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });

  if (
    activeSub &&
    activeSub.plan.code !== 'FREE' &&
    activeSub.currentPeriodEnd &&
    new Date(activeSub.currentPeriodEnd) < new Date()
  ) {
    await this.prisma.subscription.update({
      where: { id: activeSub.id },
      data: { status: 'CANCELED' },
    });

    const freePlan = await this.prisma.plan.findUnique({ where: { code: 'FREE' } });
    if (freePlan) {
      activeSub = await this.prisma.subscription.create({
        data: { userId, planId: freePlan.id, status: 'ACTIVE' },
        include: { plan: true },
      });
    } else {
      activeSub = null;
    }
  }
  return activeSub;
}
```

---

### DRY-04 (MEDIUM): Active Workspace Resolution (`onelink_active_workspace`) Copy-Pasted Across 6 Studio Pages

#### Affected Files
- `apps/web/src/app/studio/layout.tsx` (Lines 85–116)
- `apps/web/src/app/studio/links/page.tsx` (Lines 169–196)
- `apps/web/src/app/studio/appearance/page.tsx` (Lines 232–245)
- `apps/web/src/app/studio/analytics/page.tsx` (Lines 93–103)
- `apps/web/src/app/studio/billing/page.tsx` (Lines 107–120)
- `apps/web/src/app/studio/settings/page.tsx` (Lines 66–81)

#### Problem
Every Studio page independently reads `localStorage.getItem("onelink_active_workspace")`, parses JSON, listens to `window.addEventListener("workspace_switched", ...)`, and fetches `fetchCurrentUser()` + `fetchMyCollaborations()` on mount. This causes redundant `/api/auth/me` and `/api/billing/collaborations` network waterfalls on every tab switch and duplicates 30+ lines of boilerplate in 6 files.

#### Solution

Provide a React Context (`WorkspaceProvider` + `useWorkspace()`) inside `apps/web/src/app/studio/layout.tsx`:
```tsx
// apps/web/src/context/workspace-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CurrentUserSession, CollaborationInvite, fetchCurrentUser, fetchMyCollaborations } from "@/lib/api-client";

interface WorkspaceContextValue {
  user: CurrentUserSession | null;
  activeProfileId: string | null;
  activeUsername: string | null;
  isCollaborating: boolean;
  collaborations: CollaborationInvite[];
  loading: boolean;
  switchWorkspace: (workspace: { profileId: string; ownerUsername: string; ownerName: string; role: string } | null) => void;
  refreshWorkspace: () => Promise<void>;
}
// Wrap children in studio/layout.tsx with <WorkspaceProvider> and consume via useWorkspace() in all child pages.
```

---

### DRY-05 (LOW): Button Style Computation & Block Rendering Duplicated Across `LinkPill.tsx`, `PhonePreview.tsx` & `AppearancePreview.tsx`

#### Affected Files
- `apps/web/src/components/profile/LinkPill.tsx` (Lines 78–112)
- `apps/web/src/components/studio/PhonePreview.tsx` (Lines 106–142)
- `apps/web/src/components/studio/appearance/AppearancePreview.tsx` (Lines 112–146)

#### Problem
`getDynamicStyles()` in `LinkPill.tsx` and `getButtonInlineStyle()` in `PhonePreview.tsx` and `AppearancePreview.tsx` implement identical button CSS calculations (`FILLED`, `OUTLINE`, `SHADOW`, `ROUNDED`, contrast border fallback).

#### Solution

Move `getThemeButtonStyles(themeConfig, bgValue)` into `apps/web/src/lib/theme-contrast.ts` and import it in both `LinkPill.tsx` and `PhonePreview.tsx` (and delete unused `AppearancePreview.tsx`).

---

### DRY-06 (LOW): Debounced Username Availability Check Duplicated Across 3 Pages

#### Affected Files
- `apps/web/src/app/page.tsx` (Lines 35–68)
- `apps/web/src/app/(auth)/register/page.tsx` (Lines 42–75)
- `apps/web/src/app/studio/appearance/page.tsx` (Lines 391–426)

#### Problem
All three pages implement the exact same 35-line `useEffect` with `setTimeout(..., 320)`, regex check, and `checkUsernameAvailability()` call.

#### Solution

Extract a reusable `useUsernameAvailability(username, currentUsername?)` hook in `apps/web/src/hooks/use-username-availability.ts`:
```typescript
import { useState, useEffect } from "react";
import { checkUsernameAvailability } from "@/lib/api-client";

export function useUsernameAvailability(username: string, currentUsername?: string) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setStatus("idle");
      return;
    }
    if (currentUsername && clean === currentUsername.trim().toLowerCase()) {
      setStatus("available");
      return;
    }
    if (clean.length < 3 || clean.length > 30 || !/^[a-z0-9_-]+$/.test(clean)) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(clean);
      if (!cancelled) {
        setStatus(res.available ? "available" : "taken");
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, currentUsername]);

  return status;
}
```

---

## Part 5: KISS (Keep It Simple, Stupid) Violations

### KISS-01 (HIGH): Dual Redis + PostgreSQL Primary Storage for Team Members, Invitations & Billing Events

#### Affected Files
- `apps/api/src/modules/billing/billing.service.ts` (Lines 673–1102)

#### Problem
`BillingService` stores Team Members (`billing:team:${userId}`), User Collaborations (`billing:user_invites:${email}`), and Billing Events (`billing:events:recent`) as **mutated JSON arrays in Redis** while *also* trying to mirror them into PostgreSQL (`this.prisma.teamMember`, `this.prisma.teamInvitation`, `this.prisma.billingEvent`) inside `try/catch` blocks.
- This dual-write anti-pattern adds ~350 lines of complex synchronization code, causes ID mismatches (Redis generates `tm_${Date.now()}` while PostgreSQL generates a UUID), and loses data whenever Redis restarts.
- PostgreSQL is already the source of truth with proper foreign keys and indexes (`team_members`, `team_invitations`, `billing_events`).

#### Solution

Use PostgreSQL (`this.prisma.teamMember`, `this.prisma.billingEvent`) as the **single source of truth**, and only use Redis as a read-through cache (or omit Redis caching for low-frequency team management endpoints altogether).

---

### KISS-02 (MEDIUM): Production Services Polluted with Unit-Test Mock Guards (`if (this.prisma.user?.findUnique)`)

#### Affected Files
- `apps/api/src/common/services/profile-access.service.ts` (Lines 41, 50)
- `apps/api/src/modules/link/link.service.ts` (Line 124)
- `apps/api/src/modules/billing/billing.service.ts` (Lines 85, 297, 709)

#### Problem
Production service methods contain defensive checks like:
```typescript
if (this.prisma.subscription && this.prisma.link.count) { ... }
if (this.prisma.user?.findUnique) { ... }
if (this.prisma.teamMember?.findFirst) { ... }
```
These were added only because unit test mocks (`*.service.spec.ts`) provided incomplete `PrismaService` mock objects. Polluting production business logic to accommodate incomplete unit test mocks hides bugs and makes control flow harder to reason about.

#### Solution

Create a shared `createMockPrismaService()` helper in `apps/api/src/test-utils/prisma-mock.ts` that provides `jest.fn()` stubs for all Prisma models, and remove the `if (this.prisma.model?.method)` guards from production code.

---

### KISS-03 (LOW): Clever `API_BASE_URL` Object `toString()` Coercion Trick

#### Affected Files
- `apps/web/src/lib/api-client.ts` (Lines 3–7)

#### Problem
```typescript
const API_BASE_URL = {
  toString() {
    return getApiBaseUrl();
  },
};
```
Relying on implicit JavaScript object-to-primitive coercion inside template literals (`fetch(`${API_BASE_URL}/profiles/me`)`) is an unnecessary anti-pattern (`typeof API_BASE_URL === "object"`, which breaks if passed to `new URL(path, API_BASE_URL)`).

#### Solution

Call `getApiBaseUrl()` directly inside a centralized `apiFetch(path: string, init?: RequestInit)` helper function.

---

### KISS-04 (MEDIUM): Silent Mock Fallback Data in Production API Client Masking Real Backend Errors

#### Affected Files
- `apps/web/src/lib/api-client.ts` (Lines 682–818)
- `apps/web/src/app/admin/moderation/page.tsx` (Lines 31–165, 211–227)
- `apps/web/src/components/admin/LiveUrlSandbox.tsx` (Lines 50–64)

#### Problem
When backend API calls fail (`401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`, or network timeout), functions in `api-client.ts` (`fetchBillingMetrics`, `fetchBillingEvents`, `fetchTeamMembers`) and `AdminModerationPage` silently swallow the error and return hardcoded demo arrays (`MRR: $18,420`, fake team members, fake security threats). In production, operators and users see fabricated telemetry instead of an error state or login prompt.

#### Solution

Throw typed API errors from `api-client.ts` on non-2xx responses and render explicit error banners / retry buttons in the UI (only enable demo fallbacks when `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`).

---

## Part 6: Clean Code & TypeScript Best Practices

### CLEAN-01 (MEDIUM): Global `BigInt.prototype.toJSON` Prototype Mutation

#### Affected Files
- `apps/api/src/main.ts` (Lines 7–9)

#### Problem
```typescript
// Fix BigInt serialization for JSON responses
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};
```
1. Mutating built-in global prototypes (`BigInt.prototype`) is a TypeScript/JavaScript anti-pattern that can affect third-party libraries.
2. `Number(this)` loses precision for 64-bit integers above `Number.MAX_SAFE_INTEGER` ($2^{53} - 1$).

#### Solution

Use a NestJS `ClassSerializerInterceptor` or a lightweight global `TransformInterceptor` (or convert `clickCount` explicitly in DTO mapping):
```typescript
// apps/api/src/common/interceptors/bigint-serializer.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function replaceBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  }
  if (Array.isArray(value)) return value.map(replaceBigInt);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, replaceBigInt(v)]),
    );
  }
  return value;
}

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => replaceBigInt(data)));
  }
}
```

---

### CLEAN-02 (MEDIUM): Pervasive `any` Casts and Untyped JSON Columns (`Theme.config`, `Plan.features`)

#### Affected Files
- `apps/api/src/modules/billing/billing.service.ts` (`as any` used 25+ times)
- `apps/api/src/modules/link/link.service.ts` (`plan.features as Record<string, any>`)
- `apps/web/src/app/[username]/page.tsx` (`themeConfig: any`)

#### Problem
`Plan.features` and `Theme.config` are stored as `Json` in Prisma and cast to `any` or `Record<string, any>` across the codebase, losing compile-time type safety and autocomplete.

#### Solution

Export `PlanFeatures` and `ThemeConfig` interfaces from `packages/shared/src/index.ts` and parse/type-narrow JSON columns with `ThemeConfigSchema.parse()` / `PlanFeaturesSchema.parse()`.

---

### CLEAN-03 (LOW): Dead Code (`AppearancePreview.tsx` 338 LOC, No-Op `handleResend` in `TeamGovernanceSection.tsx`)

#### Affected Files
- `apps/web/src/components/studio/appearance/AppearancePreview.tsx` (Lines 1–338)
- `apps/web/src/components/studio/billing/TeamGovernanceSection.tsx` (Lines 105–108)

#### Problem
1. `AppearancePreview.tsx` (338 lines) is never imported anywhere in the project (`studio/appearance/page.tsx` uses `PhonePreview.tsx` instead).
2. In `TeamGovernanceSection.tsx` (L105–108), clicking **"Resend Invite"** calls `handleResend(member.email)` which only sets a local toast string (`setToastMsg("⚡ Sandbox Email Dispatched...")`) without making any API request to resend the email.

#### Solution

1. Delete `apps/web/src/components/studio/appearance/AppearancePreview.tsx`.
2. Wire `handleResend` in `TeamGovernanceSection.tsx` to call `apiInviteTeamMember({ name: member.name, email: member.email, role: member.role })` (or a dedicated `POST /api/billing/team/:id/resend` endpoint).

---

### CLEAN-04 (LOW): Swallowed Exceptions (`catch {}`) Without Logging or User Feedback

#### Affected Files
- `apps/web/src/components/admin/DomainBlocklistManager.tsx` (Lines 55–57)
- `apps/web/src/app/studio/links/page.tsx` (Lines 477, 496, 520, 540, 560)

#### Problem
Multiple `catch {}` blocks silently ignore failed mutations (such as removing a blocklist domain, reordering links, or deleting a link), leaving the UI state out of sync with the backend without informing the user.

#### Solution

Rollback optimistic UI state and surface an error toast (`setErrorNotice(...)`) whenever an API mutation throws or returns `false`.

---

## Part 7: Infrastructure, DevOps & CI/CD Issues

### OPS-01 (HIGH): CI Pipeline Skips `lint` and `test` & Runs `typecheck` Before Workspace Package Builds

#### Affected Files
- `.github/workflows/ci.yml` (Lines 10–48)
- `turbo.json` (Lines 13–15)

#### Problem
1. **Missing Lint & Tests in CI**: The GitHub Actions job in `.github/workflows/ci.yml` is named `"Lint, Typecheck & Build"`, but it **never runs `pnpm turbo run lint` or `pnpm turbo run test`**! Regressions in unit tests or lint rules pass CI silently.
2. **`typecheck` Fails Before `build` on Clean Clones**: `@repo/shared` and `@repo/prisma` specify `"types": "./dist/index.d.ts"` in their `package.json`, which is only emitted during `build` (`tsc`). Because `turbo.json` defines `"typecheck": { "dependsOn": ["^typecheck"] }` instead of `["^build", "^typecheck"]`, running `pnpm turbo run typecheck` before `pnpm turbo run build` in CI fails if `dist/` has not been built yet.

#### Solution

1. **Update `turbo.json` so `typecheck` depends on upstream package builds**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build", "^lint"]
    },
    "typecheck": {
      "dependsOn": ["^build", "^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

2. **Add `lint` and `test` steps to `.github/workflows/ci.yml`**:
```yaml
      - name: Build Shared Packages & Applications
        run: pnpm turbo run build

      - name: Run Linter
        run: pnpm turbo run lint

      - name: Run Typecheck
        run: pnpm turbo run typecheck

      - name: Run Unit Tests
        run: pnpm turbo run test
```

---

### OPS-02 (MEDIUM): Environment Files & Plaintext Secrets Management

#### Affected Files
- `.gitignore` (Lines 16–20)
- `apps/api/src/modules/auth/auth.service.ts` (Lines 39–63)

#### Problem
1. `.gitignore` uses `.env*.local` and `.env`, which is good, but `apps/api/.env` and `.env` exist in the workspace with credentials; if someone runs `git add -f` or changes `.gitignore`, secrets could leak.
2. `AuthService.DEMO_ACCOUNTS` (`apps/api/src/modules/auth/auth.service.ts` L39–63) auto-provisions an `OWNER` account (`cris@onelink.bio` / `Password123!`) and a `SUPER_ADMIN` account (`admin@onelink.bio` / `Password123!`) on demand inside `AuthService.login()`—even in production! If those accounts don't exist yet or were deleted in production, anyone logging in with `cris@onelink.bio` and `Password123!` in production will auto-create an `OWNER` account with full administrative control.

#### Solution

Restrict `ensureDemoAccountIfMatched()` in `apps/api/src/modules/auth/auth.service.ts` strictly to non-production environments:
```typescript
// apps/api/src/modules/auth/auth.service.ts
private async ensureDemoAccountIfMatched(email: string) {
  if (this.config.get<string>('NODE_ENV') === 'production') {
    return null;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const demoSpec = this.DEMO_ACCOUNTS[normalizedEmail];
  if (!demoSpec) return null;
  // ...
}
```

---

### OPS-03 (HIGH): Missing Rate Limiting (`@nestjs/throttler`) on Auth, PIN Unlock, and Analytics Endpoints

#### Affected Files
- `apps/api/src/app.module.ts` (Lines 1–30)
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/link/link.controller.ts` (`POST /api/links/:id/unlock`)
- `apps/api/src/modules/analytics/track.controller.ts` (`POST /api/track/view`, `POST /api/track/click`)

#### Problem
There is no rate limiting anywhere in `apps/api`:
- **`POST /api/links/:id/unlock`**: Protected links often use 4-digit PINs (only 10,000 combinations). Without rate limiting, an attacker can brute-force any PIN-protected link in seconds.
- **`POST /api/auth/login` & `/register`**: Vulnerable to credential stuffing and brute-force attacks.
- **`POST /api/track/view` & `/click`**: Vulnerable to analytics inflation/flooding attacks.

#### Solution

Use Redis-backed rate limiting (either via `@nestjs/throttler` or a lightweight Redis sliding-window guard using the existing `RedisService`):
```typescript
// apps/api/src/common/guards/rate-limit.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const routeKey = `ratelimit:${req.method}:${req.route?.path || req.url}:${ip}`;

    const client = this.redis.getClient();
    const current = await client.incr(routeKey);
    if (current === 1) {
      await client.expire(routeKey, 60); // 60-second window
    }

    const limit = req.url.includes('/unlock') || req.url.includes('/auth/login') ? 10 : 60;
    if (current > limit) {
      throw new HttpException(
        'Too many requests. Please try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
```

---

## Recommended Remediation Priority Roadmap

1. **Immediate (P0 — Blockers before any public deployment)**:
   - Fix **SEC-01** (redact password-protected link URLs in `getPublicProfile`, add `@UseGuards(JwtAuthGuard)` + `ProfileAccessService` + `select` to `GET /api/links/profile/:profileId`).
   - Fix **SEC-02** & **OPS-02** (disable mock Google OAuth codes and auto-provisioned `OWNER`/`SUPER_ADMIN` demo accounts when `NODE_ENV === 'production'`, fix `resolveFrontendUrl` open redirect).
   - Fix **SEC-03** & **SEC-04** (enable `rawBody: true`, require `stripe-signature` in `handleWebhook`, stop falling back to free simulation on Stripe errors, verify `session.metadata.userId === userId` in `confirmCheckoutSession`).
   - Fix **SEC-05** (add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.OWNER, Role.SUPER_ADMIN)` to `/billing/metrics` and `/billing/events`).
2. **Short-Term (P1 — Core Security & Functional Correctness)**:
   - Fix **SEC-06**, **SEC-07**, **SEC-08**, **SEC-09**, **SEC-11** (Redis ban enforcement + cache eviction, collaborator role weight checks, strict CORS allowlist, social link URL + Sentinel validation, `/admin/moderation` auth redirect).
   - Fix **BUG-01**, **BUG-02**, **BUG-03**, **BUG-04**, **OPS-03** (wildcard domain matching in Sentinel AI, attach `ZodValidationPipe` to all controllers, check workspace owner's subscription for link quotas/features, align Python/TS ML feature extraction, add rate limiting).
3. **Medium-Term (P2 — Architecture, DRY, KISS & CI Hygiene)**:
   - Fix **BUG-05** through **BUG-10**, **OPS-01**, **ARCH-01** through **ARCH-05**, **DRY-01** through **DRY-06**, **KISS-01** through **KISS-04**, and **CLEAN-01** through **CLEAN-04**.
