# 🔄 Sequence & Interaction Flows

> **Scope**: Critical user journeys and system communication protocols  
> **Notation**: Mermaid Sequence Diagrams  
> **Status**: Approved  

---

## 1. Flow 1: Public Profile Rendering (Hot Path)

The most latency-sensitive flow in the entire platform: a visitor taps a link in an Instagram or TikTok bio.

```mermaid
sequenceDiagram
    autonumber
    actor V as 📱 Mobile Visitor
    participant CDN as 🌐 Edge CDN / ISR Cache
    participant WEB as ⚡ Next.js 16 (apps/web)
    participant API as 🚀 NestJS 12 (apps/api)
    participant REDIS as ⚡ Redis 7 (Cache)
    participant PG as 🐘 PostgreSQL (Prisma)
    participant Q as 📬 BullMQ (Queue)

    V->>CDN: GET /@chloe
    alt CDN Cache Hit (< 50ms)
        CDN-->>V: Return Cached HTML
    else CDN Cache Miss or Stale
        CDN->>WEB: SSR / ISR Execution
        WEB->>API: GET /api/profiles/chloe
        
        API->>REDIS: GET profile:chloe
        alt Redis Hit (< 10ms)
            REDIS-->>API: Return Profile JSON Blob
        else Redis Miss
            API->>PG: SELECT * FROM profiles WHERE username = 'chloe' (Joined links & theme)
            PG-->>API: Return DB Entity Record
            API->>REDIS: SET profile:chloe (TTL 3600s)
        end
        
        API-->>WEB: HTTP 200 { profile, links, theme }
        WEB-->>CDN: Rendered HTML + On-Demand Cache Tag
        CDN-->>V: Rendered HTML Response (< 150ms)
    end

    Note over V,Q: Fire-and-forget Analytics Event
    V-)API: POST /api/track/view { profileId: '...' }
    API-)Q: Enqueue pageview job
    API-->>V: HTTP 204 No Content
```

---

## 2. Flow 2: Asynchronous Link Click Tracking

A visitor taps a link on the profile. The destination must open instantaneously without waiting for analytics database writes.

```mermaid
sequenceDiagram
    autonumber
    actor V as 📱 Mobile Visitor
    participant BROWSER as 🌐 Web Browser
    participant API as 🚀 NestJS 12
    participant Q as 📬 BullMQ Queue
    participant W as ⚙️ Background Worker
    participant GEO as 🌍 MaxMind GeoIP
    participant TS as 📈 TimescaleDB (Hypertables)

    V->>BROWSER: Taps "Watch YouTube Video"
    
    par Instant Navigation
        BROWSER->>V: Open target URL in new tab
    and Non-Blocking Beacon
        BROWSER-)API: navigator.sendBeacon('/api/track/click', payload)
    end

    API->>Q: pushJob('analytics-clicks', { linkId, profileId, ip, ua, referrer })
    API-->>BROWSER: HTTP 204 No Content (< 20ms)

    Note over Q,W: Asynchronous Processing Outside Request Pipeline
    Q->>W: Process Click Event Job
    W->>GEO: Lookup Country & City from IP
    GEO-->>W: { country: 'US', city: 'Los Angeles' }
    W->>W: Parse User-Agent (Mobile / iOS / Safari) & Check Bot Signatures
    W->>W: Hash/Anonymize IP Address (GDPR compliance)
    
    W->>TS: INSERT INTO click_events (link_id, profile_id, clicked_at, country, is_bot, ...)
    W->>TS: UPDATE links SET click_count = click_count + 1 WHERE id = link_id
```

---

## 3. Flow 3: Creator Profile Mutation & Real-Time Cache Invalidation

When a creator changes links, reorders items, or switches a theme, the public profile page must be refreshed globally.

```mermaid
sequenceDiagram
    autonumber
    actor C as 🎨 Content Creator
    participant DASH as 💻 Dashboard (Next.js)
    participant API as 🚀 NestJS 12
    participant PG as 🐘 PostgreSQL (Prisma)
    participant REDIS as ⚡ Redis 7
    participant WEB as 🌐 Next.js ISR Revalidation

    C->>DASH: Drag link #3 to position #0
    DASH->>DASH: Optimistic UI reorder in live mobile frame
    
    DASH->>API: PATCH /api/links/reorder [{ id, position }, ...]
    API->>PG: Transaction: UPDATE links SET position = ...
    PG-->>API: Transaction Committed
    
    par Invalidate Cache Tiers
        API->>REDIS: DEL profile:chloe
        API->>WEB: POST /api/revalidate?secret=...&tag=profile-chloe
        WEB->>WEB: revalidateTag('profile-chloe')
    end

    API-->>DASH: HTTP 200 { success: true }
    DASH-->>C: Confirm change with toast notification
```
