# GrowthOS — API Specification

**Base URL:** `https://api.growthOS.com/api/v1`  
**Auth:** All endpoints require `Authorization: Bearer <better_auth_session_token>` header (or session cookie)  
**Content-Type:** `application/json`

---

## Authentication

### GET /auth/me
Returns the authenticated user's profile and workspace memberships.

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Alex Chen",
    "avatarUrl": null
  },
  "workspaces": [
    {
      "id": "uuid",
      "name": "Client A",
      "slug": "client-a",
      "role": "owner",
      "plan": "growth"
    }
  ]
}
```

---

## Workspaces

### POST /workspaces
Create a new workspace (triggers onboarding flow).

**Request:**
```json
{
  "name": "My Business",
  "websiteUrl": "https://example.com",
  "businessCategory": "e-commerce",
  "monthlyAdBudget": 2000
}
```

**Response 201:**
```json
{
  "workspace": {
    "id": "uuid",
    "name": "My Business",
    "slug": "my-business",
    "plan": "starter",
    "onboardingStep": "ai_analysis"
  }
}
```

### GET /workspaces/:id/onboarding
Poll for onboarding analysis results.

**Response 200:**
```json
{
  "step": "strategy_generated",  
  "channelRecommendation": {
    "meta": 60,
    "seo": 40,
    "googleAds": 0,
    "reasoning": "With a $2,000/month budget and a new website, start with Meta Ads for awareness and SEO for long-term. Add Google Ads in Month 3."
  },
  "strategy": {
    "seoKeywords": ["best moisturizer for dry skin", "natural skincare routine"],
    "metaCampaignStructure": {
      "tofu": { "budget": 1000, "objective": "awareness", "audiences": ["cold interest-based"] },
      "mofu": { "budget": 600, "objective": "traffic", "audiences": ["website visitors 30d"] },
      "bofu": { "budget": 400, "objective": "conversions", "audiences": ["add-to-cart abandoners"] }
    }
  }
}
```

---

## Platform Connections

### GET /workspaces/:id/connections
List all connected platforms.

**Response 200:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "platform": "google_ads",
      "accountId": "123-456-7890",
      "accountName": "My Business - Google Ads",
      "isActive": true,
      "connectedAt": "2026-07-01T10:00:00Z"
    },
    {
      "id": "uuid",
      "platform": "meta",
      "accountId": "act_1234567890",
      "accountName": "My Business Ad Account",
      "isActive": true,
      "connectedAt": "2026-07-01T10:05:00Z"
    }
  ]
}
```

### DELETE /workspaces/:id/connections/:connectionId
Disconnect a platform. Revokes OAuth token.

**Response 200:**
```json
{ "disconnected": true }
```

---

## Recommendations

### GET /workspaces/:id/recommendations
List all recommendations sorted by composite score (impact × urgency × ease).

**Query params:**
- `status` — `pending` | `acted` | `dismissed` (default: `pending`)
- `type` — `paid_to_organic` | `organic_to_paid` | `fatigue_alert` | `budget_shift` (optional filter)
- `limit` — number (default: 20)
- `offset` — number

