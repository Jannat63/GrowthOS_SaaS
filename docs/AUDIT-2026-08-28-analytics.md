# Audit — Analytics / Blended MER (`/analytics`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure` · **Base:** `cb49e83`

Ninth page in the series. The screenshot that prompted it showed a "MER trend" chart drawn as a
perfectly horizontal line, a week-over-week tile reading 0%, and about 40% of the viewport empty
below the fold.

## A. The offline product was a different product

| # | Finding | Fix |
|---|---------|-----|
| A-01 | **The trend chart could not show a trend.** `mockMer` used the API seed's base constants with every variance factor removed — `googleSpend = 45.5`, `metaSpend = 90.25`, `revenue = (320 + 210) * 2.2`, identical every day — so MER was 8.59× on every point, on every render, forever. | The mock mirrors `seedRows()`: weekend spend dip, sinusoidal revenue swing, the drift term, and the same per-day `day` index within the full seed window. |
| A-02 | **The week-over-week figure was a literal.** `anomaly: { detected: false, changePercent: 0 }` was hardcoded, so the card read "0% — within normal range" regardless of the data. | Computed with the same last-7-vs-prior-7 average the API runs. |
| A-03 | **Live and offline disagreed by 219% on the headline number.** Measured over the same window: live `27.43×` swinging `21.59×–39.31×` across 29 distinct values; offline `8.59×` flat, 1 distinct value. Total spend `$3,831.50` vs `$4,072.50`. Connecting a backend more than tripled the page's headline figure with no visible cause. | Both sides now agree; `mer.test.ts` pins it. |
| A-04 | **Presets anchored on the wrong end of the window.** The mock counted *forward* from a hardcoded `2026-06-18`, which only lined up for a 30-day request. 7 days showed the wrong week; 90 days generated dates through 2026-09-15, two months past `SEED_LAST_DAY`. | Anchored on the last seeded day and walked backwards, mirroring `resolveWindow`. An explicit range is honoured. |

This is defect pattern 6 from the knowledge note — *offline fallback that is a different product from
live* — and the sharpest instance found so far. `liveOrMock` promises the same shape **and the same
content**.

## B. Data computed, carried, and never rendered

| # | Finding | Fix |
|---|---------|-----|
| B-01 | **`MerTrendPoint.revenue` and `.spend` were never displayed.** Both are computed on the API and in the mock, typed, and returned on every point. The chart plotted only `mer`. A ratio cannot say whether it rose because revenue climbed or because spend was cut — opposite situations needing opposite responses. | A second card, *What the ratio is made of*, plots both. |
| B-02 | The anomaly card stated a percentage with neither operand. | The hero shows `29.21× → 29.33× avg, prior 7d vs last 7d`, derived from the returned trend by the same formula, so the two cannot disagree. Same rule as the creative scorecard's bands. |

**What this immediately surfaced:** MER spikes align with the **weekend spend dips**, not with revenue
moves — revenue is near-flat while spend drops ~30%, so the ratio jumps. The old page could not show
this at all.

## C. Colour and formatting

| # | Finding | Fix |
|---|---------|-----|
| C-01 | An intermediate pass moved the MER series off `--primary` to `--foreground`, reasoning that `BrandingProvider` repaints the token per workspace. **That was wrong here and was reverted.** The Growth Hub already draws this exact series in ember (`growth-hub/page.tsx`, `text-primary` + `currentColor`), so the same metric was ember on one page and white on another. | MER keeps ember. The white-label caveat that moved `OrganicTraffic` off `--primary` does not transfer: that series shares a plot and had to stay distinguishable from its neighbours, whereas MER is alone in its chart — and a workspace that re-brands wants its colour on its headline number. |
| C-02 | **The channel bars used the wrong tokens entirely** — Google was `bg-primary` (the action colour) and Meta was `bg-success` (which means "healthy"). Neither said which channel it was, and both channel tokens already existed. | `--channel-google` and `--channel-meta`. This is the correct use of channel colour: telling two channels apart, side by side. |
| C-03 | **Three money precisions on one card.** `$4,072.5` (`toLocaleString()` on a `.5`), above `$1365` and `$2708` (`Math.round`) — and the rounded parts summed to `$4,073`, disagreeing with the total printed above them. Both come from the same two numbers. | One `usd()` formatter, whole dollars. |

**Module colour rule, now stated in the code:** ember is blended MER itself (the flagship metric, and
what the Growth Hub already uses for it); channel tokens are the Google/Meta split, which must stay
distinguishable from each other and from whatever a tenant repaints `--primary` to; neutral is a
supporting aggregate — revenue, which sits beside channel-coloured spend. No new hues were added.

## D. Chart form

