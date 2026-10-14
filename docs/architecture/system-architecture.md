# 🏛️ System Architecture Document (SAD)

> **Architectural Style**: Clean Architecture / Ports & Adapters (Hexagonal) inside Monorepo  
> **Documentation Standard**: C4 Model (Context, Container, Component, Code)  
> **Status**: Approved  

---

## 1. C4 Model — Level 1: System Context Diagram

```mermaid
graph TB
    subgraph Users["Audience, Creators & Platform Ops"]
        V["👀 Mobile Visitor<br/>(Browses from Instagram / TikTok)"]
        C["🎨 Content Creator<br/>(Uses Desktop & Mobile Dashboard)"]
        SA["🛡️ Super Admin<br/>(Trust & Safety / Sentinel AI Alerts)"]
        OW["👑 SaaS Owner<br/>(Pricing Plans, Billing & Team Invites)"]
    end

    subgraph System["OneLink Platform"]
        PLATFORM["🔗 OneLink Platform<br/>(Next.js 16 Web + NestJS 12 API + Embedded ONNX AI)"]
    end

    subgraph ThirdParty["External Services"]
        GOOGLE["🔑 Google Identity<br/>(OAuth 2.0 Auth Provider)"]
        STRIPE["💳 Stripe Billing API<br/>(Subscription Webhooks & Portals)"]
        GEO["🌍 MaxMind GeoIP<br/>(IP-to-City Resolution)"]
        S3["☁️ Object Storage<br/>(Avatars & Thumbnails CDN)"]
    end

    V -->|"Requests /@username & taps links"| PLATFORM
    C -->|"Configures links, themes & checks metrics"| PLATFORM
    SA -->|"Reviews AI threat queue & executes bans"| PLATFORM
    OW -->|"Configures tiers & views MRR metrics"| PLATFORM
    PLATFORM -->|"Validates OAuth tokens"| GOOGLE
    PLATFORM -->|"Syncs subscriptions & invoices"| STRIPE
    PLATFORM -->|"Enriches click analytics"| GEO
    PLATFORM -->|"Uploads & serves optimized WebP images"| S3
```

---

## 2. C4 Model — Level 2: Container Diagram

```mermaid
graph TB
    subgraph Client["Client Devices"]
        BROWSER_V["Visitor Mobile Browser"]
        BROWSER_C["Creator Web Browser"]
        BROWSER_A["Super Admin & Owner Console"]
    end

    subgraph Edge["Edge Layer (Cloudflare)"]
        CDN["Global Edge CDN<br/>• Static Asset Caching<br/>• DDoS & SSL Termination"]
    end

    subgraph Containers["Monorepo Containers"]
        WEB["Next.js 16 Web Application<br/>(Port 3000)<br/>• Incremental Static Regeneration (ISR)<br/>• Server-rendered Profile Pages<br/>• React 19 Creator Dashboard<br/>• Super Admin & Billing Studio"]
        
        API["NestJS 12 REST API<br/>(Port 3001)<br/>• Domain Services & Validation Pipes<br/>• Embedded Sentinel AI Engine (ONNX)<br/>• BullMQ Job Producers<br/>• OpenAPI / Swagger Documentation"]
        
        WORKER["Analytics Background Worker<br/>• Consumes BullMQ click & view jobs<br/>• GeoIP & UA parsing<br/>• Batch writes to TimescaleDB"]
    end

    subgraph EmbeddedAI["Zero-Token In-Process ML Tier"]
        ONNX["OneLink Sentinel Engine<br/>• onnxruntime-node in-memory<br/>• Lexical Shannon Entropy Extractor<br/>• Quantized Threat Classifier<br/>• <25ms Zero-Token Inference"]
    end

    subgraph DataTier["Data & Cache Tier"]
        REDIS["Redis 7 Stack<br/>• Hot Profile JSON Blob Cache<br/>• BullMQ Message Broker<br/>• Sentinel Domain Blocklist Set<br/>• Token Bucket Rate Limiting"]
        PG["PostgreSQL 16 + TimescaleDB<br/>• Users, Profiles, Links, Themes<br/>• Plans, Subscriptions, Audit Logs<br/>• Time-Series click_events & page_views"]
    end

    BROWSER_V --> CDN
    BROWSER_C --> CDN
    BROWSER_A --> CDN
    CDN --> WEB
    WEB -->|"Queries Profile Data / Mutations"| API
    API -->|"Executes zero-token local inference"| ONNX
    API -->|"Cache-aside read / write"| REDIS
    API -->|"Enqueues track beacons"| REDIS
    REDIS -->|"Dispatches jobs"| WORKER
    WORKER -->|"Batched hypertables insert"| PG
    API -->|"ACID Relational Queries"| PG
```

