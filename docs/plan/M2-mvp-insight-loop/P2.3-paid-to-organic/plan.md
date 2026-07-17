# P2.3 — Paid-to-Organic Bridge

Milestone: M2 · Depends on: P2.1, P2.2 · Prerequisites: Neon URL · worker (P2.1)

## Goal

Turn paid search-term data into organic content opportunities: score search terms, flag them as
recommendations with generated content briefs, and let the user act on them.

> **Deferred from P2.2 — this phase owns the recommendations contract.** P2.2 intentionally did NOT
> build recommendations (to avoid a second producer alongside the canonical TS cross-channel engine).
> P2.3 is the first slice with a **real** recommendation producer, so it locks the contract here:
> (1) the `recommendations` table, (2) `GET /workspaces/:id/recommendations` endpoint, and
> (3) **unify the frontend shape** — evolve `apps/web/lib/logic/cross-channel-engine.ts`'s
> `CrossChannelRecommendation` (and `RecommendationQueue` + `useRecommendations`) onto the blueprint
> `Recommendation` shape, retiring the mock-compute fallback in favor of live persisted recs.

Split into **P2.3a (foundation, DONE)** and **P2.3b (feature, next)** — see the specs under
`docs/superpowers/`. Key architecture: the canonical scoring lives in the shared **`@growthos/logic`**
package (extracted from `apps/web`), imported by both web + api; scoring runs synchronously in the API
(no Python port).

### P2.3a — Recommendations foundation ✅ (2026-07-17)

- [x] `@growthos/logic` package — engines + fixtures extracted from `apps/web`, consumed by web + api.
- [x] `recommendations` table.
- [x] `GET /workspaces/:id/recommendations` (generate-if-empty, persisted) + unify the frontend
  `Recommendation` shape (deferred from P2.2). Dashboard queue is now live-backed.

### P2.3b — Paid-to-organic feature ✅ (2026-07-17)

- [x] `content_briefs` table (+ `snoozed_until`/`acted_at` on recommendations).
- [x] Search-terms scoring surface — canonical `search-terms-bridge` (TS) run **in the API** (no Python worker).
- [x] `GET /workspaces/:id/google-ads/search-terms` (+ generate-if-empty paid_to_organic recs & briefs).
- [x] Rule-based content-brief generator (`@growthos/logic/content-brief`).
- [x] Content Pipeline UI (`/content-pipeline`) + `GET /content-briefs`.
- [x] Recommendation dismiss / snooze / act (`PATCH /workspaces/:id/recommendations/:recId`).

**P2.3 COMPLETE** (P2.3a + P2.3b). See `VERIFY-P2.3a.md` + `VERIFY-P2.3b.md`.

## Frontend (vertical slice)

- **Content Pipeline** module page (`google-ads/search-terms`) on shadcn — scored terms table,
  a recommendation detail with its generated content brief, and the act / dismiss / snooze controls
  wired to `PATCH /recommendations/:id`. Full loading / empty / error states.
- Runs on seeded search-term fixtures in M2.

## Reuse

- `apps/web/lib/logic/search-terms-bridge.ts` → canonical scoring logic.
- `legacy/services/google-ads-service/search_terms.py` → port reference.
- `legacy/services/seo-service/content_brief.py` → spec (brief generator).

## Surface

- Tables: `recommendations`, `content_briefs`.
- Worker: search-terms scoring (`apps/web/lib/logic/search-terms-bridge.ts`).
- Endpoints: `GET /workspaces/:id/google-ads/search-terms`, `PATCH /recommendations/:id`.
- UI: Content Pipeline (google-ads/search-terms page).

## Verification

- Seeded search terms → scored → a flagged recommendation + brief appear; acting on it persists.
