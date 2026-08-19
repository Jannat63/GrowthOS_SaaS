# P4.4 — GEO Tracking + Public API

Milestone: M4 · Depends on: `api_keys` + `/api/public/v1/*` (built 2026-07-26), `plan-limits.ts`,
the WebSocket event bus (`ws.ts`), `scheduler.ts`

## Audit of the existing plan (2026-08-20)

There was no phase folder. Everything the repo specified about P4.4:

- `docs/plan/M4-v2-automation/README.md` — one line: *"daily AI-citation monitoring, competitor GEO,
  AEO recs, public REST API (Scale tier), OpenAPI + webhooks"*
- `docs/plan/PROGRESS.md` — records the public-API half as done 2026-07-26

So half this phase already shipped without a folder to record it, and the other half was never
specified. This document designs what is left.

### The four deliverables, against what this codebase can reach

| # | Deliverable | Status | Needs external access? |
|---|-------------|--------|------------------------|
| 1 | Public REST API + OpenAPI (Scale tier) | **Done** 2026-07-26 | No |
| 2 | Per-key rate limits | **Not built** — shares the global 200/min IP limit | No |
| 3 | Outbound webhooks | **Not built** — every `webhook` in this repo is Stripe *inbound* | No |
| 4 | GEO / AI-citation monitoring | **Not built** | **Yes** — paid ChatGPT/Perplexity/Gemini access |

Three of four need nothing external. Deliverable 4 is deferred on the same grounds as the Google Ads
developer token: no credential, and nothing to measure against.

**Decision: split the phase at the credential line, as P4.3 did.** P4.4a = rate limits + webhooks
(this document). P4.4b = GEO tracking, deferred.

---

## P4.4a-1 — Per-key rate limits

### The problem

`app.ts` registers one global `@fastify/rate-limit`: 200 req/min keyed by IP, for every route. The
public API inherits it. Two consequences, both wrong:

- **A customer's server-side integration is one IP.** Every call from their backend shares a single
  bucket, so a Zapier job and a nightly export throttle each other.
- **Browser traffic and API traffic share a limit.** A busy dashboard user can exhaust the budget a
  paying Scale customer's integration depends on.

There is also no way to price API access differently per plan, which is the point of putting it
behind the Scale tier at all.

### Design

`routes/public-api.ts` is already an encapsulated Fastify plugin whose `preHandler` resolves
`Authorization: Bearer <key>` into `request.apiKey` before any handler runs. That is the hook point —
a second rate-limit instance registered *inside* that plugin's scope applies only to public routes,
while the global IP limiter continues to protect everything else.

- **`keyGenerator`** returns the API key's id (never the key or its hash), so each key gets its own
  bucket regardless of source IP.
- **`max` is a function of the request**, resolving the workspace's plan through `plan-limits.ts`:

  | Plan | Public API | Rationale |
  |------|-----------|-----------|
  | Starter / Growth | — | No API access; `assertFeatureEnabled('apiAccess')` already 402s first |
  | Scale | 120 / min | Above the 60/min commonly treated as a public-API floor, below what one free-tier Neon instance serves comfortably |

- **Store: Redis**, via the `ioredis` connection the scheduler and WS relay already use. In-memory
  buckets are per-process, so they would silently double the real limit the moment a second API
  instance runs — the same per-process assumption already flagged against `ws.ts` in the go-live
  checklist. Falls back to in-memory with a logged warning when Redis is unreachable, matching how
  `publish()` degrades.

**Ordering note:** `@fastify/rate-limit`'s per-scope config only applies if the plugin finishes
registering before the routes it guards. Register and `await` it at the top of
`registerPublicApiRoutes`, before any `app.get`.

### Response contract

Current behaviour returns the `RATE_LIMITED` envelope with no headers, which tells a client it was
throttled but not for how long. A client that cannot see a reset time retries immediately, which is
the failure this feature exists to prevent.

Emit on every public-API response — not only 429s, so clients can slow down *before* being cut off:

```
RateLimit-Limit: 120
RateLimit-Remaining: 43
RateLimit-Reset: 37
Retry-After: 37          # 429 only
```

Keep the existing `{ error: { code: 'RATE_LIMITED', ... } }` body — it is the documented envelope and
the OpenAPI spec already describes it.

### Files

- `apps/api/src/routes/public-api.ts` — register the scoped limiter
- `apps/api/src/plan-limits.ts` — `getApiRateLimit(workspaceId)` beside the existing helpers
- `apps/api/src/routes/public-api.test.ts` — extend

### Tests

Distinct keys do not share a bucket · the same key throttles at its ceiling · a 429 carries
`Retry-After` and the `RateLimit-*` family · the limiter is scoped (an `/api/v1` route is unaffected
by an exhausted public-API key) · Redis being down degrades rather than 500s.

---

## P4.4a-2 — Outbound webhooks

### The problem

The public API is read-only and poll-based. A customer wanting to react to a new recommendation must
poll `GET /recommendations` on a timer. The app already knows the moment one is created — it
publishes to the WebSocket bus — but that transport is browser-only and cookie-authenticated, so no
server-side integration can consume it.

