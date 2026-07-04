# GrowthOS — Data Models

This document defines the complete data model across all stores.

---

## Neon Postgres — Full Schema

### Users & Auth

```sql
-- Extended user profile (core identity owned by Better Auth's `user` table)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE NOT NULL,  -- Better Auth user id
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  timezone    TEXT DEFAULT 'UTC',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace (one per business or client)
CREATE TABLE workspaces (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  owner_id            UUID REFERENCES users(id),
  plan                TEXT NOT NULL DEFAULT 'starter',
  website_url         TEXT,
  business_category   TEXT,
  monthly_ad_budget   INTEGER,
  brand_voice         JSONB,        -- { tone, keywords, avoid }
  white_label_config  JSONB,        -- { logo_url, primary_color, domain }
  onboarding_step     TEXT DEFAULT 'business_intake',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace membership
CREATE TABLE workspace_members (
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'viewer',  -- owner | admin | manager | viewer | client
  invited_by    UUID REFERENCES users(id),
  invited_at    TIMESTAMPTZ DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, user_id)
);
```

### Platform Connections

```sql
CREATE TABLE platform_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
  -- google_ads | google_search_console | google_analytics | meta | shopify | woocommerce | hubspot | klaviyo
  account_id       TEXT NOT NULL,
  account_name     TEXT,
  access_token     TEXT NOT NULL,    -- AES-256 encrypted
  refresh_token    TEXT,             -- AES-256 encrypted
  token_expires_at TIMESTAMPTZ,
  scopes           TEXT[],
  metadata         JSONB,            -- platform-specific (e.g. GA4 property_id, Shopify store_url)
  is_active        BOOLEAN DEFAULT TRUE,
  last_synced_at   TIMESTAMPTZ,
  sync_error       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, platform, account_id)
);

-- Index for fast lookups by workspace
CREATE INDEX idx_connections_workspace ON platform_connections(workspace_id, platform);
```

### Intelligence & Recommendations

```sql
CREATE TABLE recommendations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  -- paid_to_organic | organic_to_paid | fatigue_alert | rank_drop_coverage
  -- | budget_reallocation | audience_opportunity | keyword_cannibalization
  -- | customer_match_refresh | emq_drop | weekly_report_action
  source_channel   TEXT NOT NULL,   -- seo | google_ads | meta_ads | unified
  target_channel   TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  action_label     TEXT,
  impact_score     SMALLINT CHECK (impact_score BETWEEN 1 AND 100),
  effort_score     SMALLINT CHECK (effort_score BETWEEN 1 AND 100),
  urgency_score    SMALLINT CHECK (urgency_score BETWEEN 1 AND 100),
  composite_score  SMALLINT GENERATED ALWAYS AS (
    ((impact_score * 0.5) + (urgency_score * 0.35) + ((100 - effort_score) * 0.15))::SMALLINT
  ) STORED,
  status           TEXT DEFAULT 'pending',  -- pending | acted | dismissed | snoozed
  snoozed_until    TIMESTAMPTZ,
  acted_at         TIMESTAMPTZ,
  outcome          TEXT,      -- positive | negative | neutral (filled after acting)
  outcome_data     JSONB,     -- metrics before/after
  raw_data         JSONB,     -- source data that triggered this recommendation
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ
);

CREATE INDEX idx_recommendations_workspace_status ON recommendations(workspace_id, status, composite_score DESC);

-- Content briefs (SEO briefs from paid/organic data)
CREATE TABLE content_briefs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id),
  keyword           TEXT NOT NULL,
  source            TEXT NOT NULL,  -- google_ads_search_term | organic_top_page | meta_hook | manual
  source_data       JSONB,
  brief             JSONB NOT NULL,
  -- {
  --   recommendedH1, wordCount, headingStructure [], entities [],
  --   faqQuestions [], metaTitle, metaDescription, internalLinkTargets [],
  --   schemaType, competitorUrls []
  -- }
  status            TEXT DEFAULT 'draft',  -- draft | approved | in_progress | published
  published_url     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly reports
CREATE TABLE intelligence_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  week_of       DATE NOT NULL,
  report        JSONB NOT NULL,
  -- { summary, whatWorked [], whatDidNot [], topOpportunities [], budgetRecommendations }
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, week_of)
);
```

### SEO Module

