# 🚀 Backend API (`apps/api`)

> NestJS 12 REST API powering the Link-in-Bio platform, built with SWC compiler, Swagger OpenAPI documentation, and clean Hexagonal Architecture.

---

## ⚡ Specifications

- **Framework**: [NestJS 12.0+](https://nestjs.com/)
- **Compiler**: SWC (`@swc/core` via `nest-cli.json`, compiles in ~70ms)
- **Module System**: CommonJS with TypeScript `nodenext` type checking
- **Port**: `3001` (Global prefix `/api`)
- **Documentation**: Swagger OpenAPI 3.0 at `/api/docs`
- **Database**: Integrated `@repo/prisma` (`PrismaService` global module)
- **Caching**: Integrated `RedisService` (`CacheModule` global module)

---

## 🛠️ Local Development Commands

Run from monorepo root:
```bash
# Start API in development mode (hot-reload via SWC)
pnpm dev:api

# Run unit tests
pnpm --filter api test

# Run tests in watch mode
pnpm --filter api test:watch

# Build production bundle
pnpm --filter api build

# Start production server
pnpm --filter api start:prod
```

Or from inside `apps/api`:
```bash
pnpm dev
pnpm test
pnpm build
```

---

## 🌐 Endpoints & API Documentation

- **Base URL**: `http://localhost:3001/api`
- **Interactive Swagger Docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Health Check**: `GET http://localhost:3001/api` -> returns `"Hello World!"`

### Core Domains & Planned Modules
| Domain | Path Prefix | Description |
|---|---|---|
| **Auth** | `/api/auth` | JWT registration, login, Google OAuth 2.0 callback |
| **Profile** | `/api/profiles` | Vanity profile lookup (`/:username`) and `/profiles/me` |
| **Links** | `/api/links` | Link CRUD and atomic drag-and-drop reordering |
| **Themes** | `/api/themes` | Preset themes retrieval and custom CSS theme builder |
| **Analytics**| `/api/track` | Non-blocking click and page view telemetry beacons |

---

## ⚙️ Environment Configuration

The API reads environment variables from the monorepo root `.env`:

```env
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linktree?schema=public
REDIS_URL=redis://localhost:6379

JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
```
