# P2.3 — Progress

Status: [~]  ·  Updated: 2026-07-17  ·  **P2.3a done; P2.3b next.**

Split into P2.3a (foundation) + P2.3b (feature). Architecture: canonical scoring in shared
`@growthos/logic`, run in the API (no Python port).

| Item | Status | Notes |
|------|--------|-------|
| `@growthos/logic` package (engines + fixtures) | [x] | **P2.3a.** Extracted from `apps/web`; consumed by web + api. 52 tests pass. |
| `recommendations` table | [x] | **P2.3a.** Migration `0003`; app-computed composite. |
| `GET /recommendations` + frontend unification | [x] | **P2.3a.** Generate-if-empty, persisted; queue now live-backed. E2E verified. |
| `content_briefs` table | [ ] | P2.3b. |
| Search-terms scoring (canonical `search-terms-bridge` **in API**) | [ ] | P2.3b. Not a Python worker. |
| `GET /workspaces/:id/google-ads/search-terms` | [ ] | P2.3b. |
| Rule-based brief generator | [ ] | P2.3b. `legacy/services/seo-service/content_brief.py` spec. |
| Content Pipeline UI (google-ads/search-terms page) | [ ] | P2.3b. |
| Dismiss/snooze/act (`PATCH /recommendations/:id`) | [ ] | P2.3b. |

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — **P2.3a complete.** Extracted `@growthos/logic` (single source of truth for scoring),
  added `recommendations` table + generate-if-empty `GET /recommendations`, unified the frontend
  `Recommendation` shape onto live persisted data (retiring the mock-compute divergence). Built via TDD;
  52 logic tests + API vitest green; web build compiles; data-layer E2E verified. See `VERIFY-P2.3a.md`.
  **Next: P2.3b** (paid-to-organic feature — search-terms surface, content briefs, Content Pipeline UI,
  act/dismiss/snooze).