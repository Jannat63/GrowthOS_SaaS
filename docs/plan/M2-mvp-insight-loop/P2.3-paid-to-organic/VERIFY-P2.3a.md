# P2.3a — Verification Log (Recommendations Foundation)

Date: 2026-07-17

## Shared `@growthos/logic` package

`pnpm --filter @growthos/logic test` → **52 passed** (50 moved engine tests behavior-preserving + 2
new mapper tests). `pnpm --filter @growthos/logic build` emits `dist/`.

## Recommendations generation (data layer)

`pnpm --filter @growthos/api exec tsx scripts/e2e-recommendations.ts`:
```
generated: 7 | top composite: 80
second call count: 7 | ordered desc: true
OK: recommendations generate-if-empty (persisted, idempotent, ordered by composite)
```
The canonical cross-channel engine over seeded fixtures → 7 recommendations mapped to the blueprint
shape, persisted to Neon; a second call does not regenerate; ordered by composite desc. ✅

## Automated tests

- **`@growthos/logic`:** 52 tests pass.
- **API (vitest):** `ensureRecommendations` generate-if-empty + idempotent + ordered; enqueue test
  still green (2 files pass).
- **DB:** `recommendations` migration `0003` applied; smoke insert/read/delete OK.
- **Web:** `pnpm --filter @growthos/web build` compiles after unifying `RecommendationQueue`,
  `channels`, `LoopMasthead`, and the growth-hub page onto the `Recommendation` shape.

## What changed

- Extracted `apps/web/lib/logic/*` + 3 engine fixtures into shared **`@growthos/logic`** (one source of
  truth); `apps/web` and `apps/api` both consume it.
- `recommendations` table; `GET /workspaces/:id/recommendations` (generate-if-empty, persisted).
- Frontend recommendation queue now renders **live persisted** recs; the mock fallback runs the same
  engine over the same fixtures, so live and fallback agree.

## Deferred to P2.3b

`content_briefs` table; `GET /google-ads/search-terms` (paid-to-organic scoring surface); rule-based
content-brief generator; Content Pipeline page; `PATCH /recommendations/:id` (act/dismiss/snooze).
