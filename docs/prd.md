# 📄 Product Requirements Document (PRD)

> **Project**: Link-in-Bio Platform (Linktree Alternative)  
> **Author**: Engineering & Product Team  
> **Status**: Approved  
> **Version**: 1.0  
> **Target Audience**: Content Creators, Influencers, Freelancers & Small Businesses  

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
Social media platforms (Instagram, TikTok, X, YouTube, LinkedIn) allow users only **one single link** in their public biography. Content creators, artists, and independent entrepreneurs have diverse digital footprints: YouTube channels, online stores, newsletters, affiliate links, and portfolios. Forcing them into a single static link causes lost conversions, audience fragmentation, and zero analytics on link engagement.

### 1.2 Proposed Solution
A high-performance, mobile-first **Link-in-Bio platform** that allows any user to create a personalized, lightning-fast public landing page (`domain.com/@username`) in under 2 minutes. The platform combines:
- A real-time split-screen dashboard with live mobile preview.
- Drag-and-drop link management.
- Dynamic customizable theme engines (colors, typography, button styles).
- In-depth, privacy-friendly audience analytics (clicks, page views, referrers, geo distribution).

---

## 2. Target User Personas

```
┌────────────────────────────────────────────────────────────────────────┐
│                         USER PERSONAS                                  │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ 📸 Creator Chloe │ 💻 Freelancer Leo│ 🛍️ Boutique Bea  │ 📱 Mobile Max │
├──────────────────┼──────────────────┼──────────────────┼───────────────┤
│ • 24 years old   │ • 29 years old   │ • 35 years old   │ • 19 years old│
│ • TikTok & IG    │ • Full-stack dev │ • Artisan store  │ • Instagram   │
│ • Needs: Aesthetic│ • Needs: Custom  │ • Needs: Simple  │   consumer    │
│   theme matching │   portfolio & CV │   product links  │ • Needs: Ultra│
│   her personal   │   links + socials│   & WhatsApp chat│   fast load   │
│   brand          │ • High tech-savvy│ • Low tech-savvy │   on 4G/5G    │
└──────────────────┴──────────────────┴──────────────────┴───────────────┘
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
    When a visitor tries to register with username "admin" or "api"
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
    Then the new link appears immediately in the link list
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
> *As a mobile visitor browsing Instagram, I want to tap on a creator's bio link and view their page in under 200ms, so that I can quickly navigate to their desired content.*

```gherkin
Feature: Public Profile Page

  Scenario: Visitor opens a published profile
    Given a creator "chloe" has published their profile
    When a mobile visitor navigates to "/@chloe"
    Then the page responds with HTTP 200
    And the server response time (TTFB) is under 150ms
    And the creator's avatar, bio, and active links are rendered
    And a PageView event is dispatched asynchronously to the analytics queue
    And no user IP address is logged in plain text without hashing/anonymization

  Scenario: Visitor opens an unpublished profile
    Given a user "john" has an unpublished profile
    When a visitor navigates to "/@john"
    Then the system returns an HTTP 404 "Profile Not Found" page
```

### US-004: Live Theme Selection & Customization
> *As a creator, I want to choose from preset themes or pick custom colors and fonts, so that my link page reflects my aesthetic identity.*

```gherkin
Feature: Theme Customization

  Scenario: Selecting a preset theme
    Given a creator is in the "/appearance" dashboard tab
    When they click on the "Sunset Glow" preset theme card
    Then the live mobile mockup changes background to sunset gradient
    And button styles change to semi-transparent rounded pill buttons
    And saving persists the "themeId" to their profile
    And the public profile page cache is updated immediately
```

---

## 4. MoSCoW Feature Matrix

| Category | Features |
|---|---|
| **Must Have (MVP)** | • Public profile page (`/@username`) with mobile-first layout.<br>• Link CRUD with drag-and-drop reordering.<br>• Email/Password + Google OAuth 2.0 authentication.<br>• 5+ Curated preset themes (Dark, Light, Gradient, Emerald).<br>• Live split-screen preview dashboard.<br>• Basic click and page view tracking. |
| **Should Have (Phase 2-3)** | • Granular custom theme editor (custom hex, gradients, border radius).<br>• Social media icon bar (IG, TikTok, YouTube, Spotify, etc.).<br>• Link thumbnails (image upload or favicon auto-fetch).<br>• Comprehensive analytics dashboard (charts, geolocations, top referrers). |
| **Could Have (Phase 4-5)** | • Link scheduling (deferred to future expansion).<br>• Sensitive content warning interstitial.<br>• Embedded media players (Spotify, YouTube embeds).<br>• Custom domains (e.g., `links.mybrand.com`). |
| **Won't Have (Initial Release)** | • Admin moderation web portal (automated keyword blocklists suffice).<br>• Third-party developer public REST API (creator-focused product).<br>• Paid subscription billing / Stripe (strictly scheduled for Phase 5). |

---

## 5. UI/UX Wireframe Roadmap (Google Stitch & Component Specs)

To achieve a top-tier aesthetic before writing frontend components, the UI design must follow these key views:

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CORE SCREEN ARCHITECTURE                       │
├─────────────────────┬──────────────────────────────────────────────────┤
│ View                │ Layout & Key Elements                            │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 1. Landing Page     │ Hero section with interactive live demo widget,  │
│    (`/`)            │ social proof, features showcase, pricing preview │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 2. Auth Flow        │ Split screen: Brand artwork left, minimalist     │
│    (`/login`,       │ Google OAuth button + email form right           │
│     `/register`)    │                                                  │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 3. Dashboard Editor │ Left side: Tab navigation (`Links`, `Appearance`,│
│    (`/dashboard`)   │ `Analytics`, `Settings`) + editor form controls  │
│                     │ Right side: Sticky iPhone frame with live preview│
├─────────────────────┼──────────────────────────────────────────────────┤
│ 4. Public Profile   │ Centered vertical column (max-width 680px),      │
│    (`/@username`)   │ avatar header, bio, social icons row, link cards │
│                     │ with subtle hover animations                     │
└─────────────────────┴──────────────────────────────────────────────────┘
```
