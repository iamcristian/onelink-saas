# 🏛️ System Architecture Document (SAD)

> **Architectural Style**: Clean Architecture / Ports & Adapters (Hexagonal) inside Monorepo  
> **Documentation Standard**: C4 Model (Context, Container, Component, Code)  
> **Status**: Approved  

---

## 1. C4 Model — Level 1: System Context Diagram

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#18181b',
    'primaryTextColor': '#fafafa',
    'primaryBorderColor': '#3f3f46',
    'lineColor': '#71717a',
    'clusterBkg': '#111113',
    'clusterBorder': '#27272a',
    'fontSize': '12px'
  },
  'flowchart': {
    'padding': 24,
    'nodeSpacing': 35,
    'rankSpacing': 45,
    'htmlLabels': true
  },
  'themeCSS': 'foreignObject { overflow: visible !important; } .label foreignObject { overflow: visible !important; } .node foreignObject { overflow: visible !important; } .edgeLabel foreignObject { overflow: visible !important; }'
}}%%
flowchart TB
    subgraph Users["Audience, Creators & Platform Ops"]
        direction TB
        subgraph ActorsTop["Creators & Public"]
            V["📱 Mobile Visitor<br/>(Instagram / TikTok)"]
            C["🎨 Content Creator<br/>(Studio Dashboard)"]
        end
        subgraph ActorsBottom["Platform Governance"]
            SA["🛡️ Super Admin<br/>(Trust & Safety / AI)"]
            OW["👑 SaaS Owner<br/>(Billing & Tiers)"]
        end
    end

    subgraph System["OneLink Platform Core"]
        PLATFORM["🔗 OneLink Platform<br/>Next.js 16 Web + NestJS 12 API<br/>Zero-Token ONNX AI Engine"]
    end

    subgraph ThirdParty["External Services"]
        direction TB
        subgraph ServicesRow1["Auth & Payments"]
            GOOGLE["🔑 Google Identity<br/>(OAuth 2.0 Auth)"]
            STRIPE["💳 Stripe Billing<br/>(Webhooks & Invoices)"]
        end
        subgraph ServicesRow2["Geo & Assets"]
            GEO["🌍 MaxMind GeoIP<br/>(City Resolution)"]
            S3["☁️ Object Storage<br/>(Assets & CDN)"]
        end
    end

    V -->|"Views bio & taps"| PLATFORM
    C -->|"Manages links"| PLATFORM
    SA -->|"Reviews threats"| PLATFORM
    OW -->|"Configures tiers"| PLATFORM
    PLATFORM -->|"Validates auth"| GOOGLE
    PLATFORM -->|"Syncs billing"| STRIPE
    PLATFORM -->|"Resolves GeoIP"| GEO
    PLATFORM -->|"Serves assets"| S3
