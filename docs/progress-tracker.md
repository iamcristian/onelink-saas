# 📋 OneLink Project Progress Tracker & Setup Guide

> **Project Name**: **OneLink** (`onelink.bio`) — High-Scalability Creator Link-in-Bio Platform  
> **Last Updated**: 2026-10-14  
> **Current Phase**: SDLC Analysis & Visual Design Complete (100%) — Transitioning to Phase 1 (Domain TDD)  
> **Google Stitch Canvas**: Unified Project `14141085438200447026` (`Carbon Architecture`)

---

## 📌 Executive Summary of Work Completed So Far

Before writing domain business logic, we established two robust pillars:
1. **Foundation & Monorepo Infrastructure (Phase 0)**: Monorepo tooling, containerized database engines, Redis caching, shared validation schemas, and automated build pipelines.
2. **Formal SDLC System Design & Prototyping**: Complete product specifications, IEEE 830 software requirements, C4 architecture diagrams, Mermaid ERD and sequence flows, and a unified 4-screen visual mockup suite generated and synced in **Google Stitch**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MONOREPO STATUS BOARD                           │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│ Workspace / Package │ Tech & Version           │ Status                │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ Root Monorepo       │ Turborepo 2.11 + pnpm 12 │ ✅ Fully configured   │
│ `apps/api`          │ NestJS 12.0 + SWC        │ ✅ Scaffolded & tested│
│ `apps/web`          │ Next.js 16.4 + React 19  │ ✅ Scaffolded & tested│
│ `packages/prisma`   │ Prisma 6.4 + TimescaleDB │ ✅ Schemas & seeded   │
│ `packages/shared`   │ TypeScript + Zod 3.24    │ ✅ Validated & typed  │
│ `@repo/ts-config`   │ Modular tsconfig profiles│ ✅ Base, Nest, Next   │
│ `infrastructure/`   │ Docker Compose (PG+Redis)│ ✅ Healthy & running  │
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 🛠️ Detailed Inventory of Completed Tasks

### 1. Monorepo Root Configuration
- **`pnpm-workspace.yaml`**: Configured for `apps/*` and `packages/*`, with `allowBuilds` policy allowing native build scripts for Prisma, esbuild, and SWC without security blocks.
- **`turbo.json`**: Configured for Turborepo 2 pipelines (`build`, `dev`, `lint`, `typecheck`, `test`).
- **`.gitignore` & `.editorconfig`**: Clean root hygiene ignoring node_modules, build caches, and sensitive environment keys.
- **`.env` & `.env.example`**: Complete environment variable template with database, Redis, JWT, and application port configurations.

### 2. Shared Packages (`packages/`)
- **`packages/typescript-config`**:
  - `base.json`: Modern strict TypeScript rules.
  - `nestjs.json`: Tailored for NestJS (`nodenext` module resolution, experimental decorators).
  - `nextjs.json`: Tailored for Next.js 16 App Router (JSX preserve, bundler resolution).
  - Exported cleanly via modern package `exports` map.
- **`packages/prisma`**:
  - `schema.prisma`: Complete relational schema (`User`, `Profile`, `Link`, `Theme`, `CustomTheme`, `SocialLink`).
  - `seed.ts`: Seed script with 5 preset themes.
  - `dotenv-cli` integration: Reads root `../../.env` automatically.
- **`packages/shared`**:
  - Centralized Zod validation schemas (`RegisterSchema`, `LoginSchema`, `CreateLinkSchema`, `UpdateProfileSchema`, `TrackClickSchema`).
  - Shared TypeScript types and reserved username blocklist (`admin`, `api`, `dashboard`, `onelink`, etc.).

### 3. Local Infrastructure (`infrastructure/docker/`)
- **`docker-compose.yml`**:
  - `timescale/timescaledb:latest-pg16`: Running on port `5432`.
  - `redis:7-alpine`: Running on port `6379`.
  - `mailhog/mailhog:latest`: Running on ports `8025` (Web UI) and `1025` (SMTP).
