# P2.2 — Progress

Status: [x]  ·  Updated: 2026-07-17

Built as Option B (see `docs/superpowers/specs/2026-07-17-p2.2-onboarding-pipeline-design.md`):
wire the wizard to a real pipeline; **recommendations deferred to P2.3** to avoid a second rec producer.

| Item | Status | Notes |
|------|--------|-------|
| Onboarding fields on `workspaces` | [x] | Already existed (Better Auth additionalFields) — reused, not duplicated. |
| Wizard wired to backend | [x] | create-workspace persists profile + enqueues; onboarding-complete polls job → review → complete gate. |
| Site-crawler worker | [x] | **Seeded stub** (`stub_crawl`); real crawl → M3. |
| Channel-mix + 90-day strategy | [x] | Deterministic templates by category+budget (`app/strategy.py`), Claude behind flag (D4). |
| Pixel/tag validators | [–] | Descoped → M3 (need real integrations). |
| Land on dashboard with recs | [~] | Dashboard reached; recs stay **mock-backed** — real recs table/endpoint → P2.3. |

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — **P2.2 complete (Option B).** Audited plan (found profile fields already on
  `workspaces`; recs deferred to avoid a 2nd producer). Built via TDD: `onboarding_analyses` table,
  onboarding types, worker repo helpers + strategy generator + `onboarding_analyze` handler
  (context-aware dispatch), API onboarding routes (persist/status/complete, idempotent), frontend
  wiring (create-workspace → analyzing/review → gate). E2E verified through the real worker. 15 worker
  + API vitest green; web build compiles. See `VERIFY.md`.
