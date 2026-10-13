# 🗄️ Database Layer (`@repo/prisma`)

> PostgreSQL 16 + TimescaleDB 2.17+ schema, migrations, seeders, and generated Prisma client.

---

## ⚡ Specifications

- **ORM**: [Prisma 6.4](https://www.prisma.io/)
- **Database**: PostgreSQL 16 with TimescaleDB extension enabled
- **Local Container**: `timescale/timescaledb:latest-pg16` on port `5432`
- **Environment**: Automatically reads root `.env` via `dotenv-cli`

---

## 🛠️ Database Management Commands

Run from monorepo root:
```bash
# Push schema directly to database (ideal for rapid development)
pnpm db:push

# Seed database with 5 curated themes (Obsidian, Minimal, Cyberpunk, Sakura, Emerald)
pnpm db:seed

# Open Prisma Studio web GUI (http://localhost:5555)
pnpm db:studio

# Re-generate Prisma Client after modifying schema.prisma
pnpm db:generate
```

Or from inside `packages/prisma`:
```bash
pnpm db:push
pnpm db:seed
pnpm db:studio
pnpm generate
```

---

## 📊 Relational Models Overview

| Model | Table | Description |
|---|---|---|
| `User` | `users` | Accounts, credentials (bcrypt or Google OAuth id) |
| `Profile` | `profiles` | Vanity page (`username`, `title`, `bio`, `avatarUrl`, `isPublished`) |
| `Link` | `links` | Items on profile (`LINK`, `HEADER`, `DIVIDER`, `position`, `clickCount`) |
| `Theme` | `themes` | Curated preset styling configurations |
| `CustomTheme` | `custom_themes` | Custom CSS tokens for pro creators |
| `SocialLink` | `social_links` | Social icon shortcuts (Instagram, TikTok, YouTube, etc.) |
| `PageView` | `page_views` | Partitioned Hypertable for profile visits |
| `ClickEvent` | `click_events` | Partitioned Hypertable for link click telemetry |

For the complete **Mermaid ERD** and Data Dictionary:
👉 [`docs/architecture/database-design.md`](../../docs/architecture/database-design.md)
