# 📄 OneLink Product Requirements Document (PRD)

> **Project Name**: **OneLink** (`onelink.bio`) — Enterprise Scalable Link-in-Bio Platform  
> **Author**: Engineering, Security & Product Team  
> **Status**: Approved / Enterprise Scope Expansion  
> **Version**: 2.0 (Integrated OneLink Sentinel AI & SaaS Owner Console)  
> **Target Audience**: Content Creators, Influencers, Small Businesses, Platform Owners & Security Admins  

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
1. **Single-Link Limitation**: Social media platforms (Instagram, TikTok, X, YouTube, LinkedIn) restrict users to one URL in their bio, creating audience fragmentation.
2. **Proliferation of Malicious Links & Phishing Scams**: Link-in-bio tools are heavily abused by cybercriminals to bypass social media scanners using deceptive redirects, crypto-drainers, and phishing portals. Traditional platforms rely on slow, manual takedowns or expensive external third-party cloud APIs that incur high latency and token costs.
3. **Monetization & Ownership Blindspots**: Creators lack clear transparency on subscription tier capabilities, while platform owners struggle without native billing controls, seat provisioning, and real-time MRR oversight.

### 1.2 Proposed Solution: OneLink
An enterprise-grade, high-performance creator platform combining:
- **Instantaneous Public Profiles** (`onelink.bio/@username`): Rendered in under 50ms with edge CDN and Redis caching.
- **Real-Time Split-Screen Studio**: 60/40 desktop layout with live dynamic iPhone 15 Pro synchronization.
- **OneLink Sentinel AI (Embedded Zero-Token Link Security)**: An in-process, server-side machine learning pipeline running on **ONNX Runtime / `@xenova/transformers`** directly inside the backend. It classifies URL threat vectors (phishing, malware, crypto scams, punycode spoofing) with **zero external API tokens**, sub-25ms latency, and zero cloud vendor fees.
- **Super Admin Trust & Safety Console**: Moderation queue, threat heatmaps, account suspensions, and domain blocklists.
- **SaaS Owner Billing & Subscriptions Studio**: Tier configuration (Free, Creator Pro $9/mo, Enterprise Studio $29/mo), Stripe sync, team invites, and MRR metrics.

---

## 2. Target User Personas

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER PERSONAS                                        │
├──────────────────┬──────────────────┬──────────────────┬────────────────┬───────────────┤
│ 📸 Creator Chloe │ 💻 Freelancer Leo│ 🛍️ Boutique Bea  │ 📱 Mobile Max  │ 👑 Owner/Admin│
├──────────────────┼──────────────────┼──────────────────┼────────────────┼───────────────┤
│ • 24 years old   │ • 29 years old   │ • 35 years old   │ • 19 years old │ • 38 years old│
│ • TikTok & IG    │ • Full-stack dev │ • Artisan store  │ • Instagram    │ • Platform Ops│
│ • Needs: Sleek   │ • Needs: Custom  │ • Needs: Product │   consumer     │ • Needs: MRR  │
│   minimal theme  │   tech portfolio │   links & chat   │ • Needs: <50ms │   telemetry,  │
│   matching her   │   links + CV     │ • Low tech-savvy │   load on 4G   │   AI threat   │
│   personal brand │ • High tech-savvy│ • Low tolerance  │   with zero    │   moderation, │
│ • Needs live preview   for friction │   malware/scams  │   plans config│
└──────────────────┴──────────────────┴──────────────────┴────────────────┴───────────────┘
```

---

## 3. User Stories & Acceptance Criteria (Gherkin Syntax)

### US-001: User Registration & Onboarding
> *As a new creator, I want to sign up with my email or Google account and claim a unique username, so that I have a dedicated vanity URL for my profile.*

```gherkin
Feature: Creator Registration

  Scenario: Successful signup with email and password
    Given a visitor is on the "/register" page
    When they enter a valid email "chloe@example.com"
    And a password with at least 8 characters
    And a unique username "chloe"
    And clicks "Create Account"
    Then an account is created in the database
    And a default unpublished profile is created with username "chloe"
    And a JWT session token is returned
    And the user is redirected to the dashboard onboarding

  Scenario: Attempting to claim an already taken username
    Given a user with username "chloe" already exists
    When a new visitor tries to register with username "chloe"
    Then the system displays an error "Username 'chloe' is already taken"
    And no new account is created

  Scenario: Attempting to claim a reserved system keyword
    When a visitor tries to register with username "admin" or "api" or "onelink"
    Then the system displays an error "This username is reserved"
```

### US-002: Link Creation & Drag-and-Drop Reordering
> *As a creator, I want to add, edit, and reorder my links with drag-and-drop in the dashboard, so that my most important content appears at the top.*

```gherkin
Feature: Link Management

  Scenario: Adding a new regular link
    Given an authenticated creator is on the dashboard "/links" tab
    When they click "Add Link"
    And enter title "Watch my new YouTube Video"
    And enter URL "https://youtube.com/watch?v=123"
    And submit the form
    Then OneLink Sentinel AI evaluates the URL threat level
    And if risk score < 0.30, the new link appears immediately in the list
    And the live preview phone mockup updates in real time
    And the public profile cache is invalidated

  Scenario: Reordering links via drag-and-drop
    Given a creator has 3 links with positions 0, 1, and 2
    When they drag link #3 to the top position (index 0)
    Then the UI updates optimistically
    And a PATCH request is dispatched with the reordered array
    And the database updates all link positions atomically
