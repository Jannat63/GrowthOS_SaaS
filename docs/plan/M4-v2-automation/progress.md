# M4 — Progress

Status: [~]  ·  Updated: 2026-07-18  ·  **Started early** — P4.1 attribution slice built (non-blocked,
deterministic) while M3's remaining work waits on external approvals.

Rolling-wave — phases expand to folders as reached.

| Item | Status | Notes |
|------|--------|-------|
| P4.1 Cross-channel attribution | [~] | **Engine + comparison UI done** — 5 multi-touch models over conversion paths (`/attribution`). Real path data pending live channel conversions. |
| P4.2 AI creative automation | [ ] | Outline. Gated on an image/LLM provider (D4 deferred). |
| P4.3 Automated campaign management | [ ] | Outline. Gated on Ads/Meta write access. |
| P4.4 GEO tracking + public API | [ ] | Outline. |
| P4.5 Mobile app | [ ] | Outline. |

## P4.1 — what shipped (commit `6873738`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| logic | `engines/attribution.ts` — `modelWeights`, `attribute`, `attributeAll` (last/first-click, linear, time-decay, position-based) + `conversionPaths` fixture | 9 ✓ |
| API | `apps/api/src/attribution.ts` — `getAttribution` over a `conversion_paths` ClickHouse table (CREATE-if-missing + seed); route `GET .../analytics/attribution` | — |
| Web | `/attribution` — model-comparison matrix (channel × model) + focused single-model bars; `useAttribution` (liveOrMock over fixture); sidebar item | build ✓ |

**Design:** models conserve total revenue and keep a consistent channel set (0-credit touches retained),
so the comparison matrix aligns across columns. The touchpoint table is created on demand (not in the
base ClickHouse init) so the feature works without a container reload. Real multi-touch paths replace the
seed once connected channels report conversions.

## Log

- 2026-07-05 — Plan created.
- 2026-07-18 — **P4.1 attribution slice** built + committed (engine + comparison UI). M4 opened early as
  a non-blocked path while M3 live features wait on external credentials/approvals.
