# ADR 004: PostgreSQL 16 + TimescaleDB for Relational Core and Time-Series Analytics

## Status
Approved

## Date
2026-10-13

## Context
A Link-in-Bio platform experiences two distinct data access patterns:
1. **Transactional (OLTP)**: Users, profiles, links, themes, and social links require strict relational integrity, foreign key cascades, unique constraints (e.g. vanity username lookup), and ACID transactions (e.g. atomic link reordering).
2. **High-Throughput Time-Series Analytics (OLAP / Event Ingestion)**: Every page view and link click generates an immutable telemetry event containing timestamp, IP, User-Agent, referrer, and geo-data. Profile owners expect real-time analytics graphs over hourly, daily, and monthly windows.

We evaluated three architectural approaches:
1. **Pure PostgreSQL**: Standard tables with indexes.
   - *Pros*: Single database, zero additional operational overhead.
   - *Cons*: As `click_events` and `page_views` reach millions of rows, table bloat, slow index updates, and sluggish aggregation queries (`COUNT(*) GROUP BY hour`) degrade OLTP performance.
2. **PostgreSQL + ClickHouse**: PostgreSQL for transactional data, ClickHouse for click events.
   - *Pros*: World-class columnar query speed for massive datasets.
   - *Cons*: High operational complexity for an MVP/early-stage product (dual database clusters, dual connection pools, complex distributed joins, higher hosting costs).
3. **PostgreSQL + TimescaleDB Extension**:
   - *Pros*: Single PostgreSQL database instance with native TimescaleDB extension. Leverages PostgreSQL's battle-tested relational capabilities while converting `click_events` and `page_views` into partitioned **Hypertables**.
   - Built-in **Continuous Aggregates** (materialized views automatically updated in real-time) provide sub-10ms hourly and daily rollups.
   - Built-in **Native Compression** achieves 90%+ storage reduction on chunks older than 7 days.
   - Transparent integration with Prisma ORM for relational models and standard raw SQL queries for hypertable analytics.

## Decision
We chose **PostgreSQL 16 with the TimescaleDB extension**:
- Standard relational models (`User`, `Profile`, `Link`, `Theme`, `SocialLink`) are managed via Prisma ORM.
- Telemetry tables (`click_events`, `page_views`) are converted to 1-day chunk Hypertables with automatic 7-day compression policies and continuous hourly aggregate views.
- Redis acts as an ephemeral write-behind buffer via BullMQ to batch-insert click events, preventing database lock contention under viral traffic spikes.

## Consequences
- **Positive**:
  - Unified operational footprint: Single database engine to back up, monitor, and scale.
  - Sub-15ms analytics query latency using Continuous Aggregates without maintaining separate ETL pipelines.
  - Standard SQL queries for analytics dashboards (`time_bucket('1 hour', clicked_at)`).
- **Negative**:
  - Requires database images with the TimescaleDB extension installed (`timescale/timescaledb:latest-pg16`).
  - Prisma migrations cannot natively generate TimescaleDB-specific commands (`create_hypertable`, continuous aggregates); these must be executed via initial migration SQL scripts.