### Design: one event bus, two transports

The decisive constraint is that **the trigger points already exist**. `ws.ts`'s `publish()` is called
at every real event site (`job:complete`, `job:failed`, `recommendation:new`, `meta:fatigue_alert`,
`analytics:mer_alert`, `intelligence:report_ready`). Webhooks fan out from that same call rather than
introducing a parallel set of hooks that would drift out of sync with it.

```
event site → publish(workspaceId, event)
                ├── WS rooms          (browser, existing)
                └── webhook dispatch  (server-to-server, new)
```

### Wire format: Standard Webhooks

Adopt the [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks) spec verbatim
rather than inventing a signature scheme. It is what Stripe/GitHub-style signing converged on, and
consumers can verify with an off-the-shelf library instead of reading documentation we would
otherwise have to write.

```
webhook-id:        msg_2xK9...              # also the idempotency key
webhook-timestamp: 1787176628               # unix seconds
webhook-signature: v1,K5oZfzN95Z9UVu1Es...  # base64 HMAC-SHA256
```

Signed content is `{id}.{timestamp}.{body}` over the **raw serialized bytes**, HMAC-SHA256, base64.
Signing a re-serialized object instead of the exact bytes sent is the most common implementation bug
in this area — one whitespace difference invalidates every signature — so the dispatcher serializes
once and both signs and sends that same buffer.

Consumers are told to reject timestamps outside a ±5 minute tolerance (replay defence) and to treat
`webhook-id` as an idempotency key. Both go in the OpenAPI docs.

### Data model

**`webhook_endpoints`**

- `id`, `workspace_id`, `url` (https only, validated on write)
- `secret` — generated server-side, **encrypted at rest** with the existing `crypto.ts` AES-256-GCM
  helper exactly as OAuth tokens are; shown to the user once at creation
- `event_types` text[] — subscribe to a subset; `['*']` for all
- `enabled`, `created_at`, `disabled_at`, `consecutive_failures`

**`webhook_deliveries`** — the ledger, mirroring `automation_actions` from P4.3a

- `id`, `endpoint_id`, `event_type`, `payload` jsonb
- `status`: `pending` | `delivered` | `failed` | `exhausted`
- `attempts`, `last_status_code`, `last_error`, `next_attempt_at`, `delivered_at`

Persisting before sending is what makes delivery survive a crash — the same reasoning as the
`background_jobs` fix in `AUDIT-2026-08-13-codebase.md` #4.

### Delivery and retries

Dispatch never blocks the request that produced the event: `publish()` writes `pending` rows and
returns. A `node-cron` task in `scheduler.ts` sweeps due deliveries, reusing the Redis single-runner
lock the stuck-job sweep already holds — no new infrastructure, and it inherits the existing
observability (`scheduler_runs`).

Backoff is exponential **with jitter**: approximately 10s, 1m, 5m, 30m, 2h. Jitter matters because a
customer endpoint returning 500 fails for *all* their events at once, and unjittered retries would
resynchronise into a thundering herd against an endpoint already in trouble.

After 5 exhausted attempts a delivery is `exhausted`. After 20 consecutive failures the endpoint is
disabled and its owner emailed — a permanently dead URL should stop consuming retry budget, and
silently retrying forever is how a queue becomes an outage.

Timeout per attempt: 10s. 2xx is success; everything else retries.

### Gating

Scale plan, via `assertFeatureEnabled(workspaceId, 'apiAccess')` — the same gate as API keys.
Webhooks are the push half of the same product.

### Files

- `packages/db/src/schema/webhooks.ts` + migration
- `apps/api/src/webhooks/{signing,dispatch,endpoints}.ts`
- `apps/api/src/ws.ts` — fan out from `publish()`
- `apps/api/src/scheduler.ts` — the delivery sweep
- `apps/api/src/routes/v1.ts` — endpoint CRUD under `/workspaces/:id/webhooks`
- `apps/web/components/settings/WebhooksSection.tsx`

### Tests

Signature matches a known-good vector from the spec · signing is byte-exact (re-serializing breaks
it) · `publish()` writes one pending row per subscribed endpoint and none for unsubscribed event
types · the backoff schedule advances correctly · 5 failures exhaust, 20 disable · a dead endpoint
cannot block others · secrets are encrypted at rest and never returned by any read route.

---

## P4.4b — GEO / AI-citation tracking (deferred)

Daily monitoring of whether a brand is cited in AI answers, competitor GEO comparison, and AEO
recommendations. Needs paid, rate-limited access to ChatGPT / Perplexity / Gemini, and there is no
credential for any of them. `ai_citations` (ClickHouse) is the table when this is reached.

Deferred for the same reason as P4.3b: without access there is nothing to measure, and scraping those
UIs would be both fragile and against their terms.

## Build order

`P4.4a-1` (rate limits) → `P4.4a-2` (webhooks). Rate limits first: they are smaller, they touch the
same plugin webhooks will be documented alongside, and the per-key identity they establish is what
makes webhook delivery attributable to a customer rather than an IP.
