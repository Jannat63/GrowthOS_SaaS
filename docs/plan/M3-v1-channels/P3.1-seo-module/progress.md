# P3.1 — SEO Module — Progress

Status: [~]  ·  Updated: 2026-07-18  ·  **In progress** — GSC-fed rank-tracker + organic-traffic slices
done; DataForSEO features (keyword research, site audit, clustering) gated on the paid key.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| Rank tracker (GSC-fed) | [x] | Keyword positions from ClickHouse `keyword_rankings`; `/seo` Rank tracker tab. Seeded until live GSC. |
| Organic traffic view | [x] | Per-page clicks/impr/CTR/position + daily trend from `organic_traffic`; `/seo` Organic traffic tab. |
| Keyword research | [ ] | **DataForSEO (paid)** — gated on the key. |
| Site audit + Core Web Vitals | [ ] | Crawler port + PageSpeed (free). Buildable; larger. |
| Keyword clustering (pgvector) | [ ] | Neon pgvector — free. Later. |

## Rank tracker — what shipped (commit `210224f`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| API | `apps/api/src/seo.ts` — `ensureKeywordRankingsSeed` + `getKeywordRankings`; route `GET .../seo/rankings` | 1 (ClickHouse) |
| Types | `KeywordRanking`, `KeywordRankingPoint`, `SeoRankingsResponse` | — |
| Web | `/seo` Rank Tracker (summary tiles + keyword table with Δ7d + position sparkline); `useKeywordRankings`; sidebar live | build ✓ |

**Design:** reads the same `keyword_rankings` table P3.0's GSC sync writes to — so the moment a real
Search Console connection syncs, the page shows live rankings with no code change. Until then it seeds a
deterministic 30-day series (generate-if-empty, same pattern as `ensureAdPerformanceSeed`). Position is
"lower is better", so the trend sparkline is inverted (rising line = improving rank).

## Verification
API typecheck clean; `getKeywordRankings` covered by `seo.test.ts` (needs ClickHouse — run with
`docker compose up -d`). `pnpm --filter @growthos/web build` passes; `/seo` route emitted (~4 kB).

## Organic traffic — what shipped (commit `7e15b94`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| API | `seo.ts` — `ensureOrganicTrafficSeed` + `getOrganicTraffic` (per-page clicks/impr/CTR/pos + daily trend); route `GET .../seo/traffic` | 1 (ClickHouse) |
| Types | `OrganicPage`, `OrganicTrafficPoint`, `OrganicTrafficResponse` | — |
| Web | SEO page → **tabs** (Rank tracker \| Organic traffic); `OrganicTraffic` (clicks area chart + pages table), `RankTracker`/`SeoTile` extracted; `useOrganicTraffic` | build ✓ |

**Note:** GSC has no `sessions` (a GA4 metric) → seeded as 0 and not surfaced; the view shows the true
GSC metrics (clicks, impressions, CTR, avg position).

## Log
- 2026-07-18 — Rank-tracker slice built + committed. P3.1 opened.
- 2026-07-18 — Organic-traffic slice built + committed; SEO page split into tabs.