```

---

## 2. C4 Model — Level 2: Container Diagram

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#18181b',
    'primaryTextColor': '#fafafa',
    'primaryBorderColor': '#3f3f46',
    'lineColor': '#71717a',
    'clusterBkg': '#111113',
    'clusterBorder': '#27272a',
    'fontSize': '12px'
  },
  'flowchart': {
    'padding': 24,
    'nodeSpacing': 35,
    'rankSpacing': 45,
    'htmlLabels': true
  },
  'themeCSS': 'foreignObject { overflow: visible !important; } .label foreignObject { overflow: visible !important; } .node foreignObject { overflow: visible !important; } .edgeLabel foreignObject { overflow: visible !important; }'
}}%%
flowchart TB
    subgraph Client["Client Devices"]
        BROWSER_V["📱 Mobile Visitor"]
        BROWSER_C["💻 Creator Web"]
        BROWSER_A["🛡️ Admin Console"]
    end

    subgraph Edge["Edge Layer (Cloudflare)"]
        CDN["Global Edge CDN<br/>Static Caching & DDoS Shield"]
    end

    subgraph Containers["Monorepo Containers"]
        direction TB
        WEB["Next.js 16 Web (Port 3000)<br/>SSR, ISR & React 19 Studio"]
        API["NestJS 12 API (Port 3001)<br/>Domain Services & BullMQ"]
        WORKER["Analytics Background Worker<br/>GeoIP, UA & Batch Ingest"]
    end

    subgraph EmbeddedAI["Zero-Token ML Tier"]
        ONNX["Sentinel ONNX Engine<br/>In-memory URL Inference"]
    end

    subgraph DataTier["Data & Cache Tier"]
        REDIS["Redis 7 Stack<br/>Cache, Queues & Limiting"]
        PG["PostgreSQL 16 + TimescaleDB<br/>Core DB & Time-Series"]
    end

    BROWSER_V --> CDN
    BROWSER_C --> CDN
    BROWSER_A --> CDN
    CDN --> WEB
    WEB -->|"Queries / Mutations"| API
    API -->|"Local inference"| ONNX
    API -->|"Cache read/write"| REDIS
    API -->|"Enqueues beacons"| REDIS
    REDIS -->|"Dispatches jobs"| WORKER
    WORKER -->|"Batch insert"| PG
    API -->|"ACID Queries"| PG
```

---

## 3. C4 Model — Level 3: Component Diagram (NestJS API Architecture)

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#18181b',
    'primaryTextColor': '#fafafa',
    'primaryBorderColor': '#3f3f46',
    'lineColor': '#71717a',
    'clusterBkg': '#111113',
    'clusterBorder': '#27272a',
    'fontSize': '12px'
  },
  'flowchart': {
    'padding': 20,
    'nodeSpacing': 30,
    'rankSpacing': 35,
    'htmlLabels': true
  },
  'themeCSS': 'foreignObject { overflow: visible !important; } .label foreignObject { overflow: visible !important; } .node foreignObject { overflow: visible !important; } .edgeLabel foreignObject { overflow: visible !important; }'
}}%%
flowchart TB
    subgraph API_App["apps/api Architecture"]
        subgraph Controllers["Presentation Layer (HTTP Controllers)"]
            direction TB
            subgraph Row1["Public & Studio Endpoints"]
                PC["ProfileController"]
                LC["LinkController"]
                TC["ThemeController"]
                AC["AnalyticsController"]
            end
            subgraph Row2["Auth, Security & Billing"]
                AUTH_C["AuthController"]
                SEC_C["SentinelController"]
                ADMIN_C["AdminController"]
                BILL_C["BillingController"]
            end
        end

        subgraph Services["Application Layer (Domain Services)"]
            direction TB
            subgraph CoreServices["Domain Core Services"]
                PS["ProfileService"]
                LS["LinkService"]
                AS["AnalyticsService"]
                AUTH_S["AuthService"]
            end
            subgraph SecServices["Security & Commerce"]
                SEC_S["SentinelAiService"]
                ADMIN_S["AdminService"]
                BILL_S["BillingService"]
            end
        end

        subgraph Infrastructure["Infrastructure Layer (Ports & Adapters)"]
            direction TB
            subgraph Repos["Prisma Repositories"]
                PR["ProfileRepo"]
                LR["LinkRepo"]
                SR["SecurityFlagRepo"]
                BR["BillingRepo"]
            end
            subgraph Adapters["Infrastructure Adapters"]
                CS["RedisService"]
                QP["BullMQProducer"]
                ONNX_ADAPTER["OnnxRuntimeAdapter"]
            end
        end
    end

    LC --> LS
    LS --> SEC_S
    SEC_S --> ONNX_ADAPTER
    SEC_S --> SR
    ADMIN_C --> ADMIN_S
    ADMIN_S --> PR
    ADMIN_S --> CS
    BILL_C --> BILL_S
    BILL_S --> BR
    PC --> PS
    AC --> AS
    TC --> PS
    AUTH_C --> AUTH_S
    PS --> PR
    PS --> CS
    LS --> LR
    LS --> CS
    AS --> QP
