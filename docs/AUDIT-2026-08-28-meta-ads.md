# Audit — Meta Ads (`/meta-ads`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure` · **Base:** `1b46da5`

Tenth page in the series, and the one that finally forced the root cause of a defect the previous
nine kept finding one instance at a time.

Two of the findings below also land on `/google-ads`, which shares the campaign panel; the seed fix
lands on both, and on `/automation`, which reads the same campaign query.

## A. The offline product was a different product — and this time the seed was the one that was wrong

| # | Finding | Fix |
|---|---------|-----|
| A-01 | **Live returned one campaign; offline returned four.** `seedRows()` wrote exactly one campaign per platform — `g-1` "Search - Brand" and `m-1` "Prospecting - Lookalike" — while both ads pages fell back to `analyzeCampaigns(metaCampaigns)`, the four-campaign fixture roster. The page's central table had four rows offline and one row live. | The seed writes the roster. |
| A-02 | **The wasted-spend panel existed only offline.** With a single campaign there was nothing to compare, `detectWastedSpend` returned nothing, and the red panel — plus the "Wasted campaigns" tile — simply were not on the live page. | Both sides now surface `Advantage+ - Broad` at a 0.14% conversion rate. |
| A-03 | Measured over the same account: offline **$5,691** at **2.44×** across 4 campaigns; live **$14,950** at **3.05×** across 1. Connecting a backend replaced the page's subject, not just its numbers. | Identical on both sides, by construction. |

**The root cause, and why it is fixed properly this time.** The seed generator existed in three
places — `apps/api/src/analytics.ts` (what ClickHouse gets), `apps/web/lib/mock-data/mer.ts` (a
hand-copy, because `apps/web` cannot import from `apps/api`), and the fixture rosters the ads pages
used instead. The analytics audit flagged that duplication as known-and-unfixed on the grounds that
the real fix would touch the API. It had to be touched anyway.

The generator now lives in **`packages/logic/src/fixtures/seed.ts`**, which both sides import. It is
pure, so unlike the API-side original it is covered by a suite that runs with no infrastructure.

### The split preserves every daily total exactly

Blended MER, the Growth Hub tiles, the weekly report and the intelligence report all read
`sum(...)` across campaigns. Splitting one campaign into five must not move any of them, so the
day's platform totals are unchanged and only divided:

- Shares come from the fixture rosters' own figures — the fixtures state one window's totals for a
  demo account while the seed states a per-day budget over 180 days, and the two cannot both be
  literal. Taking the shares keeps what the rosters were written to express.
- Allocation rounds **cumulative** boundaries, not each day independently. Meta seeds four to six
  conversions a day across four campaigns; rounding four fractional shares independently loses or
  invents a conversion on almost every day, and a campaign holding 1.3% of conversions gets under a
  tenth of one per day and would round to zero *forever* — handing the smallest campaign a permanent
  "zero conversions despite significant clicks" verdict its own share does not support.
- `seed.test.ts` asserts the preservation date by date and platform by platform, rather than
  trusting it. **Last-30-day MER stays at 12.42×**, where the previous commit's calibration left it.

### Self-healing across a shape change

`missingSeedDates` heals a widened *window* but not a changed *shape*: a workspace seeded before the
split has a row for every date, so nothing reads as missing and it would keep its single campaign
forever. `ensureAdPerformanceSeed` now prunes `g-1` / `m-1` by id and re-seeds — **by id, and only
those two ids**, because a general "delete campaigns the roster doesn't know" sweep would delete a
customer's real campaigns the moment a live sync lands. The delete runs with `mutations_sync = 2`;
without it the mutation is queued, the backfill check still sees the old rows, and the workspace is
left with no ad data at all — strictly worse than the stale shape.

## B. No window at all

