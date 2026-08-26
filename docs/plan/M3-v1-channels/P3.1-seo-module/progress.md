# P3.1 — SEO Module — Progress

Status: [~]  ·  Updated: 2026-08-27  ·  **In progress** — GSC-fed rank-tracker, organic-traffic and
**keyword-clustering** slices done. Keyword research is gated on the paid DataForSEO key; site audit
is free and still buildable.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| Rank tracker (GSC-fed) | [x] | Keyword positions from ClickHouse `keyword_rankings`; `/seo` Rank tracker tab. Seeded until live GSC. |
| Organic traffic view | [x] | Per-page clicks/impr/CTR/position + daily trend from `organic_traffic`; `/seo` Organic traffic tab. |
| Keyword research | [ ] | **DataForSEO (paid)** — gated on the key. |
| Site audit + Core Web Vitals | [ ] | Crawler port + PageSpeed (free). Buildable; larger. |
| Keyword clustering | [x] | **Done 2026-08-27.** `clusterKeywords` in `@growthos/logic` (Jaccard over tokenised word sets), `getKeywordClusters` over the same `keyword_rankings` data, `GET .../seo/clusters`, and a Clusters tab on `/seo`. ~~pgvector~~ — the label was wrong: no embeddings and no vector column, so it was free and buildable all along. 16 engine tests + 1 API test. |

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
- 2026-08-20 — **Keyword clustering slice designed** (`plan.md`). Corrected a wrong dependency carried
  in both this file and `PROGRESS.md`: clustering was recorded as needing Neon pgvector and a
  `vector(1536)` column, which would imply an embedding model and therefore a paid API. The legacy
  implementation uses Jaccard similarity over tokenised word sets — no embeddings at all. Also
  recorded the honest limit of the free approach (lexical similarity cannot see intent that only
  appears in SERPs) and shaped the engine so a SERP-validation pass can be added when DataForSEO
  lands, rather than pretending the free layer is the whole answer.
- 2026-08-27 — **Keyword clustering slice built.** Engine at
  `packages/logic/src/engines/keyword-clustering.ts`, adapter `getKeywordClusters` in
  `apps/api/src/seo.ts`, route `GET /workspaces/:id/seo/clusters`, and a Clusters tab on `/seo`. The
  web mock runs the identical engine over the identical fixture the Rank tracker renders
  (`mockRankings` is now exported for exactly that), so mock mode shows the real grouping rather
  than a hand-written impression of one.

  Both determinism fixes from the design landed: seeds are chosen by descending significant-token
  count then alphabetically (legacy seeded from input order, so shuffling the same keyword set
  produced different clusters), and naming ties break on frequency → length → alphabetical (legacy
  used Python `max()`, which resolves ties by insertion order).

  **A third defect turned up only by running it on the shipped seed keywords: cluster names were not
  unique.** "best office chair for back pain" + "office chair lumbar support" and the singleton
  "home office ideas" were both named **Office** — unreadable side by side in the UI, and useless as
  an identifier. Names are now de-duplicated by widening to the next-most-common token ("Office" and
  "Office ideas") rather than by a numeric suffix. Worth noting that neither the unit tests nor the
  design caught this; looking at the real output did.

  **The default threshold was deliberately NOT tuned.** On the 8 seed keywords, 0.3 yields one real
  cluster and 6 singletons, and lowering it to 0.2 makes the page look busier by merging all three
  `desk` keywords. That is the algorithm honestly reporting that a small, topically-diverse keyword
  set has few neighbours — the fixture exercises the rank tracker, not clustering — and lowering a
  threshold so a demo looks better is how a made-up number ends up on a customer's screen. The UI
  handles it instead: singletons collapse into one "Ungrouped" card rather than six identical
  one-item cards implying groupings that are not there.
