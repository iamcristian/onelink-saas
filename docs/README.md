# 📚 Project Documentation Hub & SDLC Architecture

> **Project**: High-Scalability Link-in-Bio Platform (Linktree Alternative)  
> **Lifecycle Phase**: System Design & Specification (SDLC Phases 1–4 Complete)  
> **Repository Architecture**: Turborepo Monorepo (`apps/*`, `packages/*`, `infrastructure/*`, `docs/*`)  

Welcome to the engineering and product documentation repository. This directory is strictly structured into modular folders following standard enterprise Software Development Life Cycle (SDLC) practices.

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
│   └── wireframes-and-mockups.md       # Screen Wireframes, Split-Screen Dashboard, Stitch/Figma Alignment
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
| **UI/UX & Wireframes**| [ui-ux/wireframes-and-mockups.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/ui-ux/wireframes-and-mockups.md) | ASCII Wireframes, 60/40 Split Dashboard, Google Stitch specs | ✅ Approved |
| **Architecture Decisions**| [adr/](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/adr/) | Formal ADRs 001 through 004 documenting key tech trade-offs | ✅ Approved |
| **Test Strategy** | [test-plan.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/test-plan.md) | TDD Red-Green-Refactor, Supertest integration, Playwright E2E | ✅ Approved |
| **Master Roadmap** | [master-plan.md](file:///c:/Users/crisa/Workspace/system-design/url-shortener/docs/master-plan.md) | 16-week execution timeline from foundation to production | ✅ Approved |

---

## 🔄 SDLC Workflow Discipline

We enforce a strict engineering order:
1. **Requirements & Scope Validation**: Verify PRD and SRS before designing features.
2. **Architecture & Data Modeling**: Model schema in `database-design.md` and ERD before writing migrations.
3. **UI/UX & Wireframes**: Align on layouts, wireframes, and design tokens before writing frontend components.
4. **Test-Driven Implementation (TDD)**: Write test specs (Red 🔴) -> Implement code (Green 🟢) -> Refactor (🔵).
5. **Continuous Verification**: Monorepo builds, typechecks, and unit test suites must pass 100% on every commit.