**Response 200:**
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "type": "paid_to_organic",
      "sourceChannel": "google_ads",
      "targetChannel": "seo",
      "title": "5 converting search terms have no SEO content",
      "body": "These terms are converting in Google Ads but you have zero organic coverage. Create content and reduce paid dependency over time.",
      "actionLabel": "View content briefs",
      "impactScore": 88,
      "effortScore": 35,
      "urgencyScore": 72,
      "compositeScore": 81,
      "status": "pending",
      "createdAt": "2026-07-05T04:00:00Z",
      "expiresAt": "2026-07-12T04:00:00Z",
      "data": {
        "searchTerms": ["best moisturizer for dry skin", "affordable skincare routine"],
        "totalConversions": 23,
        "estimatedMonthlySearchVolume": 8400
      }
    }
  ],
  "total": 12
}
```

### PATCH /workspaces/:id/recommendations/:recId
Act on, dismiss, or snooze a recommendation.

**Request:**
```json
{
  "action": "acted"  
}
```
or
```json
{
  "action": "snoozed",
  "snoozedUntil": "2026-07-12T00:00:00Z"
}
```

**Response 200:**
```json
{ "updated": true }
```

---

## Content Pipeline

### GET /workspaces/:id/content-pipeline
List all content briefs.

**Response 200:**
```json
{
  "briefs": [
    {
      "id": "uuid",
      "keyword": "best moisturizer for dry skin",
      "source": "google_ads_search_term",
      "sourceData": {
        "conversions": 12,
        "conversionRate": 4.2,
        "avgCpc": 1.45
      },
      "brief": {
        "recommendedH1": "Best Moisturizers for Dry Skin: Dermatologist-Tested Picks",
        "wordCount": 2200,
        "headingStructure": [
          "H2: Why Dry Skin Needs a Different Moisturizer",
          "H2: The 7 Best Moisturizers for Dry Skin",
          "H2: How to Apply Moisturizer for Maximum Hydration",
          "H2: Frequently Asked Questions"
        ],
        "entities": ["hyaluronic acid", "ceramides", "glycerin", "skin barrier"],
        "faqQuestions": [
          "What ingredients should I look for in a moisturizer for dry skin?",
          "How often should I moisturize dry skin?"
        ],
        "metaTitle": "7 Best Moisturizers for Dry Skin (2026) — Dermatologist Picks",
        "metaDescription": "Struggling with dry skin? We tested 40+ moisturizers to find the ones that actually work. See our top picks by skin type and budget."
      },
      "status": "draft",
      "createdAt": "2026-07-05T04:15:00Z"
    }
  ]
}
```

---

## Analytics

### GET /workspaces/:id/analytics/mer
Returns the Blended Marketing Efficiency Ratio data.

**Query params:**
- `days` — `30` | `60` | `90` (default: `30`)

**Response 200:**
```json
{
  "current": {
    "mer": 4.2,
    "totalRevenue": 84000,
    "totalAdSpend": 20000,
    "googleAdsSpend": 8000,
    "metaAdsSpend": 12000,
    "period": "2026-06-05 to 2026-07-05"
  },
  "previousPeriod": {
    "mer": 3.8,
    "totalRevenue": 76000,
    "totalAdSpend": 20000
  },
  "merChange": 10.5,
  "trend": [
    { "date": "2026-06-05", "mer": 3.6, "revenue": 2400, "spend": 667 },
    { "date": "2026-06-06", "mer": 4.1, "revenue": 2870, "spend": 700 }
  ],
  "annotations": [
    { "date": "2026-06-15", "label": "Summer sale launched" }
  ]
}
```

### POST /workspaces/:id/analytics/revenue
Manually enter revenue data (for non-Shopify users).

**Request:**
```json
{
  "date": "2026-07-04",
  "revenue": 3200,
  "note": "Shopify dashboard"
}
```

---

## SEO

### POST /workspaces/:id/seo/keywords/research
Trigger keyword research.

**Request:**
```json
{
  "seedKeyword": "moisturizer for dry skin",
  "location": "US",
  "language": "en"
}
```

**Response 202:**
```json
{
  "jobId": "uuid",
  "estimatedSeconds": 15,
  "statusUrl": "/api/v1/workspaces/:id/jobs/uuid"
}
```

### GET /workspaces/:id/seo/rankings
Get rank tracking data.

**Query params:**
- `keyword` — filter by keyword (optional)
- `device` — `desktop` | `mobile`
- `days` — `7` | `30` | `90`

**Response 200:**
```json
{
  "rankings": [
    {
      "keyword": "best moisturizer for dry skin",
      "currentPosition": 8,
      "previousPosition": 11,
      "change": 3,
      "device": "desktop",
      "url": "https://example.com/best-moisturizers",
      "hasAiOverview": true,
      "isCitedInAiOverview": false,
      "history": [
        { "date": "2026-07-04", "position": 8 },
        { "date": "2026-07-03", "position": 11 }
      ]
    }
  ]
}
```

---

## Google Ads

### GET /workspaces/:id/google-ads/search-terms
Returns the enriched Search Terms Intelligence report.

**Response 200:**
```json
{
  "searchTerms": [
    {
      "term": "affordable moisturizer for sensitive dry skin",
      "impressions": 420,
      "clicks": 38,
      "conversions": 6,
      "conversionRate": 15.8,
      "spend": 55.20,
      "organicSearchVolume": 1200,
      "existingSeoContent": null,
      "recommendation": "paid_proven_organic_needed",
      "contentBriefId": "uuid"
    },
    {
      "term": "best skincare brand",
      "impressions": 1200,
      "clicks": 90,
      "conversions": 8,
      "organicPosition": 2,
      "recommendation": "reduce_bid_ranking_organically",
      "estimatedBidSavings": 45.00
    }
  ]
}
```

---

## Meta Ads

### GET /workspaces/:id/meta-ads/creatives
Returns creatives with fatigue status.

**Response 200:**
```json
{
  "creatives": [
    {
      "id": "uuid",
      "name": "Summer hero - UGC style",
      "adSetId": "123456",
      "adSetName": "Cold - Interest - Skincare",
      "status": "active",
      "fatigue": {
        "score": 0.78,
        "frequency": 3.4,
        "ctrDeclinePercent": 31,
        "estimatedDaysToRoasImpact": 2,
        "alert": true
      },
      "performance7d": {
        "impressions": 45000,
        "clicks": 630,
        "ctr": 1.4,
        "spend": 820,
        "conversions": 18,
        "roas": 3.2
      }
    }
  ]
}
```

---

## Intelligence

### GET /workspaces/:id/intelligence/report
Get the latest weekly Growth Intelligence Report.

**Response 200:**
```json
{
  "report": {
    "weekOf": "2026-06-30",
    "generatedAt": "2026-07-06T08:00:00Z",
    "summary": "Strong week across all channels. Meta ROAS improved 18% after creative refresh. SEO gained 3 first-page positions. Google Ads search terms revealed 5 new content opportunities.",
    "whatWorked": [
      "New UGC-style creatives on Cold audience outperformed previous set by 2.3× CTR",
      "Blog post 'How to build a skincare routine' entered position 8 for target keyword"
    ],
    "whatDidNot": [
      "Google Ads branded campaign is capturing traffic that would convert organically — consider pausing",
      "MOFU retargeting audience is too broad — overlap with BOFU exceeding 35%"
    ],
    "topOpportunities": [
      {
        "rank": 1,
        "channel": "seo",
        "opportunity": "5 high-converting Google Ads terms have no SEO content — creating them could reduce paid dependency by an estimated $600/month within 90 days",
        "effort": "medium",
        "impact": "high"
      }
    ],
    "budgetRecommendations": {
      "currentAllocation": { "googleAds": 8000, "metaAds": 12000 },
      "recommendedAllocation": { "googleAds": 7000, "metaAds": 13000 },
      "reasoning": "Meta efficiency is currently stronger. Shift $1,000 to Meta and reduce Google branded spend which is cannibalizing organic."
    }
  }
}
```

---

## Jobs (Async operations)

### GET /workspaces/:id/jobs/:jobId
Poll for async job status.

**Response 200 (in progress):**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "progress": 45,
  "message": "Analyzing 842 keywords..."
}
```

