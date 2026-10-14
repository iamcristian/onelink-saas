# 📚 OneLink Platform Documentation Hub & SDLC Architecture

> **Project Name**: **OneLink** (`onelink.bio`) — High-Scalability Creator Link-in-Bio Platform  
> **Lifecycle Phase**: System Design & Specification (SDLC Phases 1–4 Complete)  
> **Repository Architecture**: Turborepo Monorepo (`apps/*`, `packages/*`, `infrastructure/*`, `docs/*`)  
> **Visual Mockups**: Unified Google Stitch Canvas (Project ID: `14141085438200447026`)

Welcome to the engineering and product documentation repository for **OneLink**. This directory is strictly structured into modular folders following standard enterprise Software Development Life Cycle (SDLC) practices.

---

## 🗂️ Documentation Directory Structure

```
docs/
├── README.md                           # Master Documentation Map (this file)
├── progress-tracker.md                 # Live Track & Verification Guide of Completed Work
├── master-plan.md                      # Comprehensive 16-Week Product & Tech Roadmap
├── prd.md                              # Product Requirements Document (Personas, User Stories, MoSCoW)
├── srs.md                              # Software Requirements Specification (IEEE 830, Functional & NFRs)
├── test-plan.md                        # QA & Test Strategy (TDD, Unit, Integration, E2E)
│
├── architecture/                       # System & Data Architecture
│   ├── database-design.md              # Entity-Relationship Diagram (ERD), Tables, Indexes, TimescaleDB
│   ├── system-architecture.md          # C4 Model Diagrams (Context, Container, Component, Code)
│   └── sequence-flows.md               # Mermaid Sequence Diagrams (Profile View, Click Tracking, Cache)
│
├── ui-ux/                              # Interface & Experience Design
│   ├── DESIGN.md                       # OneLink Carbon Architecture Semantic Design System
│   ├── wireframes-and-mockups.md       # Screen Specifications, Split-Screen Dashboard, Stitch Alignment
│   ├── user-flows-and-sitemap.md       # Full User Flow, Sitemap, and 5-State Screen Matrix
│   ├── prompts/
│   │   └── screen-prompts.md           # Stitch-Optimized Generation & Edit Prompts for Platform Screens
│   └── mockups/                        # High-Fidelity Google Stitch Visual Mockups & Source HTML
│       ├── screen-1-profile.png & .html          # Public Mobile Profile (/@alexrivera)
│       ├── screen-2-studio-dashboard.png & .html # OneLink Studio Links Manager (60/40 Split)
│       ├── screen-3-appearance.png & .html       # OneLink Studio Appearance & Themes (60/40 Split)
│       ├── screen-4-analytics.png & .html        # OneLink Studio Performance Analytics & Telemetry
│       ├── screen-5-sentinel-admin.png & .html   # OneLink Sentinel AI & Super Admin Moderation
│       └── screen-6-owner-billing.png & .html    # SaaS Owner Billing Studio & Plan Management
│
└── adr/                                # Architecture Decision Records
    ├── 001-monorepo-pnpm-turbo.md      # Selection of pnpm workspaces & Turborepo 2
    ├── 002-backend-nestjs.md           # NestJS 12 + SWC Compiler Architecture
    ├── 003-frontend-nextjs.md          # Next.js 16 App Router + React 19 SSR/ISR
    └── 004-database-postgres-timescale.md # PostgreSQL 16 + TimescaleDB Hypertables
```

---

## 🗺️ SDLC Documents Quick Reference

| Category | Document Link | Description & Key Artifacts | Status |
|---|---|---|---|
| **Tracking & Status** | [progress-tracker.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/progress-tracker.md) | Audit of all completed setups, verification logs, and SDLC checklist | ✅ Active Track |
| **Requirements** | [prd.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/prd.md) | 4 Personas, Gherkin user stories, feature prioritization | ✅ Approved |
| **Specifications** | [srs.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/srs.md) | IEEE 830 functional & non-functional requirements, SLA matrix | ✅ Approved |
| **Data Design** | [architecture/database-design.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/architecture/database-design.md) | Mermaid ERD, Data Dictionary, TimescaleDB Hypertables, Indexes | ✅ Approved |
| **System Design** | [architecture/system-architecture.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/architecture/system-architecture.md) | C4 Context, Container, Component diagrams, Cache topologies | ✅ Approved |
| **Sequence Flows** | [architecture/sequence-flows.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/architecture/sequence-flows.md) | Hot path profile read, Beacon click tracking, Cache eviction | ✅ Approved |
| **User Flows & Sitemap** | [ui-ux/user-flows-and-sitemap.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/user-flows-and-sitemap.md) | Visitor vs Creator flows, complete sitemap, 5-state UI matrix | ✅ Approved |
| **Design System** | [ui-ux/DESIGN.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/DESIGN.md) | Carbon Architecture tokens (Zinc 950 `#09090b`, Geist + JetBrains Mono) | ✅ Approved |
| **UI/UX & Wireframes**| [ui-ux/wireframes-and-mockups.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/wireframes-and-mockups.md) | Screen layouts, 60/40 Split Dashboard, Google Stitch specs | ✅ Approved |
| **Visual Mockups** | [ui-ux/mockups/](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/mockups/) | 6 High-fidelity Stitch screens (PNGs + self-contained HTML) | ✅ 100% Generated |
| **Architecture Decisions**| [adr/](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/adr/) | Formal ADRs 001 through 004 documenting key tech trade-offs | ✅ Approved |
| **Test Strategy** | [test-plan.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/test-plan.md) | TDD Red-Green-Refactor, Supertest integration, Playwright E2E | ✅ Approved |
| **Master Roadmap** | [master-plan.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/master-plan.md) | 16-week execution timeline from foundation to production | ✅ Approved |

---

## 🔄 SDLC Workflow Discipline

We enforce a strict engineering order:
1. **Requirements & Scope Validation**: Verify PRD and SRS before designing features.
2. **Architecture & Data Modeling**: Model schema in `database-design.md` and ERD before writing migrations.
3. **UI/UX & Wireframes**: Align on layouts, wireframes, and design tokens before writing frontend components.
4. **Google Stitch Unified Prototyping**: Validate aesthetics, responsive layouts, and interactive behavior on unified canvas.
5. **Test-Driven Implementation (TDD)**: Write test specs (Red 🔴) -> Implement code (Green 🟢) -> Refactor (🔵).
6. **Continuous Verification**: Monorepo builds, typechecks, and unit test suites must pass 100% on every commit.