```

---

## 4. Cache Topology & Fallback Architecture

To guarantee the sub-50ms SLA on public profiles:

1. **Tier 1 (CDN Edge)**: Cloudflare caches HTML responses for public profiles. Stale-while-revalidate headers ensure instantaneous paints.
2. **Tier 2 (Redis JSON Blob)**: If CDN misses, Next.js calls NestJS, which looks up `profile:${username}` in Redis. The payload contains the profile metadata, active links, and active theme in a single serialized JSON object.
3. **Tier 3 (PostgreSQL Fallback)**: If Redis misses, PostgreSQL is queried using Prisma with a joined `include: { links: true, theme: true, customTheme: true }`. The serialized result is cached back into Redis with a 1-hour TTL.
4. **Circuit Breaker**: If Redis crashes, `RedisService` enters fallback mode; requests bypass cache directly to PostgreSQL without crashing the user's request.

---

## 5. OneLink Sentinel AI Architecture: Zero-Token Embedded Security

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'fontFamily': 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', 'fontSize': '12px'}}}%%
sequenceDiagram
    autonumber
    actor Creator as Content Creator
    participant Web as Next.js Dashboard
    participant API as NestJS LinkService
    participant Sentinel as SentinelAiService (ONNX)
    participant Redis as Redis Blocklist Cache
    participant DB as PostgreSQL
    participant Admin as Super Admin Queue

    Creator->>Web: Submits URL
    Web->>API: POST /api/links { title, url }
    API->>Redis: Check Domain against blocklist
    alt Domain is in Redis Blocklist
        Redis-->>API: MATCH (Instant Reject)
        API-->>Web: HTTP 422: Domain permanently banned
    else Domain not in blocklist
        API->>Sentinel: evaluateUrl(url)
        Note over Sentinel: Phase 1: Lexical Entropy & Punycode (sub-2ms)
        Note over Sentinel: Phase 2: ONNX Tensor Inference (sub-18ms)
        Sentinel-->>API: { riskScore: 0.94, threatType: "PHISHING" }
        alt riskScore >= 0.75 (Critical Threat)
            API->>DB: INSERT INTO security_flags
            API->>Admin: Dispatch real-time SSE threat event
            API-->>Web: HTTP 422: Blocked by OneLink Sentinel AI
            Web-->>Creator: Toast Error (Link NOT saved)
        else riskScore < 0.75 (Safe)
            API->>DB: INSERT INTO links
            API->>Redis: Invalidate profile cache
            API-->>Web: HTTP 201: Link Created Successfully
        end
    end
```

---

