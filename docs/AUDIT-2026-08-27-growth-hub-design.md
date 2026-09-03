# Growth Hub design audit — 2026-08-27

Scope: `apps/web/app/(dashboard)/growth-hub` and the dashboard shell around it. Fourteen findings,
all fixed in the same pass. Companion to `AUDIT-2026-08-13-codebase.md`.

**The through-line:** the dashboard's problem was never a lack of data. Four of thirteen tested
engines reached the home screen, and the page then clipped or nulled part of what those four
produced. Eleven of the fourteen findings were a rendering decision sitting on top of a value that
already existed in a response the page already fetched.

---

## Data & truth

### F-01 — Every trend delta was structurally invisible · CRITICAL

No period-over-period comparison rendered anywhere on the dashboard. Not a missing feature — a dead
one. `StatTile` rendered `deltaPct`, `useGrowthHub` computed it, the API returned `previous` for all
five metrics. But the seed wrote exactly 30 days while the default window was 30 days, so the
comparison window `(maxDate-60, maxDate-30]` matched **zero rows**: `previous = 0` →
`deltaPct()` returned `null` → the element never rendered. Permanently, for every seeded workspace,
which was every workspace.

The offline fallback (`growthHubMock`) *did* carry previous values, so the mock path showed richer
data than the live one.

**Fixed** in `seed-window.ts` (new): one shared 180-day window for both seeded tables, anchored at
its END so widening it adds history instead of moving "now". 180 because the invariant is
`SEED_DAYS >= 2 x the largest dashboard range` (90). `seed-window.test.ts` now asserts that
invariant, so shortening the seed fails a test instead of silently emptying the comparison window.

The seeders were also made **self-healing**: they asked "does this workspace have ANY rows?", so a
workspace seeded under the old window would have kept it forever and this fix would have changed
nothing for existing workspaces. They now backfill per-missing-date.

Verified end to end against local ClickHouse — revenue +13.5%, conversions +12.7%, organic +13.6%,
ad spend +4.0% at 30d; +70.1% revenue at 90d with 90 sparkline points.

### F-02 — "Impact 90", five times · HIGH

The list *was* correctly ranked (API `.orderBy(desc(compositeScore))`, hook sorts the same way) but
labelled with `impactScore`, a three-value lookup (High/Medium/Low → 90/60/30). The sort key and the
printed key were different numbers, so five high-impact rows all read identically.

**Fixed:** `recReason()` prints the bridge and the score the list is actually ordered by —
`Google Ads → SEO · priority 80`. Uses `channelLabel` from `@growthos/logic`.

### F-03 — No date range on the screen that leads the product · HIGH

`(30d)` was written into four tile labels with no way to change it. `useMer`/`useGrowthHub` were
hardcoded to 30. `/analytics` was the only route with a control, and it kept its own local state
with a different option set (30/60/90).

**Fixed:** `lib/stores/range.ts` + `components/dashboard/RangePicker.tsx` — 7/30/90, shared across
modules so the choice survives navigation. Analytics migrated onto it; tile labels follow the range.
Segmented rather than a free date range on purpose: the comparison is always
period-over-preceding-period, which an arbitrary start/end has no well-defined "previous" for.

### F-04 — The anomaly detector ran and was never rendered · MEDIUM

`getMerTrend` computes last-7-days average MER against the prior 7 and returns
`anomaly: { detected, changePercent }`. It is in the `MerDashboard` type. The hub read `summary` and
`trend` off the same object and ignored it.

**Fixed:** rendered as a tinted chip on the MER tile when `detected`.

### F-05 — The Goal Simulator opened on a tautology · MEDIUM

`targetSessions = target ?? baseline.currentSessions`, so it opened showing a projection identical to
the numbers already on the page — projected conversions equal to actual conversions.

**Fixed:** opens at +25%, presets show pressed state, "Reset" became "Today", and both projections
now carry the uplift against today rather than a bare absolute.

### F-06 — Nothing said how old the numbers were · MEDIUM

Seeded data is anchored weeks in the past and nothing on screen said so.

