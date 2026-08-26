# P4.4 — GEO Tracking + Public API — Progress

Status: [~]  ·  Updated: 2026-08-27  ·  **In progress** — the public API + OpenAPI half shipped
2026-07-26, and **per-key rate limits (P4.4a-1) shipped 2026-08-27**. Outbound webhooks are planned
(`plan.md`) and not yet built. GEO/AI-citation tracking is deferred on credentials.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| Public REST API + OpenAPI + API keys UI | [x] | **Done 2026-07-26.** `api_keys` (SHA-256 hash only), Bearer-authenticated `/api/public/v1/*`, spec + docs UI via `@fastify/swagger`, Settings → API Keys. 15 tests. Verified with a real signup → upgrade → create-key → call → revoke run. |
| P4.4a-1 Per-key rate limits | [x] | **Done 2026-08-27.** Scoped limiter inside the `public-api.ts` plugin, bucketed by `api_keys.id`, `max` from `getApiRateLimit()` → `PLAN_LIMITS[plan].apiRequestsPerMinute` (Scale = 120/min), Redis-backed on a dedicated fail-fast connection. Emits the draft-spec `RateLimit-*` trio on every response plus `Retry-After` on a 429. The global per-IP limiter now exempts these routes. 8 new tests; whole API suite 39 files / 208 passing. **One deviation from the plan and one bug found — see the log below.** |
| P4.4a-2 Outbound webhooks | [ ] | **Planned.** Standard Webhooks signing, `webhook_endpoints` + `webhook_deliveries`, fan-out from the existing `publish()` bus, scheduler-driven delivery with jittered exponential backoff. |
| P4.4b GEO / AI-citation tracking | [!] | **Deferred** — needs paid ChatGPT/Perplexity/Gemini access. Nothing to measure without it. |

## Design decisions worth keeping visible

- **Standard Webhooks over a bespoke signature scheme.** Customers verify with an off-the-shelf
  library rather than against documentation we would have to write and they would have to trust.
- **One event bus, two transports.** Webhooks fan out from `ws.ts`'s existing `publish()` rather than
  adding a parallel set of trigger points that would drift out of sync with the WebSocket ones.
- **Redis-backed rate limiting, not in-memory.** In-memory buckets are per-process and would silently
  double the real ceiling the moment a second API instance runs — the same per-process assumption
  already flagged against `ws.ts` in the go-live checklist.
- **Headers on every response, not only 429s.** A client that only learns its budget at the moment it
  is cut off cannot slow down in time; `RateLimit-Remaining` is what lets it back off early.
- **A dedicated Redis connection, not the shared `getRedis()` singleton** (2026-08-27, discovered
  while building). The job-bridge client is built with `maxRetriesPerRequest: null` and the offline
  queue on, which is right for a queue and fatal for a limiter: while Redis is unreachable its
  commands are queued rather than rejected, so the limiter would hang every public-API request
  instead of degrading. `ws.ts` documents hitting exactly this and works around it with a timeout
  race, which is not reachable inside the limiter's own store. The limiter's connection sets
  `enableOfflineQueue: false` / `maxRetriesPerRequest: 1` / `connectTimeout: 1000` so the command
  fails fast and `skipOnError` can act.
- **The scoped limiter really is scoped, and this was measured rather than assumed** (2026-08-27).
  `@fastify/rate-limit` is `fastify-plugin`-wrapped, which usually means "does not create a child
  context" and reads like it would leak to the root app. It does not: registered inside a plain
  plugin, its `onRoute` hook sees that plugin's scope only. Verified with a throwaway two-route
  probe before any of this was built — an exhausted scoped bucket left the root route answering 200,
  and the draft-spec header names did not appear on it.

## Log

- 2026-07-26 — Public API half built (recorded in `PROGRESS.md` at the time; this folder did not exist).
- 2026-08-20 — Phase folder created; `plan.md` written. Audited what P4.4 actually specified and found
  three of four deliverables need nothing external. Split the phase at the credential line (P4.4a
  buildable, P4.4b deferred), matching how P4.3 was split.
- 2026-08-27 — **P4.4a-1 built.** Three corrections to `plan.md`, all found by reading the code and
  the library rather than by trusting the design:
  - The plan says the plugin's preHandler resolves `request.apiKey`. It does not — it sets
    `request.workspaceId`, and `resolveApiKey` returns a `keyId` that was being **thrown away**. The
    preHandler now also stashes `request.apiKeyId`, which is what the bucket is keyed on.
  - The plan's "Ordering note" is about plugin registration order, and misses the one that actually
    bites: the limiter's default hook is `onRequest`, which runs **before** the auth preHandler. Left
    alone, `keyGenerator` would have found no key and quietly bucketed every customer together under
    one fallback key — a limiter that looks like it works and shares one budget across all of them.
    It runs at `preHandler` for that reason.
  - The plan did not say to exempt these routes from the **global** per-IP limiter. Without that they
    run under both, and since a customer's integration is one IP, the 200/min IP bucket stays the
    binding constraint — the exact problem this slice exists to remove. `app.ts` now exempts them via
    `isPublicApiDataRoute()`, which deliberately does not exempt `/api/public/v1/docs` (mounted at the
    root scope, unauthenticated, and therefore with no per-key limiter to fall back on).
- 2026-08-27 — **Bug found and fixed, pre-existing and not part of this slice: every 429 in this app
  was answering 500.** `@fastify/rate-limit` *throws* whatever `errorResponseBuilder` returns, and
  both limiters returned a plain envelope object. A thrown plain object is not an `Error`, so it
  missed both typed branches of `app.ts`'s error handler and fell through to the 500 catch-all —
  logging the correct 429 envelope at error level on the way past and reporting it to Sentry as a
  crash. It had been live since P2.8 and nothing caught it because **no test had ever driven a
  limiter to its ceiling**. Both builders now return an `AppError`, and the ceiling test asserts the
  status and the envelope.
- 2026-08-27 — **Deviation from the plan, deliberate and not yet closed.** The plan specifies that the
  store "falls back to in-memory with a logged warning when Redis is unreachable". What shipped is
  `skipOnError: true`: an unreachable store is logged once at warn and requests **pass unlimited**
  until it returns. The library picks its store at registration and cannot swap one at runtime, so a
  true fallback means supplying a custom `store` implementing the whole `incr`/`read`/`child`
  contract and wrapping both backends — and the built-in stores are private CommonJS internals with
  no export map, so it would be hand-rolled concurrency-sensitive code replacing a battle-tested
  one, in a repo with no CI. Failing open was chosen instead: rate limiting is a fairness control,
  not an authorization one, and the key is already authenticated by the time the limiter runs. The
  cost is real and worth stating plainly — during a Redis outage a Scale key is unthrottled. A
  wrapper store is the follow-up if that trade is ever judged wrong.