| # | Finding | Fix |
|---|---------|-----|
| B-01 | **Both campaign queries ran with no date filter**, summing all 180 seeded days, on pages that offered no date control and stated no period. "Total spend $14,950" was an all-time figure one nav item from an Analytics page reporting the same account's spend over 30 days, with nothing on either screen to reconcile them. This is the SEO module's `OrganicTrafficResponse.period` defect, in a different module. | `?from`/`?to`/`?days` like every other data route; the resolved window travels back in `period` and is printed under the headline ("30 days to Jul 17"); both pages get the shared `DateRangePicker`. |
| B-02 | **The automation planner evaluated rules over all of history.** It calls the same query, so a campaign fixed two months ago could still be proposed for a pause on the strength of figures nobody can see on screen. | Defaults to the same 30-day window the dashboard shows. An automation acting on data the dashboard does not display cannot be explained to the person approving it. |

## C. Computed, carried, never rendered

| # | Finding | Fix |
|---|---------|-----|
| C-01 | `CampaignSummary.totalConversions` and `.blendedCpa` are computed, typed and returned on every request, and were never displayed. The four tiles instead spent two of their four slots on bare counts — "Wasted campaigns 1", "Scale opportunities 1" — where the decision turns on an amount of money. | Conversions and cost per conversion are shown; the counts are replaced by the spend they represent. |
| C-02 | `CampaignInsight.conversionRate` — same: computed per campaign since the engine was written, never shown. | A CVR column. |
| C-03 | **`conversionRate` was rounded to two decimal places as a RATIO**, so every campaign under half a percent reported exactly `0.00%`. `detectWastedSpend` computes its own unrounded rate, so the panel printed "Very low conversion rate (0.14%)" directly above a table that would have said 0.00% for the same campaign. It also made `cross-channel-engine`'s `>= 0.05` filter a whole-percent test, and its `(rate * 100).toFixed(1)` message could never print anything but a trailing `.0`. | `round4` — two decimals as a percentage. |

## D. The page — first pass

| # | Finding | Fix |
|---|---------|-----|
| D-01 | Four equal tiles gave the return, its denominator and two tallies the same weight. | One hero: Account ROAS in ember with both operands beside it (`$2,547 spent → $8,568 returned`), and the advisor's own thresholds stated so the verdicts can be checked rather than trusted. |
| D-02 | Total spend was a single number with no account of itself. | **Where the budget went** — the same total partitioned by verdict, `$1,486 scale / $752 healthy / $309 wasted`. Status colours used for status, which is the one job they are reserved for. |
| D-03 | **The funnel stages were `bg-primary`, `bg-success` and `bg-ink`** — the action colour a workspace repaints for white-labelling, the colour that means "healthy", and the near-black rail surface. None says anything about a funnel stage, and two were actively wrong: `--success` is byte-identical to `--channel-seo` in dark, so the middle of a *Meta* funnel was drawn in the SEO channel's colour, and `--ink` is `#05080b` against a `#141b24` card — a dot you cannot see. | Cold → Warm → Hot is an ordered scale, not three categories, so it gets one hue at three strengths. The direction is the funnel's own vocabulary, and it stays coherent under any tenant `--primary` because all three move together. |
| D-04 | **Two "Product" inputs on one page**, defaulting to "Ergonomic Office Chair" in the planner and "Ergonomic Chair" in the copy studio — one fact, two controls, disagreeing out of the box. This is finding G-01's shape from the Google Ads audit. | One field. |
| D-05 | The planner's budget defaulted to a hardcoded **$5,000** while the account's real spend sat in a tile directly above it. | Defaults to the account's monthly run-rate, derived from the window. Typing overrides it and the typed value stays. |
| D-06 | Page copy written from the system's side — "all deterministic, no AI" — which is the copy finding G-03 removed from Google Ads and did not remove here. D4 requires that nothing *claim* an LLM writes the copy; that is met by not mentioning one, not by advertising its absence. The footer note ("Live campaign sync arrives once your Meta app clears App Review") was a roadmap statement in a product surface, duplicating what `DataSourceBadge` already says properly. | Rewritten to what the reader gets. Footer note removed. |

