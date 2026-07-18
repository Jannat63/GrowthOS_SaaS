# P3.2 — Google Ads Module — Progress

Status: [~]  ·  Updated: 2026-07-18  ·  **In progress** — advisor + RSA slice done (non-blocked,
deterministic). Live campaign fetch/push gated on the Google Ads **developer token**.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| Advisor + wasted-spend + RSA generator | [x] | Pure `@growthos/logic` engine over ClickHouse ad_performance; `/google-ads` page. |
| tCPA / tROAS + budget allocator | [ ] | Also pure logic (in legacy features.py) — buildable now; next. |
| Quality Score history | [ ] | Needs the Google Ads API (dev token). |
| Campaign builder + live push | [ ] | **Gated** on the Google Ads developer token. |

## Advisor slice — what shipped (commit `4032cd9`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| logic | `engines/google-ads-advisor.ts` — `analyzeCampaigns`, `detectWastedSpend`, `summarizeCampaigns`, `generateRsaHeadlines/Descriptions` (ported from legacy `features.py`) + `adCampaigns` fixture | 6 ✓ |
| API | `apps/api/src/google-ads.ts` — `getCampaignInsights` over ClickHouse ad_performance; route `GET .../google-ads/campaigns` | — |
| Web | `/google-ads` (summary tiles, wasted-spend panel, campaigns table + status/recommendation) + client-side RSA generator; `useCampaignInsights` (liveOrMock over fixture); sidebar live | build ✓ |

**Why non-blocked:** the advisor is deterministic math over ad_performance data we already seed — no
Google Ads API call. The RSA generator is fully client-side (templating, no LLM). Only the *live campaign
fetch + push* needs the developer token, and that's deferred.

**Design:** the engine is the single source of truth — the API runs it server-side over ClickHouse; the
web mock runs the SAME engine over the SAME `adCampaigns` fixture, so live and offline agree.

## Verification
`pnpm --filter @growthos/logic test` — 68 pass (incl. 6 new). API + web typecheck clean (9/9); web build
passes, `/google-ads` route emitted (~6.7 kB). The RSA generator + advisor render with no backend (mock).

## Log
- 2026-07-18 — Advisor + RSA slice built + committed. P3.2 opened.
