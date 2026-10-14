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

---

## 4. Flow 4: OneLink Sentinel AI Zero-Token Threat Interception & Mitigation

When a user attempts to add a link, the in-process Sentinel AI engine inspects the URL before saving to PostgreSQL. Malicious or phishing links are blocked in <25ms with HTTP 422 and immediately routed to the Super Admin moderation queue.

```mermaid
sequenceDiagram
    autonumber
    actor C as 🎨 Content Creator / Threat Actor
    participant DASH as 💻 Studio Dashboard (Next.js)
    participant API as 🚀 NestJS LinkService
    participant REDIS as ⚡ Redis Blocklist Set
    participant SENTINEL as 🛡️ SentinelAiService (ONNX In-Memory)
    participant DB as 🐘 PostgreSQL (Prisma)
    participant ADMIN as 🚨 Super Admin WebSocket / Queue

    C->>DASH: Submits Link: "http://metamask-security-auth.xyz/drain"
    DASH->>API: POST /api/links { title: "Claim Tokens", url: "..." }
    
    API->>REDIS: SISMEMBER blocklist:domains "metamask-security-auth.xyz"
    alt Domain already permanently banned
        REDIS-->>API: 1 (Match in Blocklist)
        API-->>DASH: HTTP 422 "Blocked: Domain permanently banned"
        DASH-->>C: Display Red Error Toast: Blocked by Security Policy
    else Domain not yet blacklisted
        API->>SENTINEL: evaluateUrl("http://metamask-security-auth.xyz/drain")
        
        Note over SENTINEL: Phase 1: Lexical & Shannon Entropy Scan (<2ms)
        Note over SENTINEL: Phase 2: In-Memory ONNX Tensor Evaluation (<18ms)
        SENTINEL-->>API: Verdict: { riskScore: 0.94, threatType: "CRYPTO_DRAINER", confidence: 0.98 }
        
        alt riskScore >= 0.75 (Critical Threat Detected)
            API->>DB: INSERT INTO security_flags (user_id, submitted_url, risk_score, threat_type, status: "BLOCKED_AUTO")
            API->>ADMIN: Broadcast Event: NEW_THREAT_INTERCEPTED (Live SSE / WebSocket)
            API-->>DASH: HTTP 422 Unprocessable Entity { error: "Blocked by OneLink Sentinel AI: High threat of crypto drainer" }
            DASH-->>C: Display Warning Dialog (Link is NOT saved, Bio remains clean)
        else riskScore < 0.75 (Legitimate URL)
            API->>DB: INSERT INTO links (profile_id, title, url, position, is_active: true)
            API->>REDIS: DEL profile:username (Cache Invalidation)
            API-->>DASH: HTTP 201 Created { link }
            DASH-->>C: Optimistic Link Inserted & Live Phone Preview Synced
        end
    end
```

---

## 5. Flow 5: SaaS Owner Subscription Provisioning & Stripe Webhook Lifecycle

When a creator upgrades to "Creator Pro" ($9/mo) or "Enterprise Studio" ($29/mo), Stripe checkout handles billing and dispatches secure webhooks to provision features atomically.

```mermaid
sequenceDiagram
    autonumber
    actor C as 🎨 Content Creator
    participant DASH as 💻 Studio (Next.js)
    participant STRIPE_UI as 💳 Stripe Checkout Portal
    participant STRIPE_API as 🌐 Stripe Billing API
    participant API as 🚀 NestJS BillingController
    participant DB as 🐘 PostgreSQL (Prisma)
    participant REDIS as ⚡ Redis (Feature Flags Cache)

    C->>DASH: Clicks "Upgrade to Creator Pro ($9/mo)"
    DASH->>API: POST /api/billing/create-checkout-session { planCode: "PRO" }
    API->>STRIPE_API: stripe.checkout.sessions.create({ customer, line_items, success_url })
    STRIPE_API-->>API: { sessionUrl: "https://checkout.stripe.com/c/pay/..." }
    API-->>DASH: HTTP 200 { sessionUrl }
    DASH->>STRIPE_UI: Redirect Creator to Stripe Hosted Checkout
    
    C->>STRIPE_UI: Enters Payment Details & Confirms $9.00
    STRIPE_UI->>STRIPE_API: Process Payment
    STRIPE_UI-->>C: Redirects back to onelink.bio/studio/billing?success=true
    
    Note over STRIPE_API,API: Asynchronous Webhook Delivery (HMAC Signature Verified)
    STRIPE_API-)API: POST /api/billing/webhook (Event: invoice.payment_succeeded)
    
    API->>API: Verify Stripe-Signature header with STRIPE_WEBHOOK_SECRET
    alt Invalid Signature
        API-->>STRIPE_API: HTTP 400 Bad Request (Tamper Protection)
    else Signature Verified
        API->>DB: UPSERT INTO subscriptions (user_id, plan_id: "PRO", status: "ACTIVE", current_period_end)
        API->>REDIS: SET user:features:{userId} '{"customThemes": true, "removeBranding": true}'
        API-->>STRIPE_API: HTTP 200 OK (Event Acknowledged)
    end
    
    DASH->>API: GET /api/users/me/subscription
    API-->>DASH: HTTP 200 { plan: "Creator Pro", status: "ACTIVE", features }
    DASH-->>C: Unlock Pro Themes, Custom Fonts & Remove Watermark immediately
```
