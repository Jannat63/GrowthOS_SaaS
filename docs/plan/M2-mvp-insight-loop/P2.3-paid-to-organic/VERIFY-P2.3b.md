# P2.3b — Verification Log (Paid-to-Organic Feature)

Date: 2026-07-17

## Paid-to-organic pipeline (data layer)

`pnpm --filter @growthos/api exec tsx scripts/e2e-paid-to-organic.ts`:
```
paid_to_organic recs: 3 | briefs: 3
after act -> status: acted | actedAt set: true
OK: paid-to-organic (recs+briefs generated, idempotent, act persists)
```

Seeded Google Ads search terms → the canonical `search-terms-bridge` flags "paid-proven,
organic-needed" terms → each produces a `paid_to_organic` recommendation + a linked `content_briefs`
row; idempotent per workspace; acting persists status + `actedAt`. ✅

## Automated tests

- **`@growthos/logic`:** content-brief generator + paid-to-organic mapper tests pass (part of the
  package suite).
- **API (vitest, 5 files):** `search-terms` (scores terms, generates recs+briefs idempotently, status
  update sets timestamps) + prior recommendations/enqueue tests — all green.
- **DB:** `content_briefs` migration `0004` (+ `snoozed_until`/`acted_at` on recommendations) applied;
  smoke OK.
- **Web:** `pnpm --filter @growthos/web build` compiles the new `/content-pipeline` page.

## Surface delivered

- `GET /workspaces/:id/google-ads/search-terms` — scored terms (+ generate-if-empty recs/briefs).
- `GET /workspaces/:id/content-briefs` — briefs for a workspace.
- `PATCH /workspaces/:id/recommendations/:recId` — act / dismiss / snooze (with timestamps).
- **Content Pipeline page** — scored search-terms table + paid→organic opportunities with their content
  briefs and act/dismiss/snooze controls; new sidebar nav item.

## Notes

- Scoring/brief generation run **synchronously in the API** via `@growthos/logic` (no Python worker) —
  consistent with the P2.3a architecture.
- Authed HTTP routes need a session cookie (as with prior phases) — data-layer E2E used.
