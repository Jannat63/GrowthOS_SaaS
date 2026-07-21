# GrowthOS — Architecture

**Version:** 1.0  
**Audience:** Engineering team

---

## Overview

GrowthOS uses a **Turborepo monorepo** with a hybrid language architecture:

- **Fastify (Node.js + TypeScript)** — HTTP API layer, WebSockets, auth, routing
- **Python FastAPI + Celery** — Background workers, AI/ML, SEO crawler, data pipelines
- **Next.js 15** — Frontend (React Server Components + App Router)

This separation is intentional: Fastify handles all real-time request/response work where TypeScript type-sharing with the frontend is a major DX win. Python handles all AI orchestration, embedding similarity, and data processing where the ecosystem (Celery, Scrapy, ML libraries) is far superior.

---

## Monorepo Structure

```
growthOS/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── app/                # App Router pages
│   │   ├── components/         # Page-level components
│   │   └── lib/                # Client utilities, API client
│   │
│   ├── api/                    # Fastify API server (Node.js + TypeScript)
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers per domain
│   │   │   │   ├── auth/
│   │   │   │   ├── workspaces/
│   │   │   │   ├── seo/
│   │   │   │   ├── google-ads/
│   │   │   │   ├── meta-ads/
│   │   │   │   ├── intelligence/
│   │   │   │   └── analytics/
│   │   │   ├── plugins/        # Fastify plugins (auth, db, redis, ws)
│   │   │   ├── services/       # Business logic
│   │   │   ├── jobs/           # Job queue producers (BullMQ)
│   │   │   └── lib/            # Shared utilities
│   │   └── package.json
│   │
│   └── worker/                 # Python FastAPI + Celery workers
│       ├── app/
│       │   ├── workers/        # Celery task definitions
│       │   │   ├── seo/        # Rank tracking, crawling, keyword data
│       │   │   ├── google_ads/ # Search terms pull, campaign sync
│       │   │   ├── meta_ads/   # Ad set metrics, CAPI relay
│       │   │   └── intelligence/ # Rule engine, Claude API, reports
│       │   ├── services/       # Business logic per domain
│       │   ├── integrations/   # Third-party API clients
│       │   │   ├── dataforseo.py
│       │   │   ├── google_ads.py
│       │   │   ├── meta_ads.py
│       │   │   ├── claude.py
│       │   │   └── shopify.py
│       │   └── models/         # Pydantic models
│       ├── celery_app.py       # Celery configuration
│       └── requirements.txt
│
├── packages/
│   ├── ui/                     # Shared React component library
│   │   ├── components/         # shadcn/ui components + custom
│   │   ├── hooks/              # Shared React hooks
│   │   └── package.json
│   │
│   ├── types/                  # Shared TypeScript types (web + api)
│   │   ├── api.ts              # API request/response types
│   │   ├── database.ts         # Database entity types
│   │   └── package.json
│   │
│   ├── db/                     # Database client + schema (Drizzle ORM)
│   │   ├── schema/             # Drizzle table definitions
│   │   ├── migrations/         # SQL migration files
│   │   └── package.json
│   │
│   └── config/                 # Shared config (ESLint, TypeScript, Tailwind)
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── turbo.json                  # Turborepo pipeline config
├── package.json                # Root workspace
└── pnpm-workspace.yaml         # pnpm workspace config
```

---

## Technology Stack

### Frontend — `apps/web`

| Concern | Technology | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | React Server Components for performance; file-based routing |
| Language | TypeScript 5.x | Shared types with API via `packages/types` |
| Styling | Tailwind CSS v4 | Utility-first, consistent with shadcn/ui |
| Components | shadcn/ui | Radix UI primitives, pre-styled, accessible |
| State (client) | Zustand | Minimal, no boilerplate |
| State (server) | TanStack Query v5 | Caching, background refetch, optimistic updates |
| Charts | Recharts + D3.js | Recharts for standard charts; D3 for attribution flow viz |
| Real-time | Socket.io client | WebSocket for alerts and live dashboard updates |
| Forms | React Hook Form + Zod | Type-safe form validation |
| Auth | Better Auth (client) | Typed React client; sessions + OAuth via the api |

