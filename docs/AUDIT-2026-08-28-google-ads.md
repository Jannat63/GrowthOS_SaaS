# Audit — Google Ads (`/google-ads`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure`

Eighth in the series. All 5 findings below are fixed. Two of them also land on `/meta-ads`, which
shares the same insights panel.

## Framing

Three tools on one page: campaign efficiency with wasted-spend detection, a unit-economics planner,
and an RSA copy generator. The page is in better shape than most of the ones audited before it —
the wasted-spend panel is honest, CPA correctly reads "—" at zero conversions, and the campaign
verdicts are stated with their reasons.

The two real defects are both arithmetic that contradicts itself on screen.

## Findings

| # | Finding | Fix |
|---|---------|-----|
| G-01 | **The budget planner shipped with self-contradictory defaults.** Margin, price and cost of goods were three independent inputs, defaulting to 50 / 120 / 48 — but 120 − 48 is **72**, not 50. The two output tiles then answered from different definitions of the same fact: `calculateTargetCpa` reads the typed margin, `calculateMinimumRoas` derives its own from price − cost. Target CPA said the margin was $50 while Minimum ROAS said $72, side by side, with no way to reconcile them. | Margin is derived from price − cost and shown as a computed figure, not an input. Both targets now come from one consistent set of facts, and a cost at or above the price says so instead of silently producing a zero. |
| G-02 | **"Blended ROAS" on a single-channel page.** `summary.blendedRoas` is one channel's revenue over one channel's spend. "Blended" already means something specific and different here — the Intelligence report's `blendedMer` is *all* revenue over ad spend, and the two figures differ by `REVENUE_FACTOR`. That is precisely the collision audit I-02 was about, reintroduced under the same word. The panel is shared, so this was wrong on **both** the Google Ads and Meta Ads pages. | Relabelled "Account ROAS", which is accurate for either channel. The engine field is left alone — the defect was in what the screen called it. |
| G-03 | **Page copy written from the system's side of the screen.** "Campaign efficiency, wasted-spend detection, and ad copy — all deterministic, no AI." and "…within Google's character limits, no AI required." describe the implementation, not what the reader gets. D4 requires that nothing *claim* an LLM writes the copy — a requirement met by not mentioning one, not by advertising its absence. | Rewritten to what the reader gets: where the budget is working, where it is being wasted, and the numbers the targets should hit. |
| G-04 | The margin input accepted a value with no relationship to the price and cost beside it, so the form could be left permanently inconsistent. | Removed as an input; the inconsistency is no longer expressible. |
| G-05 | `Product margin ($)` sat in a three-up grid with price and cost, giving equal weight to a derived figure and two real inputs. | Two inputs above, the derived margin below them as a result. |

## Deliberate non-changes

- **`blendedRoas` as an engine field name.** Renaming it touches `google-ads-advisor`, its tests,
  the API and Meta Ads for no behavioural gain. The label is what a user reads, and the label is
  what was wrong. A comment at the call site records why the two must not be conflated.
- **The wasted-spend figures.** `$641` for a campaign with zero conversions is its whole spend;
  `$123` against a `$410` campaign is the portion attributed to a low quality score. Both are
  correct; the panel could state that the second is partial, but that is a copy improvement rather
  than a defect and the numbers are not wrong.
- **The RSA generator and campaign table.** No defects found.

## Verification

`typecheck` OK for types / logic / api / web · `next build` 38/38 routes, `/google-ads` and
`/meta-ads` both compiling · the arithmetic checked by hand against the screenshot: campaign spends
1,821 + 1,610 + 2,410 + 641 + 410 = 6,892, matching the Total spend tile.

**Not run:** the `@growthos/api` suite — Docker-backed suites remain stopped at the user's request.
Nothing in this change touches an API route or query; all five fixes are in `apps/web`.