- **Database Status**:
  - Tables pushed and synchronized via `pnpm --filter @repo/prisma db:push`.
  - Initial themes seeded into database via `pnpm --filter @repo/prisma db:seed`.

### 4. Backend Application (`apps/api`)
- **NestJS 12.0** initialized with SWC compiler (`builder: "swc"` in `nest-cli.json` compiles in ~76ms).
- **`DatabaseModule` (`PrismaService`)**: Global module with connection lifecycle hooks.
- **`CacheModule` (`RedisService`)**: Global Redis service with auto-reconnection and circuit-breaker fallback.
- **`main.ts`**: Port 3001, global `/api` prefix, CORS enabled, and Swagger OpenAPI documentation configured at `/api/docs`.
- **Testing**: Jest unit tests passing with Node 24 VM modules.

### 5. Frontend Application (`apps/web`)
- **Next.js 16.4** initialized with App Router (`src/app/`).
- **React 19** integration.
- **Tailwind CSS v4** with `@tailwindcss/turbopack`.
- Linked to `@repo/shared` and `@repo/typescript-config`.

---

## 🔍 Verification Evidence

All builds, tests, and typechecks pass across the entire monorepo:

```bash
# 1. Typecheck all packages and apps (4 projects):
$ pnpm turbo run typecheck
Tasks: 4 successful, 4 total (0 errors)

# 2. Build all apps (NestJS SWC + Next.js Turbopack):
$ pnpm turbo run build
Tasks: 2 successful, 2 total (Time: 7.4s)

# 3. Unit test execution:
$ pnpm turbo run test
PASS src/app.controller.spec.ts (1 test passed)
```

---

## 🧭 SDLC Deliverables & Specification Board

To ensure strict engineering rigor before starting feature development, the following formal SDLC specifications have been planned, diagrammed, and modularized in `/docs`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SDLC SPECIFICATION BOARD                        │
├─────────────────────────┬──────────────────────────┬───────────────────┤
│ Artifact Document       │ Focus Area               │ Status            │
├─────────────────────────┼──────────────────────────┼───────────────────┤
│ `docs/prd.md`           │ Personas & User Stories  │ ✅ Approved       │
│ `docs/srs.md`           │ IEEE 830 Req & SLAs      │ ✅ Approved       │
│ `docs/architecture/`    │                          │                   │
│   ├── database-design.md│ Mermaid ERD & Timescale  │ ✅ Approved       │
│   ├── system-arch.md    │ C4 Context, Container    │ ✅ Approved       │
│   ├── sequence-flows.md │ Hot Path & Telemetry     │ ✅ Approved       │
│   └── user-flows.md     │ Visitor & Creator Flows  │ ✅ Approved       │
│ `docs/ui-ux/`           │                          │                   │
│   ├── DESIGN.md         │ Carbon Architecture DS   │ ✅ Approved       │
│   ├── wireframes.md     │ Screen Specifications    │ ✅ Approved       │
│   ├── prompts/          │ Stitch Enhanced Prompts  │ ✅ Ready          │
│   └── mockups/          │ 4 PNGs & 4 HTML sources  │ ✅ 100% Generated │
│ `docs/adr/`             │ ADRs 001 - 004           │ ✅ Documented     │
│ `docs/test-plan.md`     │ QA Strategy & TDD Matrix │ ✅ Approved       │
│ `docs/master-plan.md`   │ 16-Week Product Roadmap  │ ✅ Approved       │
└─────────────────────────┴──────────────────────────┴───────────────────┘
```

---

## 🎨 UI/UX Mockups & Google Stitch Unified Canvas

All 6 visual screens for **OneLink** have been generated within the unified Google Stitch project (`14141085438200447026`), downloaded into `docs/ui-ux/mockups/`, and documented in [`docs/ui-ux/wireframes-and-mockups.md`](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/wireframes-and-mockups.md):

| # | Screen Name | Route | Viewport | Assets (PNG & HTML) | Stitch Screen ID |
|---|---|---|---|---|---|
| **1** | **Public Profile Page** | `/@alexrivera` | Mobile `390×844` | [PNG](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-1-profile.png) · [HTML](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-1-profile.html) | `c30c125858234fca8b5fe40e4cacaf18` |
| **2** | **OneLink Studio: Links** | `/studio/links` | Desktop `1440p` | [PNG](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-2-studio-dashboard.png) · [HTML](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-2-studio-dashboard.html) | `3b207412755a4c7cb36b6db10b8ca731` |
| **3** | **OneLink Studio: Appearance** | `/studio/appearance` | Desktop `1440p` | [PNG](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-3-appearance.png) · [HTML](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-3-appearance.html) | `b7727bd8e4194a6cb808d171e3c3d79a` |
| **4** | **OneLink Studio: Analytics** | `/studio/analytics` | Desktop `1440p` | [PNG](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-4-analytics.png) · [HTML](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-4-analytics.html) | `abefbcf5251c48c0b9b8cbd9d4bead72` |
| **5** | **OneLink Sentinel & Super Admin** | `/admin/moderation` | Desktop `1440p` | [PNG](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-5-sentinel-admin.png) · [HTML](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-5-sentinel-admin.html) | `56f795e49afc48eab739aaff864c6e4d` |
| **6** | **SaaS Owner Billing & Plans** | `/studio/billing` | Desktop `1440p` | [PNG](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-6-owner-billing.png) · [HTML](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/screen-6-owner-billing.html) | `7166b9dd037147f480ff75607c67a554` |

- **Design System**: Carbon Architecture (`assets/fa13b5dff1214ff1972bdfec24eb4cc5`).
- **Palette**: Strictly Monochromatic Off-Black (Zinc 950 `#09090b` canvas, `#121215` cards, `#27272a` borders, pure white `#ffffff` pills, Geist + JetBrains Mono).
- **Interactivity & Motion**: Hardware-accelerated CSS animations (`@keyframes shimmer`, `scale(1.02)`, `active:scale(0.98)`), micro-interactions, responsive hover states, two-way reactive state sync, and live iPhone 15 Pro preview synchronization.