## 6. C4 Model — Level 4: Physical Deployment & Infrastructure Topology

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#18181b',
    'primaryTextColor': '#fafafa',
    'primaryBorderColor': '#3f3f46',
    'lineColor': '#71717a',
    'clusterBkg': '#111113',
    'clusterBorder': '#27272a',
    'fontSize': '12px'
  },
  'flowchart': {
    'padding': 24,
    'nodeSpacing': 35,
    'rankSpacing': 45,
    'htmlLabels': true
  },
  'themeCSS': 'foreignObject { overflow: visible !important; } .label foreignObject { overflow: visible !important; } .node foreignObject { overflow: visible !important; } .edgeLabel foreignObject { overflow: visible !important; }'
}}%%
flowchart TB
    subgraph UsersInternet["Public Internet"]
        CLIENT_MOBILE["📱 Mobile Users<br/>(iOS / Android)"]
        CLIENT_DESKTOP["💻 Creator Desktop<br/>(Studio Dashboard)"]
    end

    subgraph EdgeLayer["Edge / Ingress (Cloudflare)"]
        EDGE_DNS["Cloudflare DNS & SSL"]
        EDGE_WAF["Cloudflare WAF & Anti-DDoS"]
        EDGE_CACHE["Cloudflare CDN (ISR 30s)"]
    end

    subgraph ComputeCluster["Production Compute Cluster (Kubernetes / Docker)"]
        direction TB
        subgraph WebPod["apps/web (Next.js 16.4)"]
            WEB_SERVER["Next.js Node.js Server<br/>SSR & ISR Rendering Engine"]
        end

        subgraph ApiPod["apps/api (NestJS 12)"]
            API_SERVER["NestJS REST Engine<br/>SWC, Zod & Sentinel AI Engine"]
        end

        subgraph WorkerPod["Analytics & Background Engine"]
            BULLMQ_WORKER["BullMQ Async Consumer<br/>GeoIP, UA & Batch Writer"]
        end
    end

    subgraph DataStorage["Data & State Persistence"]
        direction TB
        subgraph RedisNode["Redis 7 Stack"]
            REDIS_PRIMARY["Redis Primary Instance<br/>Profile Blobs, Rate Limiting & Queues"]
        end

        subgraph PostgresNode["PostgreSQL 16 + TimescaleDB"]
            PG_RELATIONAL["Relational Core Tables<br/>users, profiles, links, themes, subscriptions"]
            TIMESCALE_HYPER["TimescaleDB Hypertables<br/>click_events & page_views time-series"]
        end
    end

    subgraph ThirdPartyAPIs["External SaaS Integrations"]
        STRIPE_API["Stripe API & Webhooks<br/>$2 Pro & $5 Enterprise Tiers"]
        RESEND_SMTP["Transactional Email<br/>Team Invites & Security Alerts"]
    end

    CLIENT_MOBILE --> EDGE_DNS
    CLIENT_DESKTOP --> EDGE_DNS
    EDGE_DNS --> EDGE_WAF
    EDGE_WAF --> EDGE_CACHE
    EDGE_CACHE --> WEB_SERVER
    WEB_SERVER -->|"Internal RPC / HTTP"| API_SERVER
    API_SERVER -->|"Fast In-Memory Cache"| REDIS_PRIMARY
    API_SERVER -->|"Relational Queries"| PG_RELATIONAL
    API_SERVER -->|"Enqueues Click Events"| REDIS_PRIMARY
    REDIS_PRIMARY -->|"De-queues Jobs"| BULLMQ_WORKER
    BULLMQ_WORKER -->|"Batched Time-series Insert"| TIMESCALE_HYPER
    API_SERVER -->|"Checkout & Webhooks"| STRIPE_API
    API_SERVER -->|"Invites & Notifications"| RESEND_SMTP
```

---

## 7. Multi-User Collaboration & Hierarchical RBAC Governance

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#18181b',
    'primaryTextColor': '#fafafa',
    'primaryBorderColor': '#3f3f46',
    'lineColor': '#71717a',
    'clusterBkg': '#111113',
    'clusterBorder': '#27272a',
    'fontSize': '12px'
  },
  'flowchart': {
    'padding': 20,
    'nodeSpacing': 30,
    'rankSpacing': 35,
    'htmlLabels': true
  },
  'themeCSS': 'foreignObject { overflow: visible !important; } .label foreignObject { overflow: visible !important; } .node foreignObject { overflow: visible !important; } .edgeLabel foreignObject { overflow: visible !important; }'
}}%%
flowchart TD
    OWNER["👑 Platform Owner (Rank 5)<br/>Full Governance & Membership Control"]
    ADMIN["🛡️ Admin (Rank 4)<br/>Manage Content, Invite Editors & Viewers"]
    SAFETY["🔍 Safety Admin (Rank 3)<br/>Trust & Safety, Ban Malicious URLs"]
    EDITOR["✏️ Content Editor (Rank 2)<br/>Create, Edit & Reorder Links"]
    VIEWER["👀 Viewer (Rank 1)<br/>Read-Only Studio & Telemetry Inspection"]

    OWNER -->|"Manages"| ADMIN
    OWNER -->|"Manages"| SAFETY
    OWNER -->|"Manages"| EDITOR
    OWNER -->|"Manages"| VIEWER
    ADMIN -->|"Can modify"| EDITOR
    ADMIN -->|"Can modify"| VIEWER

    subgraph AntiRecursion["Anti-Recursion & Redundancy Guardrails"]
        G1["🚫 Cannot invite Workspace Owner as collaborator"]
        G2["🚫 Cannot self-invite requesting user's own email"]
        G3["🚫 Deduplicate active members & pending invites"]
        G4["🚫 Disallow circular workspace memberships"]
    end
```

