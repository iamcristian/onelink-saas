# 💻 Frontend Web Application (`apps/web`)

> Next.js 16 App Router web application serving ultra-fast public vanity profiles (`/@username`) and the interactive Creator Studio Dashboard.

---

## ⚡ Specifications

- **Framework**: [Next.js 16.4+](https://nextjs.org/) (App Router, React Server Components)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/turbopack`
- **Port**: `3000`
- **Validation**: Integrated with `@repo/shared` Zod schemas
- **Rendering Strategy**: Incremental Static Regeneration (ISR) with tag-based on-demand revalidation for public creator profiles (`/@username`).

---

## 🛠️ Local Development Commands

Run from monorepo root:
```bash
# Start Next.js development server with Turbopack
pnpm dev:web

# Run linter
pnpm --filter web lint

# Build production bundle
pnpm --filter web build

# Start production server
pnpm --filter web start
```

Or from inside `apps/web`:
```bash
pnpm dev
pnpm build
pnpm lint
```

---

## 🧭 Application Routes

```
src/app/
├── layout.tsx                  # Root layout (Inter font, Providers, Toast)
├── page.tsx                    # Marketing landing page & username search bar
├── globals.css                 # Tailwind v4 configuration and color theme tokens
│
├── [username]/                 # Public profile route (/@alexrivera)
│   ├── page.tsx                # Server Component with ISR (Cache-Tag: profile-[username])
│   └── loading.tsx             # Skeleton loader for sub-100ms visual response
│
└── dashboard/                  # Creator Studio (Protected)
    ├── layout.tsx              # Split-screen studio layout (60% editor / 40% live phone)
    ├── links/page.tsx          # Drag-and-drop link manager
    ├── appearance/page.tsx     # Theme selector & custom styling editor
    ├── analytics/page.tsx      # TimescaleDB metrics visualizations
    └── settings/page.tsx       # SEO, custom domain & account settings
```

---

## 🎨 UI/UX Mockup Alignment

For full wireframe mockups, component hierarchy, and Google Stitch / Figma tokens, see:
👉 [`docs/ui-ux/wireframes-and-mockups.md`](../../docs/ui-ux/wireframes-and-mockups.md)