### API Server — `apps/api`

| Concern | Technology | Reason |
|---|---|---|
| Framework | Fastify v5 | Fastest Node.js framework, excellent TypeScript support, schema validation built-in |
| Language | TypeScript 5.x | End-to-end type safety with frontend |
| ORM | Drizzle ORM | Type-safe SQL, works perfectly with Neon Postgres, lightweight |
| Auth | Better Auth (server) | Email/password + OAuth + MFA; owns auth tables in Neon via Drizzle |
| WebSockets | @fastify/websocket | Real-time alerts, dashboard refresh |
| Validation | Zod + fastify-type-provider-zod | Request/response schema validation |
| Job queue | BullMQ | Redis-backed job queue, triggers Python workers via Upstash Redis |
| Caching | ioredis → Upstash Redis | API response caching, rate limiting counters |
| File storage | @aws-sdk/client-s3 (R2 compat.) | Cloudflare R2 via S3-compatible API |
| Email | Resend SDK | Transactional emails |
| Payments | stripe | Subscription management |
| Logging | pino | Fastify's built-in logger |
| Testing | Vitest + supertest | Unit + integration tests |

### Background Workers — `apps/worker`

| Concern | Technology | Reason |
|---|---|---|
| Framework | FastAPI (Python 3.12) | Lightweight HTTP for health checks + admin endpoints |
| Task queue | Celery + Upstash Redis | Scheduled and async background processing |
| AI/LLM | anthropic Python SDK | Claude API for content generation, analysis, reports |
| Embeddings | sentence-transformers | Keyword clustering via semantic similarity |
| Vector storage | pgvector (Neon extension) | Stores embeddings for keyword clustering |
| SEO crawler | Playwright + BeautifulSoup | Headless browser for rank tracking + site audits |
| Data processing | pandas + polars | ETL pipelines for ad performance data |
| Google Ads | google-ads (Python client) | Official Python library, best API coverage |
| Meta Ads | facebook-business-sdk | Official Python SDK |
| Type validation | Pydantic v2 | Request/response validation |
| Testing | pytest + pytest-asyncio | Unit + integration tests |

### Data Layer

| Store | Technology | Purpose |
|---|---|---|
| Primary DB | Neon Postgres | Users, workspaces, config, recommendations, audit logs |
| Analytics DB | ClickHouse Cloud | Time-series ad performance, rankings, organic traffic |
| Cache | Upstash Redis | API caching (15min TTL), rate limiting, session store |
| Job broker | Upstash Redis (BullMQ) | Job queue for async tasks between Fastify → Python |
| Event stream | Upstash Kafka | Cross-service events; data pipeline triggers |
| Object storage | Cloudflare R2 | PDFs, creative assets, crawl data, report exports |
| Search | Postgres full-text search | MVP; migrate to Algolia at scale |
| Vectors | pgvector (Neon) | Keyword embeddings for clustering |

### Infrastructure

| Concern | Technology |
|---|---|
| Hosting | Railway (MVP) → migrate to Fly.io or AWS ECS at $50K MRR |
| Containers | Docker (each app has a Dockerfile) |
| CI/CD | GitHub Actions → Railway deploy |
| Monitoring | Sentry (errors) + Grafana Cloud free (metrics) |
| Logging | Better Stack (Logtail) — affordable, good DX |
| Secrets | Railway environment variables (MVP); Doppler at scale |
| DNS / CDN | Cloudflare (DNS + CDN for R2 assets) |

---

## Communication Patterns

### Fastify API ↔ Python Workers

The Fastify API does not call Python workers directly. It enqueues jobs via **BullMQ** (backed by Upstash Redis). Python Celery workers consume from the same Redis instance.