## E. The bottom half — second pass

Reviewed on screen after the first pass, the half below the campaign table still did not explain
itself: *"it seems like a user may not understand this properly."* That was right, and the reasons
were specific.

| # | Finding | Fix |
|---|---------|-----|
| E-01 | **The section was three acronyms and a number.** `TOFU` / `MOFU` / `BOFU` appeared with no gloss anywhere on the page. They are trade jargon; a reader who does not already work in them learns nothing from a page that only prints them. | Each row leads with the plain-English temperature — **Cold / Warm / Hot** — with the acronym kept beside it for anyone who does use those terms daily, and a line saying who those people actually are ("Know you, haven't bought"). |
| E-02 | **The temperature was smuggled inside a display string.** `buildFullFunnelPlan` returned `audience: "Cold — Interest-based targeting for X"`, so the only way to show the temperature on its own was to split the sentence apart in the view, and the only way to show the targeting was to show the temperature with it. | `FunnelStage.temperature` is its own field and `audience` is the targeting alone. Pinned by a test that the prefix is gone. |
| E-03 | **The same number was drawn twice, three times over.** Every stage carried its own progress bar next to its own percentage, and the three bars never appeared against each other — which is the only thing a reader wants from a *split*. | One stacked bar above the rows. The three per-row bars are gone. |
| E-04 | **"Plan the next month" was an orphan** — a floating heading with a "Product" field pushed to the far right of an empty row, above two cards with no stated relationship to each other or to it. | A named section that says what it is for, with the shared field directly under the sentence that explains it, in reading order. Each card now opens with its own purpose line ("Split the budget by audience", "Write the ads"). Deliberately **not** numbered `01 / 02`: the two tools are independent — you can write copy without touching the split — so a step marker would assert an order the product does not have. |
| E-05 | **The account-age toggle had no label and no consequence on screen.** Two buttons reading "New account" and "Established", changing the ratios silently. | Labelled "Account age", and the active choice states why it moves the split ("There is no warm or hot audience to retarget yet, so most of the budget has to go to finding people"). |
| E-06 | **`generateAdCopyVariants` shipped broken English.** The template read `"Finally, a {product} that actually works."`, which rendered as **"Finally, a Ergonomic Office Chair that actually works."** — visible in the product, in the first result the page returns. | An `{aProduct}` token and an `article()` helper that picks by sound, not spelling: "an ergonomic chair", but "a unique chair", because a leading "u" is usually pronounced "yu". Documented as a heuristic and applied only to templated ad copy. |

### One click charged twice

`AdCopyStudio` fired **two mutations in parallel** from one Generate button — ad copy (5 creatives)
and a UGC script (1) — against an endpoint that checks the ceiling before doing the work and records
usage after it. Fired together, both checks passed against the same starting balance, so a workspace
with one creative left could be handed six.

Rendering it made the rest of the damage obvious: the run in testing charged five variants, hit the
plan limit on the script, and the page showed a red *"You've reached your starter plan's limit"*
**above five variants that had generated perfectly well** — with nothing saying which half had
failed, and the remaining-allowance line suppressed precisely because an error was set.

| # | Finding | Fix |
|---|---------|-----|
| E-07 | One button, two metered calls, racing each other's quota check. | **Two actions**, each with its own button, pending state and error. The spend is deliberate and every failure is attributable to what caused it. |
| E-08 | Neither call's cost was stated anywhere before or after clicking. | "Uses 5 creatives from your monthly allowance", under the button that charges it. |
| E-09 | `remaining` was read from the first response, computed while the second was still spending — a race — and then hidden entirely whenever an error was set, so the one moment a reader most needs to know how much is left (running out) was the one moment it was not shown. | Always shown. |
| E-10 | **A browser internal was rendered as user-facing copy.** The handler printed `err.message` for any error, so a transport failure put the literal string **"Failed to fetch"** on screen. Only an `ApiError` carries a message written for a person. | `ApiError` messages pass through; anything else gets "Could not reach the server. Check your connection and try again." |