---

## 3. C4 Model — Level 3: Component Diagram (NestJS API Architecture)

```mermaid
graph TB
    subgraph API_App["apps/api Core Components"]
        subgraph Controllers["Presentation Layer (HTTP Controllers)"]
            PC["ProfileController<br/>/@:username & /profiles/me"]
            LC["LinkController<br/>/links & /links/reorder"]
            TC["ThemeController<br/>/themes & /themes/presets"]
            AC["AnalyticsController<br/>/track/click & /track/view"]
            AUTH_C["AuthController<br/>/auth/login & /auth/google"]
            SEC_C["SentinelController<br/>/sentinel/evaluate & /sentinel/threats"]
            ADMIN_C["AdminController<br/>/admin/moderation & /admin/users/:id/ban"]
            BILL_C["BillingController<br/>/billing/plans & /billing/webhook"]
        end

        subgraph Services["Application Layer (Domain Services)"]
            PS["ProfileService<br/>• Profile lifecycle & cache"]
            LS["LinkService<br/>• Link CRUD & atomic shifts"]
            AS["AnalyticsService<br/>• Ingestion & rollups"]
            AUTH_S["AuthService<br/>• Bcrypt, JWT & RBAC"]
            SEC_S["SentinelAiService<br/>• In-memory URL threat scoring<br/>• Shannon entropy calculation<br/>• Zero-token ONNX tensor evaluation"]
            ADMIN_S["AdminService<br/>• Account suspension & domain ban"]
            BILL_S["BillingService<br/>• Plan tier sync & Stripe webhooks"]
        end

        subgraph Infrastructure["Infrastructure Layer (Ports & Adapters)"]
            PR["ProfileRepository (PrismaService)"]
            LR["LinkRepository (PrismaService)"]
            SR["SecurityFlagRepository (PrismaService)"]
            BR["BillingRepository (PrismaService)"]
            CS["CacheService (RedisService)"]
            QP["QueueProducer (BullMQ)"]
            ONNX_ADAPTER["OnnxRuntimeAdapter (In-process Tensor Engine)"]
        end
    end

    LC --> LS
    LS -->|"Pre-save evaluation"| SEC_S
    SEC_S --> ONNX_ADAPTER
    SEC_S -->|"On threat >= 0.75"| SR
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
sequenceDiagram
    autonumber
    actor Creator as Content Creator
    participant Web as Next.js Dashboard
    participant API as NestJS LinkService
    participant Sentinel as SentinelAiService (ONNX)
    participant Redis as Redis Blocklist Cache
    participant DB as PostgreSQL
    participant Admin as Super Admin Queue

    Creator->>Web: Submits URL ("http://login-verify-eth-drainer.xyz")
    Web->>API: POST /api/links { title, url }
    API->>Redis: Check Domain against "blocklist:domains"
    alt Domain is in Redis Blocklist
        Redis-->>API: MATCH (Instant Reject)
        API-->>Web: HTTP 422: "Domain permanently banned"
    else Domain not in blocklist
        API->>Sentinel: evaluateUrl(url)
        Note over Sentinel: Phase 1: Lexical Entropy & Punycode analysis (<2ms)
        Note over Sentinel: Phase 2: Embedded ONNX Runtime Tensor Inference (<18ms)
        Sentinel-->>API: { riskScore: 0.94, threatType: "PHISHING", confidence: 0.98 }
        alt riskScore >= 0.75 (Critical Threat)
            API->>DB: INSERT INTO security_flags (risk_score, threat_type, ...)
            API->>Admin: Dispatch real-time SSE threat event
            API-->>Web: HTTP 422: "Blocked by OneLink Sentinel AI: Phishing attempt"
            Web-->>Creator: Toast Error with threat breakdown (Link NOT saved)
        else riskScore < 0.75 (Safe)
            API->>DB: INSERT INTO links (...)
            API->>Redis: Invalidate profile cache
            API-->>Web: HTTP 201: Link Created Successfully
        end
    end
```
