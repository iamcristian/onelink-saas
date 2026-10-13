# ADR-001: Monorepo Architecture with pnpm Workspaces & Turborepo 2

## Status
Accepted

## Date
2026-10-13

## Context
We need to manage multiple cohesive applications (Next.js frontend, NestJS backend API) and shared domain packages (`@repo/prisma`, `@repo/shared`, `@repo/typescript-config`) without diverging type contracts or managing multiple git repositories with independent CI pipelines.

## Decision
Adopt a **Monorepo** managed with **pnpm workspaces** (v12) and **Turborepo 2**:
- Code sharing: `@repo/shared` houses universal Zod validation schemas and TypeScript types.
- Dependency deduplication: pnpm hard-links packages across workspaces, saving disk space.
- Build caching: Turborepo remembers task outputs (`build`, `test`, `typecheck`), enabling sub-second incremental builds.
- Isolated containerization: Use `turbo prune --scope=api --docker` to build minimal production Docker images containing only backend code.

## Alternatives Considered
1. **Polyrepo (Multiple independent repos)**: Rejected. High risk of API contract drift (frontend and backend out of sync), overhead of 4 separate CI pipelines and npm package publishing.
2. **Nx Monorepo**: Rejected. Nx has a steeper learning curve and higher configuration complexity for a standard full-stack TypeScript project compared to Turborepo's lightweight pipeline model.
3. **npm/yarn workspaces**: Rejected. Slower installation times, loose dependency resolution (phantom dependencies), and larger disk footprint compared to pnpm's content-addressable store.

## Consequences
- **Positive**: Atomic commits across backend and frontend, instant typecheck feedback across the full stack, single unified CI pipeline, and blazing-fast local caching.
- **Negative**: Requires learning pnpm workspace protocols (`workspace:*`) and configuring monorepo-aware paths for Jest and Prisma.