**Fixed:** `dataThrough` added to `GrowthHubResponse` — deliberately the **earlier** of the paid and
organic maxima, since past that point one pipeline has nothing and a blended figure covering it
would be understated. Rendered as "Data through 17 Jul · N days behind".

---

## Layout & hierarchy

### F-07 — Six of eight tiles were mostly empty · HIGH

~180px of dead space per tile. Grid rows stretch every card to the tallest sibling and `StatTile`
pinned its caption with `mt-auto`; row 1's tallest was the MER tile (sparkline), row 2's was the Goal
Simulator (a form). The plain tiles inherited the height of the most complex object beside them.

**Fixed by adding information, not by shrinking the row:** `GrowthHubDaily` (new) returns a daily
series per metric from one extra grouped query, and every tile now carries value + change +
sparkline. Same content weight, nothing to stretch to.

### F-08 — The clamp cut the only sentence that gave 10.86x a scale · HIGH

`line-clamp-1` truncated "well above healthy **benchmark of 3x**" to "well above healthy…", keeping
the adjective and dropping the figure.

**Fixed:** two lines, plus a `ReferenceLine` at y=3 on the trend chart. The engine named the
benchmark in prose; the chart never drew it.

### F-09 — The bottom row was the top row's breakdown, unlabelled · HIGH

`Open actions 14` at the top; Content 3 + Creative 3 + Fatigue 1 + Cross-channel 7 roughly 1,400px
below. Same fourteen, presented as unrelated sections.

Worse: `Creatives at risk` was `countByType("fatigue_alert")` — the same value as the Fatigue alerts
card — so one number appeared three times (total, breakdown row, and a headline tile that looked
like an independent metric).

**Fixed:** the four counts moved inside a `WorkQueue` panel under the total they sum to. The
duplicate headline tile is gone.

### F-10 — "Not connected x3" was the least prominent thing on the page · HIGH

All three channels read *Not connected* in 12px muted text in the last card, below the fold — the
reason every figure above was invented, ranked beneath an unreal spend number.

**Fixed:** `ChannelStrip` leads the page when nothing is connected (with the action), and stays a
quiet footer once something is. It deliberately does not repeat the sample-data warning —
`SampleDataNotice` says that once already.

### F-11 — Two "Sample data" badges, 130px apart · MEDIUM

`TopBar` and each page header both rendered `DataSourceBadge` for the same platform set.

**Fixed:** TopBar's copy removed; the page-level badge is the useful one because it is scoped to the
module being read.

### F-12 — Two card grammars for one kind of sentence · MEDIUM

KPI tiles and move cards both said *count + label + caption*, in two different layouts, implying a
semantic difference that did not exist. Resolved by F-07 + F-09.

### F-13 — Cross-channel items linked to the page you were on · LOW

Both `MOVES` and `TYPE_HREF` mapped `cross_channel → "/growth-hub"`, so the largest count in the
group was a dead click. Now `/recommendations`.

### F-14 — The "N" disc over Settings was Next's dev indicator, not a layout bug

Moved via `devIndicators: { position: "bottom-right" }` so nobody chases a z-index that is fine.

---

## Two bugs found by running it, not by typechecking it

Both in SQL added during this pass, both invisible to `tsc` and to the existing suites:

1. `SELECT toString(maxDate) AS maxDate` — an output alias shadowing the `WITH ... AS maxDate`
   binding. ClickHouse's analyzer rejects it outright.
2. `SELECT toString(date) AS date … WHERE date > curStart GROUP BY date` — the alias shadowed the
   Date column, so `GROUP BY` resolved to the String while the `WHERE` still compared a Date
   (`NO_COMMON_TYPE`). `getMerTrend` gets away with `AS date` only because it has no date comparison.

Aliases in these queries are now named `lastDate` / `day`.

---

## Still open

Data that exists in a tested engine and still is not on the home screen: attribution (5 models),
search-terms-bridge, google-ads-advisor (wasted spend), meta-ads-advisor, seo-scoring,
keyword-clustering, creative-scorecard, creative-experiments, automation-planner. Creative-fatigue is
still reduced to a single integer.

Also unaddressed: the offline `mockMer` trend is perfectly flat, so the fallback chart is a straight
line and its anomaly is hardcoded `false`.