```
User request → Fastify route handler
                    ↓
              Enqueue BullMQ job (key: "worker:seo:content-brief")
                    ↓
              Immediate 202 Accepted response to client
                    ↓
Python Celery worker picks up job
                    ↓
Worker completes task → writes result to Neon Postgres
                    ↓
Fastify WebSocket server pushes result to connected client
```

### Real-time Push (WebSocket)

All real-time updates (recommendation alerts, fatigue alerts, job completion) flow through the Fastify WebSocket server. Clients maintain a persistent WebSocket connection after login.

```
Python worker completes → publishes event to Upstash Redis pub/sub
                               ↓
Fastify subscribes to Redis pub/sub → pushes to client WebSocket
```

### Scheduled Jobs (Celery Beat)

```
Every 4 hours:
  - Pull Google Ads Search Terms Report → score → create content opportunities
  - Pull Meta ad set metrics → check creative fatigue → alert if triggered
  - Pull Google Search Console top pages → generate Meta creative briefs
  - Pull all channel performance data → run Intelligence Engine rules

Daily at 06:00 UTC:
  - Run rank tracking for all tracked keywords (all workspaces)
  - Pull Google Search Console impressions/clicks/CTR

Sunday 20:00 UTC:
  - Generate Weekly Growth Intelligence Report for all active workspaces
```

---

## Database Schema (Neon Postgres)

### Core tables

```sql
-- Users (core identity owned by Better Auth's `user` table; app profile fields extended here)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE NOT NULL,  -- Better Auth user id
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces (one per client/business)
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  owner_id    UUID REFERENCES users(id),
  plan        TEXT NOT NULL DEFAULT 'starter',  -- starter | growth | scale
  website_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace membership + roles
CREATE TABLE workspace_members (
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'viewer',  -- owner | admin | manager | viewer | client
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Platform connections (OAuth tokens)
CREATE TABLE platform_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,  -- google_ads | google_search_console | meta | shopify | ga4
  account_id      TEXT NOT NULL,  -- platform-specific account/property ID
  account_name    TEXT,
  access_token    TEXT NOT NULL,  -- encrypted
  refresh_token   TEXT,           -- encrypted
  token_expires_at TIMESTAMPTZ,
  scopes          TEXT[],
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, platform, account_id)
);

-- Recommendations (cross-channel insights)
CREATE TABLE recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,       -- paid_to_organic | organic_to_paid | fatigue_alert | budget_shift | ...
  source_channel  TEXT NOT NULL,       -- seo | google_ads | meta_ads
  target_channel  TEXT NOT NULL,       -- seo | google_ads | meta_ads
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  action_label    TEXT,
  action_url      TEXT,
  impact_score    INTEGER DEFAULT 0,   -- 1–100
  effort_score    INTEGER DEFAULT 0,   -- 1–100 (lower = less effort)
  urgency_score   INTEGER DEFAULT 0,   -- 1–100
  composite_score INTEGER GENERATED ALWAYS AS (
    (impact_score * 0.5 + urgency_score * 0.35 + (100 - effort_score) * 0.15)::INTEGER
  ) STORED,
  status          TEXT DEFAULT 'pending',  -- pending | acted | dismissed | snoozed
  snoozed_until   TIMESTAMPTZ,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

-- Content pipeline (SEO content briefs from paid/organic data)
CREATE TABLE content_briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id),
  keyword         TEXT NOT NULL,
  source          TEXT NOT NULL,  -- google_ads_search_term | organic_top_page | meta_hook
  source_data     JSONB,          -- raw data that triggered brief creation
  brief           JSONB,          -- Claude-generated brief (headings, word count, entities, FAQs)
  status          TEXT DEFAULT 'draft',  -- draft | approved | in_progress | published
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (mirrors Stripe)
CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_sub_id     TEXT UNIQUE,
  plan              TEXT NOT NULL,
  status            TEXT NOT NULL,  -- active | trialing | past_due | canceled
  trial_ends_at     TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-level security

All workspace-scoped tables have RLS enabled. Every query is automatically filtered by the authenticated user's workspace membership.

```sql
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_only" ON recommendations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
```

---

## ClickHouse Schema (Analytics)

```sql
-- Ad performance (Google Ads + Meta Ads)
CREATE TABLE ad_performance (
  workspace_id    String,
  platform        LowCardinality(String),  -- google_ads | meta_ads
  campaign_id     String,
  campaign_name   String,
  ad_set_id       String,
  ad_set_name     String,
  date            Date,
  impressions     UInt64,
  clicks          UInt64,
  spend           Float64,
  conversions     UInt64,
  conversion_value Float64,
  ctr             Float64 ALIAS clicks / impressions,
  cpc             Float64 ALIAS spend / clicks,
  roas            Float64 ALIAS conversion_value / spend,
  frequency       Float32,  -- Meta only
  reach           UInt64    -- Meta only
) ENGINE = MergeTree()
PARTITION BY (platform, toYYYYMM(date))
ORDER BY (workspace_id, platform, campaign_id, date);

