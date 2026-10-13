# 📑 Software Requirements Specification (SRS)

> **Standard**: Adapted from IEEE Std 830-1998  
> **System**: Scalable Link-in-Bio Platform  
> **Version**: 1.0  
> **Status**: Approved  

---

## 1. Introduction

### 1.1 Purpose
This document provides a formal, comprehensive specification of the functional and non-functional requirements for the Link-in-Bio platform. It serves as the single source of truth for engineering implementation, test verification, and quality assurance.

### 1.2 Scope
The system encompasses:
- An API backend providing user authentication, profile data persistence, link management, and asynchronous high-throughput event tracking.
- A public edge-rendered web application serving public creator profiles (`/@username`).
- A responsive creator dashboard enabling real-time content mutation, theme customization, and analytics visualization.

---

## 2. Functional Requirements Catalog

### 2.1 Profile Management (FR-P)

| Requirement ID | Description | Acceptance Criteria & Edge Cases |
|---|---|---|
| **FR-P-01** | **Username Reservation** | • Username must be 3-30 chars, matching `^[a-zA-Z0-9_-]+$`.<br>• Must not match reserved keywords (`admin`, `api`, etc.).<br>• Case-insensitive uniqueness enforced by unique database index.<br>• Changing username must automatically invalidate previous cache keys. |
| **FR-P-02** | **Profile Publication** | • Profiles are `isPublished: false` by default upon registration.<br>• Unauthenticated visitors requesting an unpublished profile receive HTTP 404.<br>• Publishing requires at least a username and a valid title. |
| **FR-P-03** | **Avatar Pipeline** | • Accepts JPEG, PNG, WebP up to 5MB.<br>• Files are processed using `Sharp`: auto-oriented, cropped to 1:1 ratio, converted to WebP at 400x400px.<br>• Stored via `IStorageService` abstraction. |

### 2.2 Link Management (FR-L)

| Requirement ID | Description | Acceptance Criteria & Edge Cases |
|---|---|---|
| **FR-L-01** | **Link Types** | • `LINK`: Regular clickable destination URL (must validate valid `http://` or `https://`).<br>• `HEADER`: Non-clickable section separator text.<br>• `DIVIDER`: Visual horizontal line rule. |
| **FR-L-02** | **Atomic Reordering** | • Reordering dispatches an array of `{ id: UUID, position: number }`.<br>• Database updates positions in a single transaction.<br>• UI updates optimistically with fallback rollback on network failure. |
| **FR-L-03** | **Link Deletion** | • Deleting a link hard-deletes the link record (associated historical click events retain foreign key or cascade based on compliance policy). |

### 2.3 Authentication & Authorization (FR-A)

| Requirement ID | Description | Acceptance Criteria & Edge Cases |
|---|---|---|
| **FR-A-01** | **Password Security** | • Passwords hashed with `bcrypt` (salt rounds: 12).<br>• Minimum 8 characters, maximum 100 characters. |
| **FR-A-02** | **JWT Token Architecture**| • Access Token: Short-lived (15 minutes), signed with `HS256`, passed in `Authorization: Bearer <token>`.<br>• Refresh Token: Long-lived (7 days), stored in secure `HttpOnly`, `SameSite=Strict` cookie with automatic rotation on refresh. |
| **FR-A-03** | **Google OAuth 2.0** | • Implements OpenID Connect via Google API.<br>• Automatically provisions user account and links `googleId` on first login.<br>• Existing email accounts can link Google credentials seamlessly. |

### 2.4 High-Throughput Analytics (FR-T)

| Requirement ID | Description | Acceptance Criteria & Edge Cases |
|---|---|---|
| **FR-T-01** | **Click Beacon Ingestion** | • Client invokes `navigator.sendBeacon` or `fetch('/api/track/click', { keepalive: true })`.<br>• Endpoint responds with HTTP 204 in < 25ms without blocking navigation.<br>• Click event payload enqueued to BullMQ `analytics-clicks` queue. |
| **FR-T-02** | **Event Enrichment Worker**| • BullMQ worker resolves IP to ISO Country Code & City using MaxMind GeoLite2.<br>• Parses User-Agent into Device Type (`DESKTOP`, `MOBILE`, `TABLET`), OS, and Browser.<br>• Flags known web crawlers, scrapers, and preview bots (`is_bot: true`). |
| **FR-T-03** | **Privacy & Anonymization**| • Full IP addresses are **never** stored permanently in the database.<br>• IPs are truncated/hashed with a daily salt to compute `is_unique` visitor metrics in compliance with GDPR. |

---

## 3. Non-Functional Requirements (NFR)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NFR SLA SPECIFICATIONS                          │
├─────────┬──────────────────────┬──────────────────────┬────────────────┤
│ ID      │ Metric Category      │ Target Threshold     │ Verification   │
├─────────┼──────────────────────┼──────────────────────┼────────────────┤
│ NFR-001 │ Hot Path Latency     │ p50 < 30ms,          │ k6 load test   │
│         │ (`/@username`)       │ p99 < 150ms          │ (Edge cache hit│
├─────────┼──────────────────────┼──────────────────────┼────────────────┤
│ NFR-002 │ Click Ingestion Rate │ ≥ 10,000 req/sec     │ BullMQ + Redis │
│         │                      │ per API instance     │ benchmark      │
├─────────┼──────────────────────┼──────────────────────┼────────────────┤
│ NFR-003 │ System Availability  │ 99.9% Uptime         │ Health probes  │
│         │                      │ (≤ 8.76h downtime/yr)│ + Docker self-h│
├─────────┼──────────────────────┼──────────────────────┼────────────────┤
│ NFR-004 │ Test Code Coverage   │ ≥ 80% line coverage  │ Jest / Vitest  │
│         │                      │ ≥ 90% domain branch  │ coverage report│
├─────────┼──────────────────────┼──────────────────────┼────────────────┤
│ NFR-005 │ Web Accessibility    │ WCAG 2.1 AA Compliant│ Playwright     │
│         │                      │                      │ + axe-core     │
├─────────┼──────────────────────┼──────────────────────┼────────────────┤
│ NFR-006 │ Rate Limiting        │ 100 req/min per IP   │ Redis Token    │
│         │                      │ 10 req/min for auth  │ Bucket Guard   │
└─────────┴──────────────────────┴──────────────────────┴────────────────┘
```

---

## 4. Security & Compliance Requirements

1. **Content Security Policy (CSP)**: Strict headers prohibiting unauthorized inline scripts on public profile pages.
2. **SSRF Mitigation**: User-submitted URLs are validated to ensure they do not resolve to loopback (`127.0.0.1`), link-local (`169.254.0.0/16`), or private RFC-1918 networks (`10.0.0.0/8`, `192.168.0.0/16`).
3. **Database Parameterization**: All SQL queries utilize Prisma typed parameterized queries, eliminating SQL injection vulnerabilities.