| # | Finding | Fix |
|---|---------|-----|
| D-01 | The y-axis was anchored at 0 while MER runs 21×–39×, so more than half the plot was empty and a 1.8× swing was squashed into the top third — a series that genuinely moves, drawn as though it did not. | Domain fits the data. The 3× floor is drawn only when the series comes near it; otherwise it is stated in the card's subtitle with the window's lowest day, so the benchmark is never silently dropped. |
| D-02 | Revenue and spend are both dollars, so one plot looked defensible — but at a 27× ratio the spend bars rendered about two pixels tall against a $6k revenue axis and were effectively absent. A second y-axis would be worse: two scales slid against each other can be made to tell any story. | Small multiples — two panels, own scales, shared date axis, linked tooltips via `syncId`. The reader compares shape and timing. |
| D-03 | Three equal KPI cards gave the ratio, its denominator and its delta the same weight. | One hero carrying the verdict and its movement; the components sit beside it. |
| D-04 | The revenue axis printed **"$2k" on two different gridlines** — `Math.round(v / 1000)` collapsed 1,500 and 2,000 to the same label, so two ticks claimed the same value. Only visible once the seed fix brought revenue into the $1–2k band. | One decimal with a bare `.0` trimmed: `$500 · $1k · $1.5k · $2k`. |

## E. Seed calibration

**The drift terms were per-day constants applied over a window that grew six times.** `revFactor`
carried `day * 0.012` and `convOf` carried `day * 0.008`; `day` indexes the full seed, so when
`SEED_DAYS` became 180 revenue inflated ~216% across the window while spend has no drift at all.
Blended MER therefore climbed the further into the window you looked, and any future widening would
have inflated it again — the same silent-on-widening hazard `seed-window.ts` already documents for
its 2× invariant.

Both are now expressed as a fraction of the window via `drift(day, totalOverWindow)`:

| | first 30d | last 30d | conversions/day, first → last |
|---|---|---|---|
| before — `day * 0.012` / `day * 0.008` | 10.85× | **27.43×** | 11.5 → 23.1 |
| after — `drift(day, 0.36)` / `drift(day, 0.24)` | 9.53× | **12.42×** | 10.5 → 12.1 |

**The reason the drift exists is preserved.** It was added so period-over-period deltas are non-zero
(a flat 6/4 conversions made the Growth Hub tile report a permanent 0%). At the new values a 30-day
window still moves +4.4% on revenue and +5.8% on conversions, so every trend indicator still renders.

### Still open — a product-data decision, not a bug

Even with the drift corrected, MER sits near **12×**, because the base is `(320 + 210) × 2.2 = $1,166`
revenue against `45.5 + 90.25 = $135.75` spend — 8.59× before any variance. Reaching a conventional
3–6× means retuning `conversion_value` or `spend`, which also moves ROAS on the Google Ads and Meta
Ads pages, the Growth Hub revenue tiles, the weekly PDF and the intelligence report. Left alone
deliberately: it is a judgement about what the demo data should represent, and the `@growthos/api`
suite that would catch fallout only asserts `> 0` and cannot be run while Docker is stopped.

**A knock-on worth noting:** `calculateBlendedMER`'s top band is `>= 4 → "Excellent efficiency"`, so
any workspace above 4× gets that same sentence forever — the "headline that never moves reads as
broken" problem `seedRows` already fixed for conversions, at the interpretation layer. The redesign
routes around it by leading with movement rather than the verdict; the bands are untouched.

## Verification

- `typecheck` OK for all six packages, run per-package.
- `@growthos/logic` **259** tests · `@growthos/web` **72** (from 61; +11 in `lib/mock-data/mer.test.ts`).
- `next build` **38/38** routes.
- Emitted CSS confirmed to carry `bg-channel-google`, `bg-channel-meta` and `bg-foreground` — grepped
  with the fixed-width form, after the escaped-selector grep silently returned nothing for the third
  time this session.
- Ember confirmed on the series from the DOM rather than a screenshot: `.recharts-area-curve`
  computed stroke is `rgb(255, 107, 65)` — `--primary` in dark. Revenue axis ticks read
  `$500 / $1k / $1.5k / $2k`, four distinct labels.
- Page rendered and screenshotted at native resolution down the `liveOrMock` offline path; both
  charts verified in the DOM (`.recharts-area-curve` computed stroke and bbox) after a downscaled
  full-page capture made the 2px stroke look absent. Only console error is the WebSocket failing
  auth, expected without a session.

**Not run:** the `@growthos/api` suite — Docker-backed suites remain stopped. This change *does* touch
one API file (`analytics.ts`, the seed drift), so that is unverified against a live database. The
change is confined to two arithmetic terms inside `seedRows`; its effect was modelled numerically
before applying, and the same arithmetic is mirrored and tested in `apps/web/lib/mock-data/mer.ts`.
Existing API assertions on this path only check `> 0`, so they would not have caught a regression
either way.

## Known duplication

`apps/web/lib/mock-data/mer.ts` re-implements `seedRows()` and its constants because `apps/web`
cannot import from `apps/api`. `mer.test.ts` pins the relationship so a drift fails a test rather
than quietly producing a different offline product — but the real fix is a shared seed module, which
would touch the API and is not attempted here.