---

## 🚀 Phase 1 Domain Implementation Progress

With Phase 0 (Infrastructure & Monorepo) and SDLC Requirements, Database, Architecture, and 6-Screen Wireframes fully designed:
1. **Module 3: `SentinelAiModule`** (✅ Complete & Verified — 10/10 unit tests passing):
   - Zero-token in-process threat analyzer (<18ms latency SLA).
   - Shannon entropy calculator on domain labels (`H(X) >= 3.5` for algorithmic DGA detection).
   - Punycode (`xn--`) and Cyrillic/Greek homoglyph spoofing detector.
   - High-value brand typosquatting & crypto-drainer keyword heuristics.
   - O(1) Redis global domain blocklist synchronization.
   - Telemetry endpoint (`GET /api/sentinel/telemetry`) and threat feed (`GET /api/admin/security/threats`).
2. **Module 2: `LinkModule`** (✅ Complete & Verified — 9/9 unit tests passing):
   - Real-time Sentinel AI link interception (`createLink` and `updateLink`).
   - Automated `SecurityFlag` persistence with `BLOCKED_AUTO` or `PENDING_REVIEW` status.
   - Position auto-indexing and atomic reordering transaction (`PUT /api/links/profile/:profileId/reorder`).
   - Link deletion with position cleanup.
3. **Module 1: `ProfileModule` & `AuthModule`** (⏳ Next Step — Vanity slug reservation `/@username`, JWT tokens, Redis profile cache).
4. **Module 4: `AnalyticsModule`** (High-throughput Beacon API, BullMQ ingestion, TimescaleDB Hypertables).
5. **Module 5: `BillingAndAdminModule`** (Stripe subscription tiers, Super Admin threat stream & user suspension).
6. **Module 6: `Web UI`** (Next.js 16 components aligned with all 6 approved wireframes).
