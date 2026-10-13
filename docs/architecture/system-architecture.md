# 🏛️ System Architecture Document (SAD)

> **Architectural Style**: Clean Architecture / Ports & Adapters (Hexagonal) inside Monorepo  
> **Documentation Standard**: C4 Model (Context, Container, Component, Code)  
> **Status**: Approved  

---

## 1. C4 Model — Level 1: System Context Diagram

```mermaid
graph TB
    subgraph Users["Audience & Creators"]
        V["👀 Mobile Visitor<br/>(Browses from Instagram / TikTok)"]
        C["🎨 Content Creator<br/>(Uses Desktop & Mobile Dashboard)"]
    end

    subgraph System["Link-in-Bio Platform"]
        PLATFORM["🔗 Link-in-Bio Platform<br/>(Next.js 16 Web + NestJS 12 API)"]
    end

    subgraph ThirdParty["External Services"]
        GOOGLE["🔑 Google Identity<br/>(OAuth 2.0 Auth Provider)"]
        GEO["🌍 MaxMind GeoIP<br/>(IP-to-City Resolution)"]
        S3["☁️ Object Storage<br/>(Avatars & Thumbnails CDN)"]
    end

    V -->|"Requests /@username & taps links"| PLATFORM
    C -->|"Configures links, themes & checks metrics"| PLATFORM
    PLATFORM -->|"Validates OAuth tokens"| GOOGLE
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
    end

    subgraph Edge["Edge Layer (Cloudflare)"]
        CDN["Global Edge CDN<br/>• Static Asset Caching<br/>• DDoS & SSL Termination"]
    end

    subgraph Containers["Monorepo Containers"]
        WEB["Next.js 16 Web Application<br/>(Port 3000)<br/>• Incremental Static Regeneration (ISR)<br/>• Server-rendered Profile Pages<br/>• React 19 Creator Dashboard"]
        API["NestJS 12 REST API<br/>(Port 3001)<br/>• Domain Services & Validation Pipes<br/>• BullMQ Job Producers<br/>• OpenAPI / Swagger Documentation"]
        WORKER["Analytics Background Worker<br/>• Consumes BullMQ click & view jobs<br/>• GeoIP & UA parsing<br/>• Batch writes to TimescaleDB"]
    end

    subgraph DataTier["Data & Cache Tier"]
        REDIS["Redis 7 Stack<br/>• Hot Profile JSON Blob Cache<br/>• BullMQ Message Broker<br/>• Token Bucket Rate Limiting"]
        PG["PostgreSQL 16 + TimescaleDB<br/>• Relational Users, Profiles, Links<br/>• Time-Series click_events & page_views"]
    end

    BROWSER_V --> CDN
    BROWSER_C --> CDN
    CDN --> WEB
    WEB -->|"Queries Profile Data / Mutations"| API
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
        end

        subgraph Services["Application Layer (Domain Services)"]
            PS["ProfileService<br/>• Profile lifecycle<br/>• Username validation<br/>• Cache orchestration"]
            LS["LinkService<br/>• Link CRUD<br/>• Atomic position shifts"]
            AS["AnalyticsService<br/>• Beacon ingestion<br/>• Aggregation queries"]
            AUTH_S["AuthService<br/>• Bcrypt verification<br/>• JWT issuance & rotation"]
        end

        subgraph Infrastructure["Infrastructure Layer (Ports & Adapters)"]
            PR["ProfileRepository (Port)<br/>Implemented with PrismaService"]
            LR["LinkRepository (Port)<br/>Implemented with PrismaService"]
            CS["CacheService<br/>Implemented with RedisService"]
            QP["QueueProducer<br/>Implemented with BullMQ"]
        end
    end

    PC --> PS
    LC --> LS
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