```sql
-- Tracked keywords (configuration)
CREATE TABLE tracked_keywords (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  keyword       TEXT NOT NULL,
  target_url    TEXT,
  location      TEXT DEFAULT 'US',
  language      TEXT DEFAULT 'en',
  device        TEXT[] DEFAULT ARRAY['desktop', 'mobile'],
  is_active     BOOLEAN DEFAULT TRUE,
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, keyword, location)
);

-- Site audit runs
CREATE TABLE site_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  website_url     TEXT NOT NULL,
  status          TEXT DEFAULT 'queued',  -- queued | running | complete | failed
  pages_crawled   INTEGER DEFAULT 0,
  issues_found    JSONB,
  -- { broken_links, redirect_chains, missing_meta, thin_content, orphaned_pages, ... }
  summary         JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword embeddings for clustering (pgvector)
CREATE TABLE keyword_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  keyword       TEXT NOT NULL,
  embedding     vector(1536),   -- from sentence-transformers
  cluster_id    INTEGER,
  intent        TEXT,           -- informational | navigational | commercial | transactional
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, keyword)
);

CREATE INDEX idx_keyword_embeddings_vector ON keyword_embeddings
  USING ivfflat (embedding vector_cosine_ops);
```

### Google Ads Module

```sql
-- Synced campaigns (mirror of Google Ads state)
CREATE TABLE google_ads_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id       UUID REFERENCES platform_connections(id),
  google_campaign_id  TEXT NOT NULL,
  name                TEXT NOT NULL,
  type                TEXT,     -- search | pmax | display | demand_gen | shopping
  status              TEXT,     -- enabled | paused | removed
  budget_daily        NUMERIC,
  bidding_strategy    TEXT,
  target_cpa          NUMERIC,
  target_roas         NUMERIC,
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, google_campaign_id)
);

-- Quality Score snapshots
CREATE TABLE quality_score_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  google_keyword_id   TEXT NOT NULL,
  keyword_text        TEXT NOT NULL,
  campaign_id         TEXT NOT NULL,
  quality_score       SMALLINT,
  ad_relevance        TEXT,   -- below_average | average | above_average
  expected_ctr        TEXT,
  landing_page_exp    TEXT,
  recorded_at         DATE NOT NULL
);
```

### Meta Ads Module

```sql
-- Synced Meta campaigns
CREATE TABLE meta_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id     UUID REFERENCES platform_connections(id),
  meta_campaign_id  TEXT NOT NULL,
  name              TEXT NOT NULL,
  objective         TEXT,
  status            TEXT,
  daily_budget      NUMERIC,
  lifetime_budget   NUMERIC,
  funnel_stage      TEXT,   -- tofu | mofu | bofu
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, meta_campaign_id)
);

-- Meta ad sets with fatigue tracking
CREATE TABLE meta_ad_sets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  meta_campaign_id    TEXT NOT NULL,
  meta_ad_set_id      TEXT NOT NULL,
  name                TEXT NOT NULL,
  status              TEXT,
  daily_budget        NUMERIC,
  optimization_event  TEXT,
  current_frequency   NUMERIC,
  ctr_7d              NUMERIC,
  ctr_prev_7d         NUMERIC,
  fatigue_alert_sent  BOOLEAN DEFAULT FALSE,
  learning_phase      TEXT,   -- learning | learning_limited | active
  last_synced_at      TIMESTAMPTZ,
  UNIQUE (workspace_id, meta_ad_set_id)
);

-- CAPI setup tracking
CREATE TABLE capi_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  pixel_id        TEXT NOT NULL,
  emq_score       NUMERIC,
  events_tracked  TEXT[],
  implementation  TEXT,   -- manual | shopify | wordpress
  last_checked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Billing

```sql
CREATE TABLE subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id   TEXT UNIQUE,
  stripe_sub_id        TEXT UNIQUE,
  plan                 TEXT NOT NULL,  -- starter | growth | scale
  status               TEXT NOT NULL,  -- active | trialing | past_due | canceled
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Usage metering (for plan limits)
CREATE TABLE usage_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  metric        TEXT NOT NULL,
  -- keywords_tracked | ai_creatives_generated | recommendations_generated
  -- | content_briefs_created | report_generated
  value         INTEGER NOT NULL,
  period        DATE NOT NULL,   -- first day of billing period
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, metric, period)
);
```

### System

```sql
-- Audit log
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  action        TEXT NOT NULL,   -- e.g. "recommendation.acted", "connection.added"
  entity_type   TEXT,
  entity_id     UUID,
  before        JSONB,
  after         JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);