**Response 200 (complete):**
```json
{
  "jobId": "uuid",
  "status": "complete",
  "resultUrl": "/api/v1/workspaces/:id/seo/keywords/results/uuid"
}
```

**Response 200 (failed):**
```json
{
  "jobId": "uuid",
  "status": "failed",
  "error": "DataForSEO rate limit exceeded. Results will retry in 60 seconds."
}
```

---

## Error Responses

All errors follow this structure:

```json
{
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "The workspace you requested does not exist or you do not have access.",
    "statusCode": 404
  }
}
```

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient workspace role |
| `WORKSPACE_NOT_FOUND` | 404 | Workspace doesn't exist or no access |
| `PLAN_LIMIT_REACHED` | 402 | Action blocked by current plan limits |
| `INTEGRATION_NOT_CONNECTED` | 422 | Required platform connection is missing |
| `JOB_QUEUED` | 202 | Async operation accepted (not an error) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## WebSocket Events

Connect to `wss://api.growthOS.com/api/v1/workspaces/:id/ws` with the Better Auth session token as a query param or in the initial handshake.

### Incoming events (server → client)

```jsonc
// New recommendation available
{ "event": "recommendation:new", "data": { "recommendation": { ...recommendationObject } } }

// Creative fatigue alert
{ "event": "meta:fatigue_alert", "data": { "adSetId": "...", "creativeName": "...", "frequency": 3.4 } }

// Rank position change (± 3 or more)
{ "event": "seo:rank_change", "data": { "keyword": "...", "from": 11, "to": 8 } }

// Async job completed
{ "event": "job:complete", "data": { "jobId": "...", "type": "keyword_research" } }

// MER anomaly
{ "event": "analytics:mer_alert", "data": { "current": 2.8, "previous": 4.2, "dropPercent": 33 } }

// Weekly report ready
{ "event": "intelligence:report_ready", "data": { "weekOf": "2026-06-30" } }
```
