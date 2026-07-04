# GrowthOS — Engineering Guide

Conventions, decisions, and patterns every engineer on this project follows.

---

## Coding Conventions

### TypeScript (Fastify API + Next.js)

**Strict mode everywhere — no exceptions.**

```typescript
// tsconfig.json (all Node/Next apps inherit from packages/config/typescript/base.json)
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**No `any`. Use `unknown` and narrow properly.**

```typescript
// BAD
function processData(data: any) { ... }

// GOOD
function processData(data: unknown) {
  if (isRecommendation(data)) { ... }
}
```

**Zod for all external data validation (API inputs, third-party API responses).**

```typescript
// apps/api/src/routes/recommendations/schema.ts
import { z } from 'zod'

export const patchRecommendationSchema = z.object({
  action: z.enum(['acted', 'dismissed', 'snoozed']),
  snoozedUntil: z.string().datetime().optional(),
}).refine(
  (data) => data.action !== 'snoozed' || data.snoozedUntil !== undefined,
  { message: 'snoozedUntil is required when action is snoozed' }
)

export type PatchRecommendationInput = z.infer<typeof patchRecommendationSchema>
```

**Drizzle for all database queries — never raw SQL in route handlers.**

```typescript
// GOOD — type-safe, auditable
const recs = await db
  .select()
  .from(recommendations)
  .where(
    and(
      eq(recommendations.workspaceId, workspaceId),
      eq(recommendations.status, 'pending')
    )
  )
  .orderBy(desc(recommendations.compositeScore))
  .limit(20)

// BAD — raw SQL bypasses types and RLS checks
const recs = await db.execute(sql`SELECT * FROM recommendations WHERE workspace_id = ${workspaceId}`)
```

**Error handling — always use typed errors.**

```typescript
// apps/api/src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public data?: Record<string, unknown>
  ) {
    super(message)
  }
}

export const Errors = {
  notFound: (resource: string) => new AppError('NOT_FOUND', `${resource} not found`, 404),
  forbidden: () => new AppError('FORBIDDEN', 'You do not have access to this resource', 403),
  planLimit: (feature: string) => new AppError('PLAN_LIMIT_REACHED', `${feature} is not available on your current plan`, 402),
}
```

### Python (Worker)

**Pydantic v2 for all data models. No dict-passing between functions.**

```python
# GOOD
class SearchTermOpportunity(BaseModel):
    term: str
    conversion_rate: float
    organic_volume: int
    existing_seo_coverage: bool
    recommendation: Literal["paid_proven_organic_needed", "reduce_bid_ranking_organically"]

# BAD
def process_search_term(data: dict): ...
```

**Type hints on every function. No implicit `Any`.**

```python
from typing import Optional
from datetime import datetime

async def fetch_search_terms(
    workspace_id: str,
    connection_id: str,
    since: Optional[datetime] = None
) -> list[SearchTermOpportunity]:
    ...
```

**Celery tasks must be idempotent — they can run twice without side effects.**

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="workers.google_ads.pull_search_terms"
)
def pull_search_terms(self, workspace_id: str, connection_id: str) -> None:
    try:
        ...
    except RateLimitError as exc:
        raise self.retry(exc=exc, countdown=120)
```

---

## Fastify Route Pattern

Every route file follows this structure:

```typescript
// apps/api/src/routes/recommendations/index.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Errors } from '../../lib/errors'
import { requireWorkspaceMember } from '../../plugins/auth'

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  
  // GET /workspaces/:id/recommendations
  fastify.get(
    '/',
    {
      preHandler: [requireWorkspaceMember('viewer')],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({
          status: z.enum(['pending', 'acted', 'dismissed']).default('pending'),
          limit: z.coerce.number().min(1).max(100).default(20),
          offset: z.coerce.number().min(0).default(0),
        }),
      },
    },
    async (request, reply) => {
      const { id: workspaceId } = request.params
      const { status, limit, offset } = request.query

      const recommendations = await fastify.db
        .select()
        .from(recommendationsTable)
        .where(
          and(
            eq(recommendationsTable.workspaceId, workspaceId),
            eq(recommendationsTable.status, status)
          )
        )
        .orderBy(desc(recommendationsTable.compositeScore))
        .limit(limit)
        .offset(offset)

      return { recommendations }
    }
  )

  // PATCH /workspaces/:id/recommendations/:recId
  fastify.patch(
    '/:recId',
    {
      preHandler: [requireWorkspaceMember('manager')],
      schema: {
        params: z.object({ id: z.string().uuid(), recId: z.string().uuid() }),
        body: patchRecommendationSchema,
      },
    },
    async (request, reply) => {
      const { id: workspaceId, recId } = request.params
      const { action, snoozedUntil } = request.body

      // ... update logic

      // Log the action
      await fastify.audit.log({
        workspaceId,
        userId: request.user.id,
        action: `recommendation.${action}`,
        entityType: 'recommendation',
        entityId: recId,
      })

      return { updated: true }
    }
  )
}

export default plugin
```

