# 🗄️ Database Design & Data Architecture

> **Database Engines**: PostgreSQL 16 + TimescaleDB 2.17+ Extension + Redis 7 Stack  
> **ORM & Query Engine**: Prisma 6  
> **Status**: Approved & Implemented in `@repo/prisma`  

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o| profiles : "has one"
    profiles ||--o{ links : "has many"
    profiles ||--o{ social_links : "has many"
    profiles }o--o| themes : "uses preset"
    profiles ||--o| custom_themes : "has custom"
    profiles ||--o{ page_views : "receives"
    links ||--o{ click_events : "generates"

    users {
        uuid id PK "Default gen_random_uuid()"
        varchar email UK "Unique indexed email"
        varchar password_hash "Nullable for OAuth users"
        varchar name "User display name"
        varchar google_id UK "Unique Google OpenID"
        timestamptz created_at "Default now()"
        timestamptz updated_at
        timestamptz deleted_at "Soft delete timestamp"
    }

    profiles {
        uuid id PK
        uuid user_id FK,UK "One-to-one with user"
        varchar username UK "Indexed vanity slug (3-30 chars)"
        varchar title "Profile display title"
        varchar bio "Bio description (max 500 chars)"
        text avatar_url "CDN URL of processed avatar"
        uuid theme_id FK "References themes table"
        boolean is_published "Default false"
        varchar seo_title "Meta title (max 60 chars)"
        varchar seo_description "Meta desc (max 160 chars)"
        text og_image_url "Dynamic OG image URL"
        timestamptz created_at
        timestamptz updated_at
    }

    links {
        uuid id PK
        uuid profile_id FK "References profile"
        varchar title "Link label (max 200 chars)"
        text url "Target destination URL"
        enum type "LINK, HEADER, DIVIDER"
        integer position "Order priority index"
        text thumbnail_url "Optional icon/thumbnail"
        boolean is_active "Toggle visibility"
        bigint click_count "Cached aggregate counter"
        timestamptz created_at
        timestamptz updated_at
    }

    themes {
        uuid id PK
        varchar name "Theme label"
        enum bg_type "SOLID, GRADIENT, IMAGE"
        text bg_value "CSS color, gradient, or URL"
        enum btn_style "FILLED, OUTLINE, SHADOW, ROUNDED"
        varchar btn_color "Hex or rgba string"
        varchar btn_text_color "Hex or rgba string"
        varchar font_family "Google Font family"
        varchar text_color "Hex color code"
        boolean is_default "Default theme flag"
        text preview_url "Thumbnail of theme"
        timestamptz created_at
    }

    custom_themes {
        uuid id PK
        uuid profile_id FK,UK "One-to-one per profile"
        enum bg_type "SOLID, GRADIENT, IMAGE"
        text bg_value
        enum btn_style "FILLED, OUTLINE, SHADOW, ROUNDED"
        varchar btn_color
        varchar btn_text_color
        varchar font_family
        varchar text_color
        integer btn_radius "Border radius in px"
        timestamptz created_at
        timestamptz updated_at
    }

    social_links {
        uuid id PK
        uuid profile_id FK
        enum platform "INSTAGRAM, TIKTOK, YOUTUBE, etc."
        text url "Direct social profile URL"
        integer position "Display order"
        boolean is_active "Toggle visibility"
        timestamptz created_at
    }

    page_views {
        bigint id PK
        uuid profile_id FK
        timestamptz viewed_at "Partition key (Hypertable)"
        inet ip_address "Truncated anonymized IP"
        text user_agent
        text referrer
        char country "2-letter ISO code"
        boolean is_unique "Daily unique visitor flag"
        boolean is_bot "Crawler/bot flag"
    }

    click_events {
        bigint id PK
        uuid link_id FK
        uuid profile_id FK
        timestamptz clicked_at "Partition key (Hypertable)"
        inet ip_address "Truncated anonymized IP"
        text user_agent
        text referrer
        char country "2-letter ISO code"
        boolean is_bot "Crawler/bot flag"
    }
```

---

## 2. Data Dictionary & Table Specifications

### 2.1 `users` Table
Stores authentication credentials and account lifecycle states.
- **`id`** (`UUID`, PK): Immutable unique identifier generated via `gen_random_uuid()`.
- **`email`** (`VARCHAR(255)`, UNIQUE, NOT NULL): User email address normalized to lowercase.
- **`password_hash`** (`VARCHAR(255)`, NULLABLE): Bcrypt hashed password (null for Google-only OAuth signups).
- **`google_id`** (`VARCHAR(255)`, UNIQUE, NULLABLE): Subject identifier from Google OAuth 2.0 token.

### 2.2 `profiles` Table
Core vanity landing page entity.
- **`username`** (`VARCHAR(30)`, UNIQUE, NOT NULL): Indexed URL slug. Sanitized against `RESERVED_USERNAMES`.
- **`is_published`** (`BOOLEAN`, DEFAULT `false`): Controls public accessibility (`/@username`).
- **`theme_id`** (`UUID`, FK, NULLABLE): Foreign key pointing to curated `themes` table.
- **`seo_title` & `seo_description`**: Custom Open Graph metadata for rich social sharing cards.

### 2.3 `links` Table
Individual items displayed on the creator profile.
- **`profile_id`** (`UUID`, FK, NOT NULL): Cascades on profile deletion.
- **`type`** (`ENUM`): Discriminates between clickable `LINK`, text `HEADER`, and visual `DIVIDER`.
- **`position`** (`INTEGER`, NOT NULL, DEFAULT 0): Zero-indexed order on screen. Managed atomically via drag-and-drop.
- **`click_count`** (`BIGINT`, DEFAULT 0): Denormalized counter incremented atomically by BullMQ workers to avoid expensive `COUNT(*)` queries on dashboard views.

---

## 3. High-Throughput Analytics & TimescaleDB Hypertables

For tracking millions of events without degrading transactional database performance, `click_events` and `page_views` are partitioned time-series **Hypertables**:

```sql
-- Convert standard tables to 1-day chunk hypertables
SELECT create_hypertable('click_events', 'clicked_at', chunk_time_interval => INTERVAL '1 day');
SELECT create_hypertable('page_views', 'viewed_at', chunk_time_interval => INTERVAL '1 day');

-- Automatic compression policy: compress chunks older than 7 days
ALTER TABLE click_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'profile_id, link_id',
  timescaledb.compress_orderby = 'clicked_at DESC'
);
SELECT add_compression_policy('click_events', INTERVAL '7 days');
```

### Continuous Aggregates (Real-time Materialized Views)

```sql
-- Hourly rollups for high-speed dashboard analytics
CREATE MATERIALIZED VIEW hourly_link_clicks
WITH (timescaledb.continuous) AS
SELECT
    link_id,
    profile_id,
    time_bucket('1 hour', clicked_at) AS hour,
    COUNT(*) as total_clicks,
    COUNT(DISTINCT ip_address) as unique_clicks
FROM click_events
WHERE is_bot = false
GROUP BY link_id, profile_id, time_bucket('1 hour', clicked_at);
```

---

## 4. Strategic Indexing Plan

| Table | Index Definition | Access Pattern Justification |
|---|---|---|
| `profiles` | `CREATE UNIQUE INDEX idx_profiles_username ON profiles(LOWER(username))` | **Hot path**: Case-insensitive vanity URL lookup on every public profile view |
| `links` | `CREATE INDEX idx_links_profile_position ON links(profile_id, position) WHERE is_active = true` | Fetches active links for a profile pre-sorted by position |
| `social_links` | `CREATE INDEX idx_social_links_profile ON social_links(profile_id, position) WHERE is_active = true` | Quick retrieval of social icons for profile headers |
| `click_events` | `CREATE INDEX idx_clicks_link_time ON click_events(link_id, clicked_at DESC)` | Powers link performance graphs over customizable date ranges |
