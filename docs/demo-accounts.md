# 👥 OneLink Default Accounts, Roles & Test Credentials

> Comprehensive guide to preconfigured seed accounts, role hierarchies, and test credentials in the **OneLink** platform.

---

## 🔑 Preconfigured User Accounts

All preconfigured accounts created during database seeding (`pnpm db:seed`) use the unified password: **`Password123!`**.

| Account Name | Email | Username / Handle | Platform Role | Default Password | Description & Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cristian Arando** | `cris@onelink.bio` | `@crisarando` | `OWNER` | `Password123!` | **Platform Founder & Owner Account**. Pre-populated with 5 active links, social badges, 30 days of real-time telemetry, full Creator Studio management, and executive SaaS revenue metrics. |
| **Cris Super Admin** | `admin@onelink.bio` | `@admin` | `SUPER_ADMIN` | `Password123!` | **Global Infrastructure & Security Admin**. Operates exclusively from the **Sentinel AI Threat Center** (`/admin/moderation`), managing the User Directory, threat queue resolution, user suspension/reinstatement, and domain blocklisting. |
| **Crypto Free Airdrops** | `drainer@crypto-scam.xyz` | `@cryptopromos` | `CREATOR` *(Banned)* | `Password123!` | **Malicious Test Account**. Seeded with punycode crypto-drainer contracts to test automated Sentinel AI blocking and suspension workflows. |
| **Daily Promo Deals** | `deals@daily-promos.top` | `@deals_daily` | `CREATOR` | `Password123!` | **Suspicious Phishing Account**. Seeded with brand keyword impersonation links (`PayPal`, giftcards) currently marked as `PENDING_REVIEW` in the moderation stream. |

---

## 🛡️ Understanding System Roles

OneLink distinguishes between **Global Platform Roles** (system-wide permissions) and **Workspace Collaboration Roles** (multi-tenant team governance).

### 1. Global Platform Roles (`User.role`)

| Role | Target Persona | Platform Capabilities |
| :--- | :--- | :--- |
| **`OWNER`** | Founder, platform owner, and supreme administrator. | - Full access to personal **Creator Studio** and vanity link-in-bio page.<br>- Master access to **Sentinel AI Threat Center** (`/admin/moderation`).<br>- Executive access to **SaaS Revenue & Founder Financial KPIs** (MRR, ARR, active paid subscriptions, churn metrics).<br>- Can change roles and suspend any account across the entire platform. |
| **`SUPER_ADMIN`** | Platform operators, Trust & Safety leads, and DevOps. | - Operates exclusively from **Sentinel AI Threat Center** (`/admin/moderation`).<br>- Platform **User Directory & Governance** (search, ban/suspend users, update roles).<br>- Threat review, domain blocklisting, and audit ledger downloads. |
| **`CREATOR`** | General public, influencers, builders, and developers. | - Owns an individual vanity link-in-bio page (`onelink.bio/username`).<br>- Full access to **Creator Studio** (`/studio/links`, `/studio/appearance`, `/studio/analytics`, `/studio/settings`, `/studio/billing`).<br>- Can shorten and organize links, customize buttons, fonts, and themes, view 30-day analytics, and manage subscriptions (Free, Creator Pro, Enterprise Studio). |

---

### 2. Enterprise Workspace Roles (`TeamMember.role`)

When an Enterprise subscriber invites team members to manage their profile, collaborators are granted hierarchical workspace roles:

| Workspace Role | Numeric Weight | Scope & Permissions |
| :--- | :---: | :--- |
| **Platform Owner** | `5` | Account owner. Full billing control, ability to invite/revoke any collaborator, change subscription plans, or delete workspace. |
| **Admin** | `4` | Full studio administration. Can edit links, themes, SEO metadata, and invite sub-collaborators (up to Safety Admin level). |
| **Safety Admin** | `3` | Trust & safety operations. Can audit outbound links, review safety alerts, and pause or unpublish compromised links. |
| **Content Editor** | `2` | Content operations. Can create, edit, reorder, and schedule links; cannot modify billing or security settings. |
| **Viewer / Auditor** | `1` | Read-only access. Can inspect analytics and telemetry reports; cannot alter links, themes, or workspace configuration. |

---

## ⚡ Authentication & Role Routing
 
 On the login page ([`/login`](http://localhost:3000/login)), enter the email and password (`Password123!`) of any account:
 - Authenticating as **`OWNER`** (`cris@onelink.bio`) navigates to the Creator Studio with executive access to both `/studio` and `/admin/moderation`.
 - Authenticating as **`SUPER_ADMIN`** (`admin@onelink.bio`) routes directly and exclusively to the **Sentinel AI Threat Center** (`/admin/moderation`).
 - Authenticating as **`CREATOR`** navigates to the personal **Creator Studio** (`/studio/links`).
 - Attempting to log in with a banned account (e.g., `drainer@crypto-scam.xyz`) displays an immediate security notice regarding account suspension.
