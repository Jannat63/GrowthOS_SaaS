# Audit — Creative Fatigue (`/fatigue-monitor`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure`

Sixth in the series. All 12 findings below are fixed.

## Framing

An early-warning board: which Meta creatives are burning out their audience, and which are fine.

Its whole job is to justify a verdict. It was showing three bare numbers — `Freq 4.2  CTR 1.8%  Δ
31%` — beside a badge, with no thresholds on screen, one of the numbers signed backwards, and a
subtitle stating a rule that contradicted the page's own contents.

The rebuild puts each value against the line it is judged on, so a reader can disagree with the
verdict on the evidence. Same standard the `CreativeScorecard` already set on the Creative Queue.

## A. Wrong or misleading

| # | Finding | Fix |
|---|---------|-----|
| CF-01 | **The subtitle stated a rule the page contradicts.** "frequency > 3 **and** CTR down > 20% WoW" describes only the `fatigued` branch. `at-risk` is `(frequency > 3 **or** decline > 20%) and hoursSinceLaunch >= 72`. "Dining Set — Special" sat there marked *At risk* with CTR down **17%** — excluded by the stated rule. | `RULE_TEXT`, generated from the engine's own exported thresholds, states both branches. |
| CF-02 | **`ctrDeclinePercent` was rendered as a signed delta, and its sign is inverted.** It is a *decline*: `+31` means CTR fell, `-3` means it rose. So the worst creative read "Δ 31%" and a recovering one read "Δ -3%" — a number most people parse as bad. | `ctrMovement()` states direction in words: "down 31%", "up 3%". Sub-half-point moves are called flat rather than named as a trend. The type now documents the inverted sign at its definition. |
| CF-03 | **The 72-hour alert window was invisible and its input wasn't in the API response.** `hoursSinceLaunch` gates the entire `at-risk` branch, and `ScoredCreative` didn't carry it — so a creative over the frequency line but unflagged looked like a missed alert. | Added through the stack (type → API → mock), shown as a "Running for" measure, with `heldByAlertWindow()` naming the reason explicitly when a breach is too new to judge. |
| CF-04 | **`ctrLastWeek` was in the type, returned by the API, and never rendered.** You saw "CTR 1.8%" and a decline percentage but not the 2.6% it fell from — the baseline that makes the decline mean anything. | Rendered as the pair: `2.60% → 1.80%`. |
| CF-05 | `Urgency {rec.urgencyScore}` — a two-value field (90 fatigued / 60 warning) displayed as a continuous score, ordering nothing. Same family as the `impactScore` badges on the other queues. | Removed. Severity is the badge; the evidence is the grid. |
| CF-06 | **`Fatigued` used the `default` badge — ember**, the same tone as every primary button on the page. A problem was styled as an action. | Rose (`destructive`) for fatigued, gold (`warning`) for at-risk, muted for healthy. |

## B. Structure

| # | Finding | Fix |
|---|---------|-----|
| CF-07 | **Two lists of the same creatives.** "Refresh alerts" came from `useRecommendations`, "All creatives" from `useFatigue`; the same creative appeared in both with the same sentence, nothing linked them, and only one carried a provenance badge. | One severity-ordered list. A creative with an open alert carries its actions inline, which also makes the link free. |
| CF-08 | **The two lists drift apart by design.** `ensureFatigueAlerts` is one-shot per workspace — it writes alerts on first load and never runs again — while the fatigue read recomputes every load. An alert outlives the creative it was raised for, and a newly-fatigued creative gets none. Nothing on screen indicated either. | Alerts are matched to creatives by name; any that no longer match a live creative are listed separately and named as stale rather than presented as current. The one-shot generator is left alone — regenerating it is a scheduler question, not a page question. |
| CF-09 | Alerts were filtered to `status === "pending"`, so snoozing one removed it from the page with no view anywhere. Snooze also sent no date. | Dated snooze; snoozed alerts stay on their row, marked. |
| CF-10 | One page-level `useRecommendationActions` shared by every alert, so acting on one disabled the buttons on all of them. | One hook per row. |
| CF-11 | Healthy creatives carried the same visual weight as fatigued ones — five equal cards, three of them saying "Performing within normal range." | Severity ordering plus reduced emphasis on healthy rows. |
| CF-12 | One `h-32` and one `h-40` block for the two sections. | A skeleton shaped like the list. |

## Deliberate non-changes

- **The engine's thresholds and branches.** They implement blueprint §7.4.2 and are covered by the
  logic suite. They were exported, not altered — the finding was that the page described them
  wrongly, not that they are wrong.
- **`ensureFatigueAlerts` staying one-shot.** Making it regenerate is a real change with plan-limit
  and scheduler implications. The page now tells the truth about the consequence instead.

## Verification

`typecheck` OK for types / logic / api / web · `@growthos/logic` 252 tests · `@growthos/web` 60
tests (+7) · `next build` 38/38 routes · emitted CSS confirmed for `bg-destructive`, `bg-success`,
`text-destructive`, `sm:grid-cols-3` and `h-1` · the rebuilt page rendered end-to-end against the
fixtures, confirming "Bedroom Set — Sale" now reads `3.00% → 3.10%  up 3%` where it previously read
`Δ -3%`.

**Not run:** the `@growthos/api` suite — Docker-backed suites remain stopped at the user's request.
The API-side change is one added field on an existing response object.
