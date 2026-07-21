-- GrowthOS ClickHouse Schema — Section 6.4
-- Time-series analytics data. Columnar storage for billion-row aggregation queries.

CREATE TABLE keyword_rankings (
  workspace_id UUID,
  keyword_id UUID,
  keyword String,
  date Date,
  position UInt16,
  device Enum8('desktop' = 1, 'mobile' = 2),
  location String,
  has_ai_overview UInt8 DEFAULT 0,
  cited_in_ai_overview UInt8 DEFAULT 0
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, keyword_id, date);

CREATE TABLE ad_performance (
  workspace_id UUID,
  platform Enum8('google_ads' = 1, 'meta_ads' = 2),
  campaign_id String,
  campaign_name String,
  date Date,
  impressions UInt64,
  clicks UInt64,
  spend Decimal(12,2),
  conversions UInt32,
  conversion_value Decimal(12,2)
) ENGINE = MergeTree()
PARTITION BY (platform, toYYYYMM(date))
ORDER BY (workspace_id, platform, campaign_id, date);

CREATE TABLE organic_traffic (
  workspace_id UUID,
  date Date,
  page_url String,
  sessions UInt64,
  clicks UInt64,
  impressions UInt64,
  avg_position Float32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, page_url, date);

CREATE TABLE creative_performance (
  workspace_id UUID,
  creative_id UUID,
  creative_name String,
  platform Enum8('meta_ads' = 1, 'google_ads' = 2),
  date Date,
  ctr Float32,
  cpm Decimal(10,2),
  frequency Float32,
  fatigue_score Float32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, creative_id, date);

CREATE TABLE ai_citations (
  workspace_id UUID,
  ai_platform Enum8('chatgpt' = 1, 'perplexity' = 2, 'google_ai' = 3, 'gemini' = 4),
  date Date,
  keyword String,
  mentioned UInt8,
  citation_context String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (workspace_id, ai_platform, date);
