# P3.1 — SEO Module — Progress

Status: [~]  ·  Updated: 2026-07-18  ·  **In progress** — GSC-fed rank-tracker slice done; DataForSEO
features (keyword research, site audit, clustering) gated on the paid key.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| Rank tracker (GSC-fed) | [x] | Keyword positions from ClickHouse `keyword_rankings`; `/seo` page. Seeded until live GSC. |
| Organic traffic view | [ ] | From `organic_traffic` (GSC page dimension). Buildable now. |
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

## Log
- 2026-07-18 — Rank-tracker slice built + committed. P3.1 opened.
