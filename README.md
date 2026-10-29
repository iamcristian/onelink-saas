# 🔗 Scalable Link-in-Bio Platform

> High-performance, mobile-first **Link-in-Bio platform** (Linktree alternative) engineered with modern distributed system design, clean hexagonal architecture, TimescaleDB time-series analytics, and enterprise SDLC rigor.

<img width="1698" height="993" alt="{1F1ED40A-A4D2-4932-8581-A440B4196653}" src="https://github.com/user-attachments/assets/0c696dec-4655-42ce-9ef1-2559f3e39315" />
<img width="1858" height="994" alt="{C62E3677-2F51-467F-9917-528A184D86F3}" src="https://github.com/user-attachments/assets/f07e1cc3-8200-4040-bc2b-b0c5de2da32f" />

---

## ⚡ Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Monorepo Engine** | [Turborepo 2.4+](https://turbo.build/) + [pnpm 12](https://pnpm.io/) | Workspaces, isolated dependencies, cached pipelines |
| **Backend API** | [NestJS 12](https://nestjs.com/) + [SWC Compiler](https://swc.rs/) | Clean Architecture, Swagger OpenAPI 3.0, compiles in ~70ms |
| **Frontend Web** | [Next.js 16.4](https://nextjs.org/) + [React 19](https://react.dev/) | App Router, Server Components, ISR for vanity profiles |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/turbopack`) | Modern CSS theme engine, dynamic color variables |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) + [TimescaleDB](https://www.timescale.com/) | Relational core + partitioned Hypertables for analytics |
| **Cache & Message Broker** | [Redis 7 Stack](https://redis.io/) + [BullMQ](https://docs.bullmq.io/) | Profile JSON cache-aside, asynchronous click tracking |
| **Data Modeling & Validation** | [Prisma 6](https://www.prisma.io/) + [Zod 3.24+](https://zod.dev/) | End-to-end type safety and validation |
| **Local Infrastructure** | [Docker Compose](https://www.docker.com/) | Containerized PostgreSQL, Redis, and Mailhog |

---

## 🌐 Services, URLs & Ports

When the local environment is running, services are available at:

| Service | Environment / URL | Description | Default Port |
|---|---|---|---|
| **Web Application** | [http://localhost:3000](http://localhost:3000) | Public profiles (`/@username`) & Creator Studio Dashboard | `3000` |
| **Backend REST API** | [http://localhost:3001/api](http://localhost:3001/api) | NestJS REST API endpoints | `3001` |
| **Swagger OpenAPI Docs** | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Interactive API documentation & test console | `3001` |
| **Prisma Studio (GUI)** | [http://localhost:5555](http://localhost:5555) | Web GUI to view/edit database records (`pnpm db:studio`) | `5555` |
| **Mailhog (Email UI)** | [http://localhost:8025](http://localhost:8025) | Local SMTP mailbox testing interface | `8025` |
| **TimescaleDB / Postgres**| `localhost:5432` | Relational & time-series database (`linktree` / `postgres`) | `5432` |
| **Redis Stack** | `localhost:6379` | In-memory key-value cache and message broker | `6379` |

---

## 🚀 Quick Start Guide (From Zero to Running)

Follow these steps to run the complete platform on your local machine:

### 1. Prerequisites
- **Node.js**: `v22+` or `v24+` (Recommended: `v24.11.1`)
- **pnpm**: `v10+` or `v12+` (Recommended: `v12.11.2`)
- **Docker Desktop**: Must be installed and running.

### 2. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/url-shortener.git
cd url-shortener

# Install all workspace dependencies
pnpm install
```

### 3. Start Local Infrastructure (Docker)
Start the TimescaleDB, Redis, and Mailhog containers:
```bash
pnpm docker:up
```
> *To check status: `docker ps` or `pnpm docker:logs`*

### 4. Initialize & Seed the Database
Push the schema to PostgreSQL and seed initial preset themes:
```bash
# Push schema tables (User, Profile, Link, Theme, etc.)
pnpm db:push

# Seed default preset themes (Obsidian, Minimal, Cyberpunk, Sakura, Emerald)
pnpm db:seed
```

### 5. Launch Development Servers
Start both the NestJS API and Next.js Web applications concurrently:
```bash
pnpm dev
```
- Open [http://localhost:3000](http://localhost:3000) to view the Web application.
- Open [http://localhost:3001/api/docs](http://localhost:3001/api/docs) to view the Swagger API documentation.

---

## 👥 Default Demo Accounts & Test Credentials

All preconfigured accounts seeded via `pnpm db:seed` use the shared password **`Password123!`**:

| Account | Email | Password | Role | Description & Scope |
|---|---|---|---|---|
| **Cristian Arando** | `cris@onelink.bio` | `Password123!` | `OWNER` | **Platform Founder & Owner Account** (`/@crisarando`). Complete personal Creator Studio access + direct access to `/admin/moderation` + global SaaS financial telemetry (MRR/ARR). |
| **Cris Super Admin** | `admin@onelink.bio` | `Password123!` | `SUPER_ADMIN` | **Global Infrastructure & Security Admin**. Operates exclusively in **Sentinel AI Threat Center** (`/admin/moderation`) with User Directory & Threat Governance (ban/unban, role updates, threat queue, domain blocklisting). |
| **Crypto Free Airdrops** | `drainer@crypto-scam.xyz` | `Password123!` | `CREATOR` *(Banned)* | **Malicious Test Account**. Seeded with punycode crypto-drainer contracts, automatically blocked and suspended by Sentinel AI to demonstrate threat neutralization. |
| **Daily Promo Deals** | `deals@daily-promos.top` | `Password123!` | `CREATOR` *(Suspicious)* | **Suspicious Phishing Account**. Seeded with brand impersonation links (`.top` domain) currently flagged as `SUSPICIOUS` for admin review and moderation. |

> 📖 *For complete details on role hierarchies, Workspace team roles, and security policies, see [docs/demo-accounts.md](./docs/demo-accounts.md).*

---

## 🛠️ Master Command Reference

All primary commands can be executed from the **monorepo root**:

### 🐳 Infrastructure (Docker)
| Command | Action |
|---|---|
| `pnpm docker:up` | Starts Postgres (TimescaleDB), Redis, and Mailhog in background |
| `pnpm docker:down` | Stops and removes local Docker containers |
| `pnpm docker:logs` | Streams live logs from all infrastructure containers |

### 🗄️ Database (Prisma & PostgreSQL)
| Command | Action |
|---|---|
| `pnpm db:push` | Synchronizes Prisma schema directly with PostgreSQL database |
| `pnpm db:seed` | Populates database with preset themes and initial records |
| `pnpm db:studio` | Opens Prisma Studio web UI at `http://localhost:5555` |
| `pnpm db:generate` | Re-generates `@prisma/client` types after schema edits |

### 💻 Development Servers
| Command | Action |
|---|---|
| `pnpm dev` | Starts all applications concurrently (`apps/api` + `apps/web`) |
| `pnpm dev:api` | Starts only the NestJS backend API (`http://localhost:3001`) |
| `pnpm dev:web` | Starts only the Next.js frontend web app (`http://localhost:3000`) |

### 🧪 Quality Assurance, Testing & Build
| Command | Action |
|---|---|
| `pnpm typecheck` | Runs TypeScript typechecks across all 5 workspace packages |
| `pnpm test` | Runs unit test suites with Jest |
| `pnpm build` | Compiles production builds (NestJS SWC + Next.js Turbopack) |
| `pnpm lint` | Runs ESLint 9 across all packages |
| `pnpm format` | Formats all code, docs, and JSON with Prettier |

---

## 🗂️ Monorepo Structure

```
.
├── apps/
│   ├── api/                    # NestJS 12 REST API (Port 3001, SWC, Swagger)
│   │   ├── src/                # Core modules (auth, profile, link, analytics)
│   │   └── test/               # Integration and E2E test suites
│   └── web/                    # Next.js 16 Web App (Port 3000, App Router, React 19)
│       └── src/app/            # Vanity profiles (/@username) & Creator Studio
├── packages/
│   ├── prisma/                 # Prisma 6 schema, migrations, seed script
│   ├── shared/                 # Zod validation schemas, universal types & constants
│   └── typescript-config/      # Shared tsconfig profiles (base, nestjs, nextjs)
├── infrastructure/
│   └── docker/                 # docker-compose.yml (TimescaleDB, Redis, Mailhog)
└── docs/                       # Complete SDLC documentation & specifications
```

---

## 💎 Release Feature Highlights & Subscription Tiers

| Tier | Price | Highlights |
|---|---|---|
| **Free Plan** | **$0 / forever** | 5 active links, standard bio profile, 7-day analytics retention, mobile responsive reader |
| **Creator Pro** | **$2.00 / month** ($20/yr) | Unlimited links, Link Scheduling, 0% tip fee, 90-day telemetry, no watermark, calibrated WCAG AAA themes |
| **Enterprise Studio** | **$5.00 / month** ($50/yr) | 5 collaborative team seats with hierarchical RBAC, PIN/password locked links, 18+ age gate, executive CSV export, custom domain support |

### 🚀 Core Platform Capabilities
- **Responsive Mobile Studio Dashboard**: Dynamic segmented control (`[ Editor | Live Preview ]`), responsive device frames (MacBook Pro 16" & fluid iPhone chassis), and non-colliding two-tier link cards.
- **Interactive Digital Notepad (`NOTE` Block)**: Rich-text announcement and memo block that opens a frosted-glass reader modal with word count badge and one-click "Copy Text" button.
- **WCAG AAA Theme Engine**: 8 calibrated high-contrast presets (Minimal Dark, Clean Light, Sunset Aurora, Forest Emerald, Midnight Ocean, Cyberpunk Neon, Bento Linen, Solar Gold).
- **Enterprise Multi-User RBAC**: Numerical hierarchy (`Platform Owner (5)` > `Admin (4)` > `Safety Admin (3)` > `Content Editor (2)` > `Viewer (1)`) with anti-redundancy and anti-recursion guardrails.
- **Stripe Tax Invoices & PDF Receipts**: Native Stripe customer portal integration and instant official PDF invoice receipt downloads.
- **Sentinel AI Threat Engine**: Zero-token in-process lexical analysis and ONNX threat classification intercepting crypto-drainers, phishing, and malware in <25ms.

---

## 📚 SDLC Documentation Hub

Every technical decision, schema, user journey, and wireframe is formally documented in [`docs/`](./docs):

- 📋 **[Progress Tracker & Setup Log](./docs/progress-tracker.md)**: Full inventory of setup and SDLC checklist.
- 🌿 **[Git Flow Branching & Release Strategy](./docs/git-flow.md)**: Official Git Flow model (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`), SemVer, and Conventional Commits.
- 🚀 **[Free Forever Production Deployment Guide](./DEPLOYMENT.md)**: Zero-cost deployment roadmap using Vercel, Render/Koyeb, Neon PostgreSQL, and Upstash Redis without 30-day trial cutoffs.
- 👥 **[Demo Accounts & Role Guide](./docs/demo-accounts.md)**: Preconfigured seed accounts, role hierarchy, and login guide.
- 🗺️ **[Master Documentation Hub](./docs/README.md)**: Master map of all specifications.
- 📄 **[Product Requirements Document (PRD)](./docs/prd.md)**: Personas, Gherkin user stories, MoSCoW.
- 📑 **[Software Requirements Specification (SRS)](./docs/srs.md)**: IEEE 830 functional & non-functional requirements.
- 🗄️ **[Database Design & ERD](./docs/architecture/database-design.md)**: Mermaid ERD, TimescaleDB Hypertables, indexes.
- 🏛️ **[System Architecture (C4)](./docs/architecture/system-architecture.md)**: C4 Context, Container, Component, and Deployment diagrams.
- 🔄 **[Sequence Flows](./docs/architecture/sequence-flows.md)**: Hot path profile rendering, click beacons, and caching.
- 🎨 **[UI/UX Wireframes & Google Stitch](./docs/ui-ux/wireframes-and-mockups.md)**: Split-screen dashboard wireframes & design tokens.
- 🧪 **[Quality & Test Plan](./docs/test-plan.md)**: TDD Red-Green-Refactor testing matrix.
- 📐 **[Architecture Decision Records (ADR)](./docs/adr/)**: ADRs 001 through 004.

