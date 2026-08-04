# P2.7 — Progress

Status: [x]  ·  Updated: 2026-07-27  ·  **Done, including real-time WS** (shipped 2026-07-27 — see below).

Ties the modules together: `GET /recommendations` now composes **all** generators
(`ensureAllRecommendations`), so the impact-sorted queue + notification center are complete regardless
of which pages were visited.

| Item | Status | Notes |
|------|--------|-------|
| Growth-hub KPI cards | [x] | Shipped M1; live-backed. |
| Impact-sorted recommendation queue | [x] | `GET /recommendations` (composite desc) — now **unified across all types**. |
| Notification / action center | [x] | TopBar bell dropdown over pending recs, each links to its module. |
| Real-time WebSocket transport | [x] | **Shipped 2026-07-27.** `apps/api/src/ws.ts` + `routes/ws.ts`, all 5 named events wired. See "Real-time WebSocket transport — what shipped" below. |

## Real-time WebSocket transport — what shipped

Named as deferred independently across four phases (P2.5, P2.6, P2.7, P3.4) — every one of them was
relying on polling instead. Built once, here, since all four needed the exact same transport.

| Layer | Artifact | Tests |
|-------|----------|-------|
| API | `apps/api/src/ws.ts` — in-process room registry (`Map<workspaceId, Set<WebSocket>>`) + Redis-relayed `publish()` so the same channel works for same-process events (this API server) and cross-process ones (the Python worker) | 6 ✓ |
| API | `apps/api/src/routes/ws.ts` — `GET /api/v1/workspaces/:id/ws`, auth via the same cookie session as every other route, checked in `preHandler` (before the upgrade completes, not after) | 3 ✓ (real server, real port, real `ws` client) |
| Worker | `apps/worker/app/jobs.py` `mark_complete`/`mark_failed` now take `workspace_id` and publish to the same Redis channel — the one event pair that's cross-process | 15 ✓ (full worker suite, incl. the 2 directly touched) |
| Web | `useWorkspaceSocket` hook (capped-backoff reconnect) + `WorkspaceSocketProvider` (mirrors `BrandingProvider`'s pattern) in the dashboard layout — invalidates the right TanStack Query cache key per event + toasts the user-facing ones | build ✓ |

**All 5 events wired to real trigger points, not arbitrary ones:**
- `recommendation:new` — fires from all three recommendation generators (`recommendations.ts`,
  `search-terms.ts`, `organic-to-paid.ts`), at the point a row is *actually* inserted (each already
  has an idempotent "only if not existing" guard, so this fires once per workspace under the current
  generate-once design — same status as everything else gated on that pattern, not a new limitation).
- `meta:fatigue_alert` — same pattern, from `fatigue.ts`.
- `intelligence:report_ready` — from the scheduler's `runIntelligenceRefresh`, after each real refresh.
- `analytics:mer_alert` — from a **new** scheduler task, `runMerAnomalyCheck` (added specifically for
  this). Deliberately not fired from the `getMerTrend` route handler itself — that function has no
  persistence of its own, so firing from the read path would re-alert every time someone had the
  analytics page open. Checking on a controlled 4h cadence instead means the event means "something
  was monitored and found anomalous," not "someone loaded a page."
- `job:complete`/`job:failed` — from the Python worker, the one genuinely cross-process pair, relayed
  via the same Redis channel `ws.ts` publishes to.

**Real bugs caught before shipping** (see `apps/api/src/ws.ts`'s own header comment and
`docs/plan/M4-v2-automation/progress.md` for the full account):
1. `publish()` originally hung forever, not fast-failed, when Redis was unreachable — the shared
   Redis client's `maxRetriesPerRequest: null` (correct for the job queue's own use) meant a queued
   command waited indefinitely instead of rejecting. Fixed with an explicit 1.5s timeout, so a Redis
   outage can no longer hang every code path that calls `publish()`. Caught because this dev sandbox's
   own test suite hung for real against genuinely-unavailable Redis before the fix.
2. Auth checked *inside* the websocket handler closed an already-open connection for unauthorized
   clients (`@fastify/websocket` completes the upgrade before the handler runs) — a real client
   confirmed this fires `open` before the rejection is visible. Moved to `preHandler`, which runs
   before the upgrade completes, so an unauthorized request now fails the handshake itself.

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — **P2.7 complete (M2 scope).** `ensureAllRecommendations` composes every generator so the
  queue/notification center are complete; TopBar action center over pending recs (links to owning
  modules). Unified test verifies all four types generate, idempotent, ordered. Real-time WS deferred to
  M3. Next: **P2.8 Hardening & polish**.
- 2026-07-27 — **Real-time WebSocket transport shipped** — see section above. Resolves the deferral
  named here and independently in P2.5, P2.6, and P3.4.