---

## Claude API Usage Patterns

All Claude API calls are in `apps/worker/app/integrations/claude.py`. Never call Claude directly from route handlers.

### Content brief generation

```python
import anthropic
from app.models import ContentBriefInput, ContentBrief

client = anthropic.Anthropic()

async def generate_content_brief(input: ContentBriefInput) -> ContentBrief:
    """
    Generate an SEO content brief for a target keyword.
    Uses Claude Sonnet 4.6 for generation quality.
    """
    prompt = f"""You are an expert SEO content strategist.

Generate a complete content brief for the following keyword:

Target keyword: {input.keyword}
Search intent: {input.intent}
Monthly search volume: {input.search_volume}
Keyword difficulty: {input.difficulty}

Top 3 competing pages:
{format_competitor_analysis(input.competitors)}

Brand voice guidelines:
{input.brand_voice or "Professional, helpful, evidence-based"}

Return ONLY a JSON object with this exact structure:
{{
  "recommendedH1": "string",
  "wordCount": number,
  "headingStructure": ["H2: ...", "H3: ...", ...],
  "entities": ["entity1", "entity2", ...],
  "faqQuestions": ["question1", "question2", ...],
  "metaTitle": "string (under 60 chars)",
  "metaDescription": "string (under 155 chars)",
  "internalLinkTargets": ["url1", "url2"]
}}

No preamble. No explanation. Only the JSON object."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    import json
    raw = message.content[0].text.strip()
    data = json.loads(raw)
    return ContentBrief(**data)
```

### Intent classification (high-volume — use Haiku)

```python
async def classify_keyword_intent(
    keywords: list[str]
) -> list[tuple[str, str]]:
    """
    Classify keyword search intent in bulk.
    Uses Claude Haiku 4.5 — ~20x cheaper than Sonnet for simple classification.
    """
    keywords_formatted = "\n".join(f"- {kw}" for kw in keywords)
    
    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""Classify each keyword's search intent.
            
Keywords:
{keywords_formatted}

Return ONLY a JSON array: [{{"keyword": "...", "intent": "informational|navigational|commercial|transactional"}}]
No preamble."""
        }]
    )
    
    results = json.loads(message.content[0].text)
    return [(r["keyword"], r["intent"]) for r in results]
```

### Intelligence Engine recommendation explainer

```python
async def explain_recommendation(
    rule_type: str,
    data: dict,
    workspace_context: dict
) -> tuple[str, str]:
    """
    Generate human-readable title + body for a cross-channel recommendation.
    Returns (title, body).
    """
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": f"""You are a senior digital marketing strategist explaining a recommendation to a business owner.

Recommendation type: {rule_type}
Data: {json.dumps(data, indent=2)}
Business context: {json.dumps(workspace_context, indent=2)}

Write a clear, plain-language recommendation with:
1. A short title (max 10 words, no jargon)
2. A body explanation (2-3 sentences, specific numbers where available, explain WHY this matters and what to do)

Return ONLY JSON: {{"title": "...", "body": "..."}}"""
        }]
    )
    
    result = json.loads(message.content[0].text)
    return result["title"], result["body"]
```

---

## Intelligence Engine — Rule Definitions

Rules live in `apps/worker/app/workers/intelligence/rules.py`. Each rule is a Python dataclass:

```python
@dataclass
class CrossChannelRule:
    id: str
    name: str
    source_channel: str
    target_channel: str
    recommendation_type: str
    trigger: Callable[[WorkspaceData], bool]
    impact_estimator: Callable[[WorkspaceData], int]    # returns 1–100
    urgency_estimator: Callable[[WorkspaceData], int]   # returns 1–100
    effort_score: int                                    # fixed, 1–100
```

**Example rules:**