-- Background jobs tracking
CREATE TABLE background_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id),
  type            TEXT NOT NULL,
  status          TEXT DEFAULT 'queued',  -- queued | processing | complete | failed
  progress        SMALLINT DEFAULT 0,
  result          JSONB,
  error           TEXT,
  queued_at       TIMESTAMPTZ DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  celery_task_id  TEXT
);
```

---

## ClickHouse — Analytics Schema

See `ARCHITECTURE.md` for the full ClickHouse table definitions with ENGINE, PARTITION, and ORDER BY clauses.

**Tables:**
- `ad_performance` — hourly/daily ad metrics (impressions, clicks, spend, conversions, ROAS, frequency)
- `keyword_rankings` — daily keyword position tracking with SERP feature data
- `organic_traffic` — Google Search Console data (clicks, impressions, CTR, avg position per page/query)
- `creative_performance` — Meta ad creative metrics + computed fatigue score
- `ai_citations` — GEO tracking data (brand mentions in AI systems)

---

## Shared TypeScript Types (`packages/types`)

```typescript
// packages/types/api.ts

export type Platform =
  | 'google_ads'
  | 'google_search_console'
  | 'google_analytics'
  | 'meta'
  | 'shopify'
  | 'woocommerce'
  | 'hubspot'
  | 'klaviyo'

export type Plan = 'starter' | 'growth' | 'scale'

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'viewer' | 'client'

export type RecommendationType =
  | 'paid_to_organic'
  | 'organic_to_paid'
  | 'fatigue_alert'
  | 'rank_drop_coverage'
  | 'budget_reallocation'
  | 'audience_opportunity'
  | 'keyword_cannibalization'
  | 'customer_match_refresh'

export type RecommendationStatus = 'pending' | 'acted' | 'dismissed' | 'snoozed'

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: Plan
  websiteUrl: string | null
  onboardingComplete: boolean
}

export interface Recommendation {
  id: string
  workspaceId: string
  type: RecommendationType
  sourceChannel: 'seo' | 'google_ads' | 'meta_ads' | 'unified'
  targetChannel: 'seo' | 'google_ads' | 'meta_ads' | 'unified'
  title: string
  body: string
  actionLabel: string | null
  impactScore: number
  effortScore: number
  urgencyScore: number
  compositeScore: number
  status: RecommendationStatus
  rawData: Record<string, unknown>
  createdAt: string
  expiresAt: string | null
}

export interface ContentBrief {
  id: string
  workspaceId: string
  keyword: string
  source: 'google_ads_search_term' | 'organic_top_page' | 'meta_hook' | 'manual'
  brief: {
    recommendedH1: string
    wordCount: number
    headingStructure: string[]
    entities: string[]
    faqQuestions: string[]
    metaTitle: string
    metaDescription: string
    internalLinkTargets: string[]
  }
  status: 'draft' | 'approved' | 'in_progress' | 'published'
}

export interface MerData {
  current: {
    mer: number
    totalRevenue: number
    totalAdSpend: number
    googleAdsSpend: number
    metaAdsSpend: number
  }
  previousPeriod: {
    mer: number
  }
  merChange: number
  trend: Array<{ date: string; mer: number; revenue: number; spend: number }>
}

export interface CreativeFatigueAlert {
  adSetId: string
  adSetName: string
  frequency: number
  ctrDeclinePercent: number
  estimatedDaysToRoasImpact: number
}

// WebSocket event types
export type WebSocketEvent =
  | { event: 'recommendation:new'; data: { recommendation: Recommendation } }
  | { event: 'meta:fatigue_alert'; data: CreativeFatigueAlert }
  | { event: 'seo:rank_change'; data: { keyword: string; from: number; to: number } }
  | { event: 'job:complete'; data: { jobId: string; type: string } }
  | { event: 'analytics:mer_alert'; data: { current: number; previous: number; dropPercent: number } }
  | { event: 'intelligence:report_ready'; data: { weekOf: string } }
```

---

## Plan Limits Reference

```typescript
// packages/types/plans.ts

export const PLAN_LIMITS = {
  starter: {
    workspaces: 1,
    trackedKeywords: 500,
    adSpendLimit: 10_000,
    recommendationsPerWeek: 5,
    aiCreativesPerMonth: 10,
    teamMembers: 1,
    geoTracking: false,
    whiteLabel: false,
    crossChannelAttribution: 'mer_only',
    apiAccess: false,
  },
  growth: {
    workspaces: 5,
    trackedKeywords: 2_500,
    adSpendLimit: 50_000,
    recommendationsPerWeek: Infinity,
    aiCreativesPerMonth: 100,
    teamMembers: 5,
    geoTracking: true,
    whiteLabel: true,
    crossChannelAttribution: 'full',
    apiAccess: false,
  },
  scale: {
    workspaces: Infinity,
    trackedKeywords: 10_000,
    adSpendLimit: Infinity,
    recommendationsPerWeek: Infinity,
    aiCreativesPerMonth: Infinity,
    teamMembers: Infinity,
    geoTracking: true,
    whiteLabel: true,
    crossChannelAttribution: 'full_custom',
    apiAccess: true,
  },
} as const
```
