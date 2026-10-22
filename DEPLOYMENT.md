# 🚀 Production Deployment Guide: 100% Free Forever Stack

> Comprehensive architectural deployment guide for running the **OneLink** platform in production with **$0/month infrastructure costs** and **zero 30-day expiration limits**.

---

## 🏗️ Architecture & Free Tier Matrix

| Layer | Service Provider | Plan | Cost | Expiration / Limit |
|---|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Hobby | **$0/mo** | **Unlimited (Forever Free)** |
| **Backend API** | [Render](https://render.com) or [Koyeb](https://www.koyeb.com) | Free Web Service / Eco | **$0/mo** | **Unlimited (Forever Free)** |
| **Database** | [Neon](https://neon.tech) (or [Supabase](https://supabase.com)) | Serverless Postgres | **$0/mo** | **Unlimited (0.5 GB, Never Deleted)** |
| **Cache & Blocklist** | [Upstash](https://upstash.com) | Serverless Redis | **$0/mo** | **Unlimited (10,000 commands/day)** |
| **Keep-Alive Cron** | [cron-job.org](https://cron-job.org) / [UptimeRobot](https://uptimerobot.com) | Free Monitor | **$0/mo** | **Unlimited (Pings every 10 min)** |

> [!WARNING]
> ### The Render PostgreSQL Trap
> **Do NOT use Render's free PostgreSQL database!** Render automatically suspends and permanently deletes free databases after **30 days**.
> - Render **Web Services** (your NestJS API) are **forever free**.
> - Render **PostgreSQL databases** are **temporary 30-day trials**.
> - Always host your database on **Neon** or **Supabase**, which do not delete your database.

---

## 📋 Step-by-Step Deployment Roadmap

```mermaid
flowchart LR
    A[GitHub Repository] -->|Auto Deploy| B(Vercel: Next.js Frontend)
    A -->|Auto Deploy| C(Render / Koyeb: NestJS API)
    C -->|Prisma Client| D[(Neon.tech: PostgreSQL)]
    C -->|ioredis| E[(Upstash: Serverless Redis)]
    B -->|REST Requests| C
    F[cron-job.org] -->|Ping every 10m| C
```

---

## Step 1: Provision Free PostgreSQL on Neon.tech

1. Sign up at [neon.tech](https://neon.tech) using your GitHub account.
2. Click **Create Project**:
   - **Project name**: `onelink-prod`
   - **Region**: Choose the region closest to your users (e.g., `US East (N. Virginia)` / `us-east-2`).
   - **PostgreSQL version**: `16`.
3. In the project dashboard, copy the **Connection details**:
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-cool-fog-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
4. **Push database schema & seed initial accounts** from your local machine:
   ```bash
   # Set the temporary production connection in your shell
   export DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-cool-fog-123.us-east-2.aws.neon.tech/neondb?sslmode=require"

   # Deploy prisma schema to Neon
   pnpm --filter @repo/prisma db:push

   # Seed default accounts (cris@onelink.bio, admin@onelink.bio, demo users)
   pnpm --filter @repo/prisma db:seed
   ```

---

## Step 2: Provision Free Serverless Redis on Upstash

1. Sign up at [upstash.com](https://upstash.com) using GitHub.
2. Click **Create Database**:
   - **Name**: `onelink-redis-prod`
   - **Type**: `Regional` (Redis)
   - **Region**: Select the same AWS region as your Neon database (e.g., `us-east-1` or `us-east-2`).
3. Scroll down to **Connect your database** and select the **Node.js (ioredis)** tab.
4. Copy the standard Redis TLS URL:
   ```env
   REDIS_URL="rediss://default:YOUR_UPSTASH_TOKEN@cool-redis-123.upstash.io:6379"
   ```

---

## Step 3: Deploy NestJS Backend API (Render)

1. Sign in to [render.com](https://render.com) and click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository: `url-shortener`.
3. Configure the service settings:
   - **Name**: `onelink-api`
   - **Region**: Same region as your database (`US East - Ohio` or `Frankfurt`).
   - **Branch**: `main`
   - **Root Directory**: Leave blank (monorepo root).
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     pnpm install && pnpm --filter @repo/prisma build && pnpm --filter @repo/shared build && pnpm --filter api build
     ```
   - **Start Command**:
     ```bash
     pnpm --filter api start:prod
     ```
   - **Instance Type**: `Free` (512 MB RAM, 0.1 CPU).

4. Add **Environment Variables** in Render:
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-cool-fog-123.us-east-2.aws.neon.tech/neondb?sslmode=require
   REDIS_URL=rediss://default:YOUR_UPSTASH_TOKEN@cool-redis-123.upstash.io:6379
   JWT_SECRET=generate_a_random_64_character_hex_string_here
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```
5. Click **Create Web Service**. Once built, note your API URL:
   `https://onelink-api.onrender.com`

### ⚡ Eliminating Render Cold Starts for Free
Render free instances go to sleep after 15 minutes of inactivity. To keep your API running 24/7 with **0-second response latency**:
1. Go to [cron-job.org](https://cron-job.org) (or [uptimerobot.com](https://uptimerobot.com)).
2. Create a free ping job:
   - **URL**: `https://onelink-api.onrender.com/api`
   - **Schedule**: Every `10 minutes`.
3. This keeps the free server permanently active without cost!

---

## Step 4: Deploy Next.js Frontend (Vercel)

1. Sign in to [vercel.com](https://vercel.com) and click **Add New...** $\rightarrow$ **Project**.
2. Import the `url-shortener` repository.
3. In project configuration:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click edit and choose `apps/web`.
4. In **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_API_URL=https://onelink-api.onrender.com
   NEXT_PUBLIC_APP_URL=https://your-frontend-domain.vercel.app
   ```
5. Click **Deploy**. Vercel will build the Next.js app, configure global Edge CDN caching, and assign a production URL:
   `https://your-project.vercel.app`

---

## 🔐 Production Environment Variables Reference

### Backend (`apps/api` on Render / Koyeb)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Service binding port | `3001` |
| `NODE_ENV` | Environment identifier | `production` |
| `DATABASE_URL` | PostgreSQL pooled connection string | `postgresql://...@ep-xyz.neon.tech/neondb?sslmode=require` |
| `REDIS_URL` | Upstash Redis connection URI | `rediss://default:...@...upstash.io:6379` |
| `JWT_SECRET` | Secret key for JWT signing | `8fbc923a10...` |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `FRONTEND_URL` | Permitted CORS origin | `https://onelink.vercel.app` |

### Frontend (`apps/web` on Vercel)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public backend API origin | `https://onelink-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | Canonical frontend domain | `https://onelink.vercel.app` |

---

## ✅ Post-Deployment Verification Checklist

1. [ ] **Public Vanity Route**: Visit `https://your-app.vercel.app/crisarando` — verify links, profile avatar, theme styling, and social icons render without layout shifts.
2. [ ] **Creator Studio**: Log in with `cris@onelink.bio` / `CrisSecure#2026!` at `/login` — test adding a link, changing theme in Appearance, and preview phone simulation.
3. [ ] **Sentinel AI Sandbox**: Visit `/admin/moderation`, navigate to **Interception Engine**, and evaluate `http://metamask-security-auth.xyz/drain` — confirm sub-18ms inference latency and `BLOCK_IMMEDIATE` verdict.
4. [ ] **CORS Verification**: Confirm browser network tab shows `Access-Control-Allow-Origin: https://your-app.vercel.app` without CORS blocking.
5. [ ] **Database Persistence**: Modify profile bio in Creator Studio and refresh public page to verify Prisma read/write consistency.
