# P2.3 — Progress

Status: [x]  ·  Updated: 2026-07-17  ·  **P2.3 COMPLETE (P2.3a + P2.3b).**

Split into P2.3a (foundation) + P2.3b (feature). Architecture: canonical scoring in shared
`@growthos/logic`, run in the API (no Python port).

| Item | Status | Notes |
|------|--------|-------|
| `@growthos/logic` package (engines + fixtures) | [x] | **P2.3a.** Extracted from `apps/web`; consumed by web + api. 52 tests pass. |
| `recommendations` table | [x] | **P2.3a.** Migration `0003`; app-computed composite. |
| `GET /recommendations` + frontend unification | [x] | **P2.3a.** Generate-if-empty, persisted; queue now live-backed. E2E verified. |
| `content_briefs` table | [x] | P2.3b. Migration `0004` (+ status cols on recommendations). |
| Search-terms scoring (canonical `search-terms-bridge` **in API**) | [x] | P2.3b. Not a Python worker. |
| `GET /workspaces/:id/google-ads/search-terms` | [x] | P2.3b. Generate-if-empty recs/briefs. |
| Rule-based brief generator | [x] | P2.3b. `@growthos/logic/content-brief`. |
| Content Pipeline UI (`/content-pipeline`) | [x] | P2.3b. Scored table + opportunities + brief + actions. |
| Dismiss/snooze/act (`PATCH /recommendations/:recId`) | [x] | P2.3b. Timestamps persisted. |

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — **P2.3a complete.** Extracted `@growthos/logic` (single source of truth for scoring),
  added `recommendations` table + generate-if-empty `GET /recommendations`, unified the frontend
  `Recommendation` shape onto live persisted data (retiring the mock-compute divergence). Built via TDD;
  52 logic tests + API vitest green; web build compiles; data-layer E2E verified. See `VERIFY-P2.3a.md`.
  **Next: P2.3b** (paid-to-organic feature — search-terms surface, content briefs, Content Pipeline UI,
  act/dismiss/snooze).
- 2026-07-17 — **P2.3b complete → P2.3 DONE.** `content_briefs` table + status columns; content-brief
  generator + paid-to-organic mapper in `@growthos/logic`; API search-terms surface + `/content-briefs`
  + `PATCH /recommendations/:recId`; Content Pipeline page with act/dismiss/snooze. E2E verified (3
  recs + 3 briefs, idempotent, act persists). See `VERIFY-P2.3b.md`. **Next: P2.4 Organic-to-Paid Bridge.**