```python
RULES = [
    CrossChannelRule(
        id="R001",
        name="paid_proven_organic_gap",
        source_channel="google_ads",
        target_channel="seo",
        recommendation_type="paid_to_organic",
        trigger=lambda d: len(d.converting_terms_without_seo_coverage) > 0,
        impact_estimator=lambda d: min(95, 40 + len(d.converting_terms_without_seo_coverage) * 10),
        urgency_estimator=lambda d: 70,
        effort_score=35,
    ),
    CrossChannelRule(
        id="R002",
        name="organic_rank_paid_opportunity",
        source_channel="seo",
        target_channel="google_ads",
        recommendation_type="rank_drop_coverage",
        trigger=lambda d: any(4 <= r.position <= 10 for r in d.keyword_rankings if not d.has_active_paid_campaign(r.keyword)),
        impact_estimator=lambda d: 65,
        urgency_estimator=lambda d: 55,
        effort_score=30,
    ),
    CrossChannelRule(
        id="R003",
        name="creative_fatigue_detected",
        source_channel="meta_ads",
        target_channel="meta_ads",
        recommendation_type="fatigue_alert",
        trigger=lambda d: any(
            a.frequency > 3.0 and a.ctr_decline_percent > 20
            for a in d.meta_ad_sets
        ),
        impact_estimator=lambda d: 85,
        urgency_estimator=lambda d: 90,
        effort_score=20,
    ),
    # ... 44 more rules
]
```

---

## Testing Strategy

### What to test

- **Unit tests:** Pure functions, rule trigger logic, data transformations, Claude prompt construction
- **Integration tests:** Fastify routes (with test Neon branch), Celery tasks (with mocked external APIs)
- **E2E tests:** Critical user flows only (onboarding wizard, recommendation act/dismiss, MER dashboard load)

### Neon branching for tests

```bash
# CI creates a fresh Neon branch per PR
# apps/api/vitest.setup.ts
const testBranchName = `ci-${process.env.GITHUB_SHA?.slice(0, 8) ?? 'local'}`
// Uses Neon Management API to create + migrate + seed + teardown
```

### Mocking external APIs

```python
# apps/worker/tests/conftest.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_google_ads():
    with patch('app.integrations.google_ads.GoogleAdsClient') as mock:
        mock.return_value.get_search_terms.return_value = SAMPLE_SEARCH_TERMS
        yield mock

@pytest.fixture
def mock_claude():
    with patch('app.integrations.claude.client') as mock:
        mock.messages.create.return_value = AsyncMock(
            content=[AsyncMock(text='{"title": "Test", "body": "Test body"}')]
        )
        yield mock
```

---

## Performance Budgets

| Metric | Limit | How enforced |
|---|---|---|
| Dashboard initial load | < 2s | Lighthouse CI in GitHub Actions |
| API p95 read response | < 500ms | Grafana alert |
| API p95 write response | < 2s | Grafana alert |
| Celery task lag (queue → start) | < 30s | Flower monitoring |
| ClickHouse query time | < 1s | Query logs |
| Bundle size (web, initial JS) | < 150KB gzipped | Bundlesize check in CI |

---

## Security Checklist

Before any PR touching auth, credentials, or user data is merged:

- [ ] No credentials in code or logs (check with `git secrets`)
- [ ] OAuth tokens are encrypted before storage (`AES-256-GCM`, key from env)
- [ ] New tables have RLS policies applied
- [ ] Workspace ID is always validated against the authenticated user's memberships
- [ ] API inputs validated with Zod schema (Fastify) or Pydantic model (Python)
- [ ] No direct user input in SQL (Drizzle parameterizes all queries)
- [ ] Rate limiting applied to new auth-adjacent endpoints
- [ ] Audit log entry created for any state-changing action

---

## Dependency Rules

| Package | Allowed in | Notes |
|---|---|---|
| `packages/types` | web, api | Shared TypeScript types only — no runtime dependencies |
| `packages/db` | api only | Never import database client in `apps/web` |
| `packages/ui` | web only | Component library — never in api |
| `anthropic` SDK | worker only | Never call Claude from Fastify routes |
| `google-ads-api` | worker only | Python client — worker only |
| `facebook-business` | worker only | Python SDK — worker only |

The Fastify API orchestrates but never calls AI APIs or third-party marketing APIs directly. All of that goes through the worker via job queue.