## Deliberate non-changes

- **The base seed ratio.** Meta reads realistically (3.05× account ROAS at 180 days, 3.36× at 30);
  Google reads high at 9–10×, because its base is `320` of value against `45.50` of spend. Retuning
  that moves the Growth Hub tiles, the weekly PDF and the intelligence report, and it is a judgement
  about what the demo data should represent rather than a bug. Unchanged, and still open.
- **The Quality Score branch of `detectWastedSpend` can never fire on live data**, because
  `ad_performance` has no quality-score column — the fixtures carry `qualityScore` but the seed
  cannot store it. Rather than let the mock keep a finding live could not produce, the offline path
  now derives from the seed and drops it too. The branch stays engine-tested. Adding the column is a
  schema migration plus worker work, and is not attempted here.
- **No hover on campaign rows.** They are read-only and carry no per-row control; hover marks rows
  you can act on, and a hover on a row that does nothing is a false affordance. Same call as the
  creative scorecard.
- **No funnel-stage classifier for live campaigns.** Mapping "Retargeting - Cart Abandoners" to BOFU
  is obvious to a reader and not derivable from the data: `ad_performance` has no objective column,
  and name-matching would be invention dressed as measurement. The planner connects to the account
  through its budget instead, which is real.
- **`blendedRoas` as an engine field name.** Still misleading, still not worth renaming through the
  engine, its tests, the API and both pages; the label is what a user reads, and the label says
  "Account ROAS".

## Also retired

`apps/worker/seeds/clickhouse_seed.py` — a third copy of the seed, writing 30 flat days from
2026-07-01 for one campaign per platform. Its window **overlaps** the API's, `ad_performance` is a
plain MergeTree with no de-duplication, and nothing would have reported an error: running it against
an already-seeded workspace silently doubles seventeen days of spend and revenue. It now refuses to
run and says why.

## Verification

- `typecheck` OK for all six packages, run per-package.
- `@growthos/logic` **271** tests (from 259; +10 in `fixtures/seed.test.ts`, +2 in
  `engines/meta-ads-advisor.test.ts`) · `@growthos/web` **80** (from 72; +8 in
  `lib/mock-data/campaigns.test.ts`).
- The 11 existing `mer.test.ts` tests pass unchanged against the rewritten mock — the strongest
  available evidence that the shared generator reproduces the hand-copy it replaced, byte for byte.
- `next build` **38/38** routes.
- Emitted CSS confirmed to carry `bg-primary/30`, `bg-primary/60`, `bg-muted-foreground`,
  `bg-destructive` and `bg-success` — grepped with the fixed-width form, since the escaped-selector
  grep has silently returned nothing four times across this series.
- `/meta-ads` rendered end-to-end down the `liveOrMock` offline path: four campaign rows, CVR column
  reading `1.74 / 1.09 / 4.53 / 0.14%` — the last matching the wasted-spend panel above it, which is
  the contradiction C-03 fixed — budget bar summing to the stated total, and the planner starting at
  the account's $2,547 run-rate.
- `/google-ads` rendered the same way: five campaign rows, one `Wasted` with a High-severity
  zero-conversions finding, spend split 85 / 6 / 9 across the verdicts. Its account ROAS reads
  **10.17×**, which is the base seed ratio noted below and not a regression from this change.

**Not run:** the `@growthos/api` suite — Docker-backed suites remain stopped, so neither the campaign
query's new date filter nor the legacy-shape prune has been exercised against a live database. The
generator they feed from is pure and fully covered in `@growthos/logic`; the untested parts are the
SQL `WHERE` clause and the one-time `ALTER TABLE DELETE`.
