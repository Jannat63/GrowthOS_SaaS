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

## Subphases

- [ ] Add the `recommendations` and `content_briefs` tables.
- [ ] Add `GET /workspaces/:id/recommendations` + unify the frontend `Recommendation` shape (deferred from P2.2).
- [ ] Build the search-terms scoring worker (canonical `apps/web/lib/logic/search-terms-bridge.ts`;
  `legacy/services/google-ads-service/search_terms.py` as the port reference).
- [ ] Add `GET /workspaces/:id/google-ads/search-terms`.
- [ ] Add the rule-based content-brief generator (`legacy/services/seo-service/content_brief.py` spec).
- [ ] Build the Content Pipeline UI (the google-ads/search-terms page).
- [ ] Add recommendation dismiss / snooze / act (`PATCH /recommendations/:id`).

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
