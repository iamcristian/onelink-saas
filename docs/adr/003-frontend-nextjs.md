# ADR-003: Frontend Architecture: Next.js with App Router & ISR

## Status
Accepted

## Date
2026-10-13

## Context
The platform has two distinct frontend requirements:
1. Public Profile Pages (`/@username`): High-traffic, latency-critical (<50ms), SEO-sensitive, mobile-first pages browsed from social media apps (Instagram, TikTok).
2. Creator Dashboard (`/dashboard`): Highly interactive, state-heavy application featuring live split-screen preview and drag-and-drop link reordering.

## Decision
Adopt **Next.js 16** with the **App Router**, **React 19**, and **Tailwind CSS v4**:
- **Incremental Static Regeneration (ISR)**: Public profile pages (`app/@[username]/page.tsx`) are pre-rendered at the edge and cached statically, revalidated on-demand when creators edit links via `revalidateTag()`.
- **Server Components (RSC)**: Keep the client bundle minimal by streaming server components for dashboard layouts while isolating client interactivity to specific components (`@dnd-kit/core`).
- **Tailwind CSS v4**: Utilizes the modern CSS-first engine (`@import "tailwindcss";`) with CSS variables enabling dynamic real-time theme preview without runtime CSS-in-JS overhead.

## Alternatives Considered
1. **Astro**: Evaluated for fast static profile rendering, but Astro struggles with heavy client-side interactivity like drag-and-drop link editors and live synchronized previews, which are the core of our creator dashboard.
2. **Vite + React SPA**: Rejected for public profiles due to lack of Server-Side Rendering (SSR), poor SEO, slower initial mobile paint (blank screen while JS bundle downloads), and missing dynamic Open Graph generation.

## Consequences
- **Positive**: Sub-50ms public profile loads via edge ISR, seamless shared TypeScript types with backend via `@repo/shared`, instant preview reactivity, and zero runtime CSS overhead with Tailwind v4.
- **Negative**: Requires understanding Server vs. Client component boundaries in React 19.
