# 🔗 Link-in-Bio Platform

> High-performance, scalable Link-in-Bio platform (Linktree-style) engineered with modern distributed system design, clean architecture, and enterprise SDLC workflows.

---

## ⚡ Tech Stack (2026 Standards)

- **Monorepo**: [Turborepo 2](https://turbo.build/) + [pnpm 10 Workspaces](https://pnpm.io/)
- **Frontend (`apps/web`)**: [Next.js 15.2+](https://nextjs.org/) (App Router, Server Components, ISR) + [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Backend API (`apps/api`)**: [NestJS 11](https://nestjs.com/) (SWC compiler, modular architecture, DI)
- **Database Layer**: [PostgreSQL 16](https://www.postgresql.org/) + [TimescaleDB](https://www.timescale.com/) (hypertable analytics)
- **Cache & Queues**: [Redis 7 Stack](https://redis.io/) + [BullMQ](https://docs.bullmq.io/)
- **ORM & Data Contracts**: [Prisma 6](https://www.prisma.io/) + [Zod 3.24+](https://zod.dev/)
- **Quality & Testing**: Vitest, Jest, Supertest, Playwright (E2E), k6 (load testing)

---

## 🏛️ System Architecture Overview

```
                      ┌───────────────────────────┐
                      │    Edge CDN (Cloudflare)  │
                      └─────────────┬─────────────┘
                                    │
                      ┌─────────────▼─────────────┐
                      │       Nginx Gateway       │
                      └─────────────┬─────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             │                                             │
   ┌─────────▼─────────┐                         ┌─────────▼─────────┐
   │ Next.js 15 (Web)  │                         │  NestJS 11 (API)  │
   │ • ISR Profiles    │─────── Internal ───────►│ • Modular Domain  │
   │ • Live Dashboard  │          HTTP           │ • Rate Limiting   │
   └───────────────────┘                         └─────────┬─────────┘
                                                           │
                                ┌──────────────────────────┼──────────────────────────┐
                                │                          │                          │
                      ┌─────────▼─────────┐      ┌─────────▼─────────┐      ┌─────────▼─────────┐
                      │   Redis 7 Stack   │      │   BullMQ Queue    │      │  PostgreSQL 16    │
                      │ • Profile Blobs   │      │ • Async Clicks    │      │  + TimescaleDB    │
                      │ • Rate Limiting   │      │ • PageView Worker │      │ • Hypertables     │
                      └───────────────────┘      └───────────────────┘      └───────────────────┘
```

---

## 📚 SDLC & Project Documentation

All formal engineering specifications live inside the [`docs/`](./docs) folder:

- 📖 **[Master Plan (Full Specification)](./docs/master-plan.md)**: Product vision, ERDs, C4 diagrams, and 16-week roadmap.
- 📐 **Architecture & ADRs**: *(`docs/adr/` - in progress)*
- 📋 **Product Requirements (PRD)**: *(`docs/prd.md` - Phase 0)*
- 🧪 **Test Strategy & Matrix**: *(`docs/test-plan.md` - Phase 0)*

---

## 🗺️ Roadmap & Phase Tracker

- [ ] **Phase 0: Foundation & Infrastructure** *(Current)*
  - Monorepo scaffold (`pnpm` + `turbo`)
  - Shared TypeScript & ESLint packages
  - Prisma 6 schema & TimescaleDB setup
  - Local Docker Compose (Postgres + Redis)
- [ ] **Phase 1: Core API & Data Modeling**
- [ ] **Phase 2: Authentication (Google OAuth) & Media Pipeline (Sharp)**
- [ ] **Phase 3: High-Throughput Analytics Engine (BullMQ + Timescale)**
- [ ] **Phase 4: Next.js 15.2 Web Frontend & Live Preview**
- [ ] **Phase 5: Hardening, E2E Testing & Monetization (Stripe)**
- [ ] **Phase 6: Production Deployment & Observability**

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js**: `v22 LTS` or `v24+` (Installed: `v24.11.1`)
- **pnpm**: `v10+` (Installed: `v10.22.0`)
- **Docker Desktop**: For running PostgreSQL + TimescaleDB and Redis locally.

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-username/url-shortener.git
cd url-shortener

# 2. Install dependencies across the monorepo
pnpm install

# 3. Start local databases (PostgreSQL + Redis)
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 4. Generate Prisma client & run database migrations
pnpm db:migrate

# 5. Start all apps in development mode
pnpm dev
```
