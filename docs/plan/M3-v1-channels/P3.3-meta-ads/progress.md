# P3.3 — Meta Ads Module — Progress

Status: [~]  ·  Updated: 2026-07-18  ·  **In progress** — advisor + full-funnel + copy/UGC slice done
(non-blocked, deterministic). Live campaign sync/publish + CAPI/EMQ gated on **Meta App Review**.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| Creative fatigue monitor | [x] | Shipped in M2 P2.5 (`/fatigue-monitor`, creative_performance). |
| Advisor + full-funnel planner + ad-copy/UGC studio | [x] | Pure `@growthos/logic` engine; `/meta-ads` page. |
| Audience overlap / CAPI wizard / EMQ | [ ] | **Gated** — needs the Meta Marketing API (App Review). |
| Campaign builder + live push | [ ] | **Gated** on Meta App Review. |

## Advisor slice — what shipped (commit `5a2d0a6`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| logic | `engines/meta-ads-advisor.ts` — `calculateFunnelBudgetSplit`, `buildFullFunnelPlan`, `generateAdCopyVariants`, `generateUGCScript` (ported from legacy `meta-ads-service/features.ts`) + `metaCampaigns` fixture | 4 ✓ |
| API | `apps/api/src/meta-ads.ts` — `getMetaCampaignInsights` reuses the shared campaign advisor over ClickHouse ad_performance (meta_ads); route `GET .../meta-ads/campaigns` | — |
| Web | `/meta-ads` (shared `CampaignInsightsPanel` + `FunnelPlanner` + `AdCopyStudio`); `useMetaCampaignInsights` (liveOrMock over fixture); sidebar live | build ✓ |

**DRY refactor:** extracted `components/ads/CampaignInsightsPanel` (tiles + wasted-spend + campaign
table) shared by Google Ads + Meta — the campaign math is channel-agnostic (same advisor engine).

**Why non-blocked:** campaign analysis is deterministic math over ad_performance we already seed; the
funnel planner + ad-copy/UGC studio are fully client-side templating (no LLM). Only live sync/publish +
CAPI/EMQ need the Meta Marketing API, which is gated on App Review.

## Verification
`pnpm --filter @growthos/logic test` — 74 pass (incl. 4 new). API + web typecheck clean (9/9); web build
passes, `/meta-ads` route emitted.

## Log
- 2026-07-18 — Advisor + funnel/copy slice built + committed. P3.3 opened.