-- Keyword rankings (daily)
CREATE TABLE keyword_rankings (
  workspace_id  String,
  keyword       String,
  date          Date,
  position      UInt16,
  device        LowCardinality(String),  -- desktop | mobile
  location      String,
  url           String,
  has_ai_overview UInt8,
  is_cited_in_ai  UInt8,
  serp_features   Array(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, keyword, date, device);

-- Organic traffic (from Google Search Console)
CREATE TABLE organic_traffic (
  workspace_id  String,
  date          Date,
  page_url      String,
  query         String,
  clicks        UInt64,
  impressions   UInt64,
  ctr           Float64,
  avg_position  Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, page_url, date);

-- Creative performance (Meta Ads)
CREATE TABLE creative_performance (
  workspace_id    String,
  creative_id     String,
  creative_name   String,
  ad_set_id       String,
  date            Date,
  impressions     UInt64,
  clicks          UInt64,
  spend           Float64,
  ctr             Float64,
  cpm             Float64,
  frequency       Float32,
  fatigue_score   Float32   -- computed: frequency * (1 - ctr_normalized)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, ad_set_id, creative_id, date);
```

---

## API Structure (Fastify)

All routes are versioned under `/api/v1/`. Authentication via Better Auth session (cookie or Bearer token) on every route.

```
POST   /api/v1/auth/callback              # OAuth callback handler
POST   /api/v1/workspaces                 # Create workspace
GET    /api/v1/workspaces/:id             # Get workspace
GET    /api/v1/workspaces/:id/connections # List platform connections
POST   /api/v1/workspaces/:id/connections # Add platform connection

GET    /api/v1/workspaces/:id/recommendations          # List recommendations (sorted by composite_score)
PATCH  /api/v1/workspaces/:id/recommendations/:recId  # Act / dismiss / snooze

GET    /api/v1/workspaces/:id/content-pipeline         # List content briefs
POST   /api/v1/workspaces/:id/content-pipeline         # Create content brief manually
PATCH  /api/v1/workspaces/:id/content-pipeline/:briefId # Update brief status

GET    /api/v1/workspaces/:id/analytics/mer            # Blended MER data
GET    /api/v1/workspaces/:id/analytics/performance    # Channel performance comparison
POST   /api/v1/workspaces/:id/analytics/revenue        # Manual revenue entry

GET    /api/v1/workspaces/:id/seo/keywords             # Keyword research results
GET    /api/v1/workspaces/:id/seo/rankings             # Rank tracking history
POST   /api/v1/workspaces/:id/seo/audits               # Trigger site audit
GET    /api/v1/workspaces/:id/seo/audits/:auditId      # Get audit results

GET    /api/v1/workspaces/:id/google-ads/campaigns     # List campaigns
POST   /api/v1/workspaces/:id/google-ads/campaigns     # Create campaign (pushes to Google Ads)
GET    /api/v1/workspaces/:id/google-ads/search-terms  # Search terms intelligence

GET    /api/v1/workspaces/:id/meta-ads/campaigns       # List campaigns
POST   /api/v1/workspaces/:id/meta-ads/campaigns       # Create campaign (pushes to Meta)
GET    /api/v1/workspaces/:id/meta-ads/creatives        # List creatives + fatigue status
GET    /api/v1/workspaces/:id/meta-ads/audiences       # List audiences

GET    /api/v1/workspaces/:id/intelligence/report      # Weekly Growth Intelligence Report
POST   /api/v1/workspaces/:id/reports                  # Generate PDF report

WS     /api/v1/workspaces/:id/ws                       # WebSocket connection for real-time
```

---

## Environment Variables

Each app has its own `.env.example`. Never commit `.env` files.

### `apps/api/.env.example`

```bash
# Neon Postgres
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Upstash Kafka
UPSTASH_KAFKA_REST_URL=
UPSTASH_KAFKA_REST_USERNAME=
UPSTASH_KAFKA_REST_PASSWORD=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3001
# Social sign-in (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Internal
API_PORT=3001
NODE_ENV=development
```

### `apps/worker/.env.example`

```bash
# Neon Postgres
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# ClickHouse
CLICKHOUSE_HOST=
CLICKHOUSE_DATABASE=
CLICKHOUSE_USERNAME=
CLICKHOUSE_PASSWORD=

# Upstash Redis (Celery broker)
CELERY_BROKER_URL=rediss://:token@host:6380/0

# Anthropic
ANTHROPIC_API_KEY=

# DataForSEO
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# Google OAuth (for Ads API)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Meta (for Marketing API)
META_APP_ID=
META_APP_SECRET=
```

---

## Deployment

### Local development

```bash
# Install dependencies
pnpm install

# Start all apps in dev mode
pnpm dev

# Start only web + api
pnpm dev --filter web --filter api

# Run Python worker locally
cd apps/worker && celery -A celery_app worker --loglevel=info
```

### Railway deployment

Each app deploys as a separate Railway service from the same GitHub repo. Turborepo build caching makes CI fast — only changed apps rebuild.

```
Railway services:
├── growthOS-web     → apps/web (Next.js)
├── growthOS-api     → apps/api (Fastify)
└── growthOS-worker  → apps/worker (Python Celery)
```

Each service has its own environment variables set in Railway dashboard.

---

## Key Architectural Decisions

### Why Fastify over Express?

Fastify is 2–3× faster than Express on throughput benchmarks and has first-class TypeScript support with schema-based validation built in. JSON Schema validation on every route catches bad requests before they hit business logic. The plugin system is cleaner than Express middleware.

### Why Neon over AWS RDS?

Neon's branching feature means developers get a copy of the production database schema for free — no RDS snapshot needed for staging. Neon autoscales compute (including scaling to zero for non-prod), which eliminates the fixed cost of always-on RDS instances. The Postgres-compatible API means zero migration risk.

### Why separate Fastify + Python instead of one language?

The Intelligence Engine requires: Celery (Python-native scheduled tasks), sentence-transformers (embedding similarity for keyword clustering), the official Google Ads Python client, and Scrapy/Playwright for crawling. Running all this in Node.js is possible but painful. The Fastify/Python split keeps TypeScript where it excels (HTTP API, type sharing with frontend) and Python where it excels (AI/ML, data processing, scraping). Communication via Redis is clean and decoupled.

### Why Drizzle ORM over Prisma?

Drizzle is significantly lighter, generates raw SQL (easy to audit), and has excellent Neon compatibility. It doesn't generate a 30MB engine binary. Type safety is equivalent to Prisma for the use cases in this project.

### Why Upstash over Redis Cloud or ElastiCache?

Upstash charges per request, not per instance. At MVP scale (< 100 users), this means near-zero Redis cost. As scale increases, the per-request model remains competitive. Zero ops overhead — no instance to manage. HTTP-based client works everywhere including edge.
