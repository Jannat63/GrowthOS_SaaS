# Audit — Weekly Intelligence Report (`/intelligence`)

**Date:** 2026-08-27 · **Branch:** `shihab-restructure`

Companion to `AUDIT-2026-08-27-growth-hub-design.md`. All 16 findings below are fixed.

## Framing

This is the only screen in the product that is also a **deliverable**: the same `WeeklyReport`
object renders here and into the white-labelled customer PDF (`apps/api/src/pdf-report.ts`). It
serves the operator deciding this week's moves and the client receiving the PDF, and it was built
as neither — a document's framing with no period, no comparison and no arc, over a dashboard's card
grid with none of the density the Growth Hub had just gained.

The rebuild lays it out as an issue of something: masthead → verdict → numbers → the move →
evidence → what's next.

## A. Wrong or misleading

| # | Finding | Fix |
|---|---------|-----|
| I-01 | The header printed `weekStart` (a calendar week) above figures the query measured from `max(date)`. On any seeded or lagging workspace those are weeks apart — the screenshot said "week of 2026-08-21" over data ending 2026-07-17. | `weekStart` stays the archive's idempotency key; the measured window travels separately as `report.period` and is what the masthead and PDF print. Window now resolved through `resolveWindow`/`getDataBounds` like every other surface. |
| I-02 | "Blended ROAS" was ad-attributed revenue over ad spend, so this page and the Growth Hub reported the same week differently by exactly `REVENUE_FACTOR` (2.2) — the constant `analytics.ts` exports *specifically* so that cannot happen. The wrong figure was the one in the customer's PDF. | Two named figures: `blendedMer` (all revenue ÷ ad spend, matching /analytics and the hub) and `paidRoas` (ad-attributed only). Per-channel ROAS stays on raw `conversion_value`; scaling it would have inflated every row. |
| I-03 | `channelPerformance()` queried only `ad_performance`, so a report whose subtitle says "cross-channel" shipped a two-row, paid-only table on a three-channel product. | An `organic` row from the blended-revenue remainder plus real `organic_traffic` clicks, flagged `modelled` and marked as an estimate on screen and in the PDF. |
| I-04 | The ROAS badge was `roas >= blendedRoas` — ember meant "above this week's own average", which every reader parses as "good". A 1.30x channel against a 1.25x blend read as healthy while barely clearing break-even. | Badge encodes profitability against break-even (1.00x), the one threshold that means the same thing for every business, with the movement shown separately as a ROAS delta. |

## B. Data that existed and went unused

| # | Finding | Fix |
|---|---------|-----|
| I-05 | A *weekly* report with no previous week — every figure a lone point, though `previousWindow()` already existed. | Every headline figure and every channel ROAS now carries the same figure from the preceding equal-length window. Suppressed when the prior window predates the workspace's first day of data, so "no prior week" never renders as "−100%". |
| I-06 | `ad_performance` carries `conversions`; the table showed spend/revenue/ROAS only. | Conversions and CPA per channel. |
| I-07 | Opportunities were mapped down to `{title, body}`, dropping `id`, `type`, `compositeScore` and the channel pair — three unclickable, unranked, identical cards. | The full recommendation travels. Cards link to the module that works them (same routing as the Growth Hub), and show the bridge and the priority the queue is actually ordered by. |
| I-08 | `intelligence_reports` has held one row per week since P3.4 and nothing ever read it back. | `GET /intelligence/reports` (the index) and `?week=` on the report route, serving an archived week **verbatim** rather than recomputing it. A week-stepper in the masthead, rendered only when the archive holds more than one readable week. Rows written in the pre-audit shape are filtered out rather than migrated — the report is derived data. |

## C. Structure and copy

| # | Finding | Fix |
|---|---------|-----|
| I-09 | The summary's first line restated revenue, spend and ROAS — all three already rendered as tiles ~40px above — and formatted money with cents while the tiles used none. | A one-sentence `headline` states the *direction* of efficiency; the summary carries only what the tiles cannot (WoW movement, channel ranking, organic share). Both use whole dollars. |
| I-10 | The budget move stated an amount from nowhere and offered nothing to do about it. | `BudgetReallocation.basis` carries the rule that produced the figure ("15% of the Meta Ads budget for this period"), and the card links to the queue. |
| I-11 | Six containers of near-identical weight, with the actions last and below the fold. | Verdict → numbers → summary → the move → breakdown → next up, with mono section eyebrows instead of three same-size headings. |
| I-12 | One `h-64` skeleton for the whole page, so arrival was a hard layout jump. | Per-region skeletons matching the real layout. |

## D. Visual

| # | Finding | Fix |
|---|---------|-----|
| I-13 | Metric cards ~110px tall holding ~40px of content. | Four tiles, each label + value + delta + hint, MER ringed as the lead figure. |
| I-14 | Table columns stranded ~800px apart on a wide screen. | Revenue-share bars in the channel column (using the `--channel-*` tokens), numerics right-aligned into a tight cluster. |
| I-15 | The only action was a low-emphasis outline button whose error message shifted the layout. | Controls grouped in the masthead; the error reserves its own line. |
| I-16 | `LoopMasthead.tsx` was fully built and imported nowhere — dead since the Growth Hub redesign. | Deleted, along with `CHANNEL_ORDER`, its only remaining consumer. Recoverable from git; the channel breakdown conveys the same information more precisely than an orbit diagram would. |

## Deliberate non-changes

- **The Growth Hub colours an ad-spend increase green.** The PDF and this page render spend
  movement as neutral instead — a cost is only readable against what it returned, which is what the
  MER figure beside it says. The hub was left alone rather than changed as a side effect of this
  work.
- **`REVENUE_FACTOR` itself.** Organic revenue here is modelled on the app-wide stand-in, not
  measured. The fix was to make the estimate consistent and labelled, not to invent a better one —
  that needs real Shopify data (M3).

## Verification

`pnpm typecheck` 9/9 · `@growthos/logic` 234 tests · `@growthos/web` 24 tests ·
`@growthos/api` pdf-report 12 + scheduler 4 · `next build` clean, channel-bar and mono utilities
confirmed in the emitted CSS · report engine executed end-to-end against the mock inputs.

**Not run:** `apps/api/src/intelligence.test.ts` and the other ClickHouse-backed suites — Docker was
stopped for the duration. The two new queries were written to avoid aliasing an aggregate to its
source column (`spendTotal`, not `spend`), which is the failure mode that bit `AS date` in
`growth-hub.ts` and passes typecheck silently. They still need one run against a live ClickHouse.

`pnpm lint` fails on `@growthos/web` because `apps/web` has no ESLint config and `next lint` drops
into an interactive setup prompt. Pre-existing, untouched here.