---

## 8. Stripe Recurring Billing & Tax Invoicing Architecture

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'fontFamily': 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', 'fontSize': '12px'}}}%%
sequenceDiagram
    autonumber
    actor Creator as Content Creator
    participant Web as Studio Billing Page
    participant API as NestJS BillingService
    participant Stripe as Stripe API & Customer Portal
    participant DB as PostgreSQL Subscriptions

    Creator->>Web: Selects Plan ($2.00 Pro or $5.00 Enterprise)
    Web->>API: POST /api/billing/create-checkout-session
    API->>Stripe: stripe.checkout.sessions.create({ priceId, customerId })
    Stripe-->>API: { sessionUrl }
    API-->>Web: Redirect to Stripe Checkout
    Creator->>Stripe: Completes Payment with Card
    Stripe->>API: Webhook: checkout.session.completed
    API->>DB: Upsert Subscription (ACTIVE, planId, stripeCustomerId)
    Creator->>Web: Navigates to /studio/billing
    Web->>API: GET /api/billing/invoices
    API->>Stripe: stripe.invoices.list({ customerId })
    Stripe-->>API: Invoices List (Amount, Status, PDF URL)
    API-->>Web: Return JSON Invoices Array
    Creator->>Web: Clicks "Download PDF"
    alt Stripe PDF Available
        Web->>Creator: Open official Stripe Invoice PDF
    else Test / Simulation Mode
        Web->>Creator: Client-side Synthesis & Print Official Tax Invoice
    end
```

---

## 9. Interactive Note & Digital Notepad Block Architecture

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#18181b',
    'primaryTextColor': '#fafafa',
    'primaryBorderColor': '#3f3f46',
    'lineColor': '#71717a',
    'clusterBkg': '#111113',
    'clusterBorder': '#27272a',
    'fontSize': '12px'
  },
  'flowchart': {
    'padding': 24,
    'nodeSpacing': 35,
    'rankSpacing': 45,
    'htmlLabels': true
  },
  'themeCSS': 'foreignObject { overflow: visible !important; } .label foreignObject { overflow: visible !important; } .node foreignObject { overflow: visible !important; } .edgeLabel foreignObject { overflow: visible !important; }'
}}%%
flowchart LR
    subgraph CreatorStudio["Creator Studio"]
        CREATE_NOTE["+ Add Note Button"] -->|"Title + Multiline Content"| MODAL_NOTE["AddEditLinkModal (NOTE type)"]
        MODAL_NOTE -->|"Stores Title & Multiline URL"| API_LINK["LinkService (Bypasses HTTP check)"]
    end

    subgraph Database["Database Persistence"]
        API_LINK -->|"Persists LinkType.NOTE"| PG_LINK["PostgreSQL Link Table"]
    end

    subgraph PublicBio["Public Bio Page & Studio Preview"]
        PG_LINK -->|"Next.js ISR / Public View"| PILL_NOTE["LinkPill (Sticky Note Icon + Read Note)"]
        PILL_NOTE -->|"User Clicks Note Pill"| READER_MODAL["Digital Notepad Modal<br/>Title, Word Count & Full Text<br/>One-Click Copy Text Action"]
    end
```