```

### US-003: Public Profile Visiting & Rendering
> *As a mobile visitor browsing Instagram, I want to tap on a creator's bio link and view their page in under 50ms, so that I can quickly navigate to their desired content.*

```gherkin
Feature: Public Profile Page

  Scenario: Visitor opens a published profile
    Given a creator "chloe" has published their profile
    When a mobile visitor navigates to "/@chloe"
    Then the page responds with HTTP 200
    And the server response time (TTFB) is under 50ms (via Redis cache-aside)
    And the creator's avatar, bio, and active links are rendered
    And a PageView event is dispatched asynchronously to the BullMQ telemetry queue
    And no user IP address is logged in plain text without hashing/anonymization
```

### US-004: Embedded AI Link Spam & Malicious URL Gatekeeper (OneLink Sentinel)
> *As a platform owner and safety engineer, I want an embedded machine learning engine running directly on the server with zero external tokens, so that malicious links and phishing campaigns are blocked before being saved.*

```gherkin
Feature: OneLink Sentinel Embedded AI Gatekeeper

  Scenario: Creator submits a legitimate URL
    Given an authenticated creator submits URL "https://github.com/crisa/system-design"
    When OneLink Sentinel AI analyzes lexical entropy and ONNX semantic embeddings
    Then the computed risk_score is 0.04 (Safe)
    And the link is saved to the database with status "ACTIVE"

  Scenario: Creator submits a phishing or crypto drainer URL
    Given a user attempts to add URL "http://metamask-security-update-eth-drainer.xyz/login"
    When OneLink Sentinel AI processes the URL in-memory (<25ms)
    Then entropy calculation detects high randomness and known phishing patterns
    And the embedded ONNX model classifies threat intent with risk_score = 0.94 (Critical)
    And the API returns HTTP 422 Unprocessable Entity
    And the response body explains "Blocked by OneLink Sentinel AI: High threat of credential harvesting / phishing"
    And a high-priority incident is logged to the Super Admin Moderation Queue
    And the link is NOT persisted to the public profile
```

### US-005: Super Admin Trust & Safety Console
> *As a Super Admin, I want to review flagged accounts, inspect AI threat scores, and ban repeat spammers in one click.*

```gherkin
Feature: Super Admin Moderation

  Scenario: Admin reviews flagged malicious link attempt
    Given a user triggered a Sentinel AI threat alert (risk_score > 0.75)
    When the Super Admin opens "/admin/moderation"
    Then the flagged URL, user account, IP country, and AI confidence vector are displayed
    When the admin clicks "Suspend Account & Ban Domain"
    Then the user's published profile is immediately unpublished
    And the domain is added to the permanent Redis blocklist
    And an immutable record is written to "admin_audit_logs"
```

### US-006: SaaS Owner Billing, Pricing Plans & Team Invites
> *As the SaaS Owner, I want to configure subscription tiers (Free, Pro, Enterprise), track live MRR, and invite team members, so that the platform sustains a profitable business.*

```gherkin
Feature: SaaS Owner Billing & Subscriptions

  Scenario: Owner updates plan pricing and features
    Given the platform owner is on "/studio/billing"
    When they adjust the "Creator Pro" tier to "$9/month" with custom domain support
    Then the Stripe product and price are synchronized via webhook
    And creators viewing the upgrade modal see the updated "$9/month" pricing
    And active subscriptions remain on their grandfathered rate
```

---

## 4. MoSCoW Feature Matrix

| Category | Features |
|---|---|
| **Must Have (Core)** | • Public profile page (`/@username`) with mobile-first layout.<br>• Split-screen Studio dashboard (60/40) with real-time iPhone 15 Pro sync.<br>• Drag-and-drop link CRUD.<br>• **OneLink Sentinel AI**: Embedded in-process ML (ONNX) URL threat/phishing blocker.<br>• 5+ Curated preset themes + Carbon Architecture Monochromatic palette.<br>• High-throughput telemetry (Beacon API + TimescaleDB hypertables). |
| **Should Have (SaaS Tier)** | • **Super Admin Moderation Console**: Threat audit stream, account ban toggles, domain blacklist.<br>• **SaaS Owner Billing Studio**: Stripe billing, plan tier editor (Free, Pro $9, Studio $29), team invites.<br>• Granular custom theme editor (custom hex, typography, button geometry).<br>• Advanced analytics (Views vs Clicks time-series, referrers, geo breakdown). |
| **Could Have (Scale)** | • Custom CNAME domains (`links.mybrand.com`).<br>• Team collaborator roles (Owner, Editor, Viewer).<br>• Link scheduling & expiration countdowns. |
| **Won't Have (Initial Release)** | • Third-party public developer REST API without authentication.<br>• Decentralized IPFS hosting (centralized high-speed edge CDN prioritized). |

---

## 5. UI/UX Wireframe Roadmap (Unified Google Stitch Canvas)

All visual designs are instantiated within the **same Google Stitch project** (`14141085438200447026`):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ONELINK SCREEN ARCHITECTURE                     │
├────┬────────────────────────┬─────────────┬────────────────────────────┤
│ #  │ Screen                 │ Route       │ Core Focus                 │
├────┼────────────────────────┼─────────────┼────────────────────────────┤
│ 1  │ Public Mobile Profile  │ `/@username`│ 50ms read, bio, link cards │
│ 2  │ Studio: Links Manager  │ `/studio/`  │ 60/40 Split, live preview  │
│ 3  │ Studio: Appearance     │ `/appearance│ Theme presets, font/radius │
│ 4  │ Studio: Analytics      │ `/analytics`│ Time-series, CTR, geo stats│
│ 5  │ Sentinel & Super Admin │ `/admin/`   │ AI threat feed, ban queue  │
│ 6  │ Owner: Billing & Plans │ `/billing`  │ Stripe tiers, MRR, invites │
└────┴────────────────────────┴─────────────┴────────────────────────────┘
```
