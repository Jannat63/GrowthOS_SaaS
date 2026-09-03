# Audit — Recommendations queue (`/recommendations`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure`

Third in the series, after `AUDIT-2026-08-27-growth-hub-design.md` and
`AUDIT-2026-08-27-intelligence-report.md`. All 20 findings below are fixed.

## Framing

Every other dashboard module is a *read* surface. This is the only screen in the product where a
person **does** something — it is the workbench, and the Growth Hub and the Intelligence report
both funnel into it.

It was built as a feed: 28 cards of identical weight, each with six controls, ordered by a number
that was never shown, labelled with a different number that contradicted the order. The rebuild
makes it a **manifest** — banded by priority, anchored by the bridge each recommendation crosses.

## A. Wrong or misleading

| # | Finding | Fix |
|---|---------|-----|
| R-01 | **The queue listed the same job twice.** The cross-channel engine's GoogleAds→SEO rule and `ensurePaidToOrganic` both run `analyzeSearchTerms()` over the same source and both emit the identical title, `Create SEO content for "<term>"`. Three duplicate pairs on seeded data — on screen as the same sentence at Impact 90 and 100, 90 and 78, 90 and 48. For a screen that answers "what next", two answers for one job is the worst failure available. | `dedupeAgainstSpecialisedRows` in the composition layer, not the engine. The specialised row wins: it scores impact from real conversion volume where the engine assigns a flat bucket, and it owns the linked content brief the cross-channel row has no equivalent of. Only `pending`, unassigned rows are removed — a row someone already touched is their work item. Runs on read, because the duplicates are already persisted in every existing workspace. |
| R-02 | **Ranked by one number, labelled with another.** `readOrdered` sorts `desc(compositeScore)`; the card printed `impactScore`. Hence the screenshot's visibly non-monotonic column: 90, 90, 90, 90, 90, **100**, 78, 60, **63**, 60, 60, **48**, 55, 50. | The row shows `compositeScore` — the figure the queue is actually ordered by — with impact, urgency and effort in its tooltip. |
| R-03 | **Snooze did nothing.** The Open filter was `pending \|\| snoozed`, so a snoozed row kept its exact place and only its badge changed. The API has accepted `snoozedUntil` and the column has existed since P2.3b; the UI never sent it and nothing ever read it back. | Snooze sends a date (tomorrow / next week / next month), snoozed rows leave Open for their own view, and `wakeExpiredSnoozes` returns them when the date passes. A snooze with no date stays put — that is an explicit "not now, no deadline". |
| R-04 | **A near-tie presented as a total order.** For `cross_channel`, effort is the constant 40 and urgency is a pure function of impact, so composite can only be 80, 57 or 35. Across all four generators: 84, 80×6, 69, 58, 57×13, 54×2, 52, 35×3 — **22 of 28 rows share a score**. Ties then broke on whatever order Postgres returned, so the queue could reorder between loads. | Grouped into three bands on the natural gaps in that distribution (80→69, 52→35) with the rule printed, rather than ranked. Within a band, effort ascending then id — a real tiebreaker ("what can I clear now") and a stable one. |

## B. Data that existed and went unused

| # | Finding | Fix |
|---|---------|-----|
| R-05 | The **bridge** — `sourceChannel`→`targetChannel`, the product's entire six-bridge thesis — never rendered. The Growth Hub's *summary* widget drew it, so the dedicated page showed less than its own summary. | The `Bridge` component, first and at a fixed position in every row, in the two channels' own `--channel-*` colours. |
| R-06 | `actionLabel` — "Generate brief", "Generate creative", "Refresh creative" — stored per row and dropped. Every card said "Act". | The row's own verb, on a button that goes to the module that does the work. |
| R-07 | `effortScore` and `urgencyScore` never shown. Effort is the most useful triage axis after priority. | Effort as a word on the scan line; urgency in the priority tooltip. |
| R-08 | `dueDate` accepted by the assignment route and stored since M3 P3.5, never sent or displayed — "Assigned" meant a name and no commitment. | Set from the assign menu, shown on the row. |
| R-09 | `snoozedUntil`, `actedAt` and `createdAt` were persisted but **not in the API response at all** — `rowsToApi` dropped them, so the UI could not have shown an age or a snooze return even if it wanted to. | Added to `Recommendation` and returned. |
| R-10 | Comment counts loaded only when a thread was opened, so finding which of 28 rows had discussion meant clicking all 28. | `commentCount` travels with the list from one grouped query, scoped to the ids returned. The thread itself stays lazy. |
| R-11 | The client dropped the API's `total` and drew its chip counts from the fetched page — silently understating any queue past the 100-row cap. | `total` is carried through and a truncation notice appears when the page is partial. |
| R-12 | **The offline fallback ran one of the four generators.** It built `cross_channel` only, so the "same shape, same content" promise was false — it was missing every row that carries an `actionLabel`. | All four, with the same dedupe and the same three-key order. |

## C. Structure and behaviour

| # | Finding | Fix |
|---|---------|-----|
| R-13 | Open 14 / Assigned 2 / All 15 styled as a segmented control, but not a partition — "Assigned" cut across the other two, so the numbers could not add up. | Open / Snoozed / Done — a real partition of the four statuses. Assignment is orthogonal, so it is a separate "Assigned to me" toggle. |
| R-14 | No view of finished work; acted and dismissed rows sat in "All" distinguished only by a small badge. | The Done view, with acted rows tinted and dismissed rows dimmed. |
| R-15 | The queue was a dead end — it could mark something done but not take you to the thing that does it. | Rows link to the module that works them, using the same `TYPE_HREF` map as the Intelligence report's opportunity cards. |
| R-16 | No optimistic update: the card sat unchanged until the round trip returned, which reads as a dead button and invites a second click. | Status changes apply immediately and roll back on error. |
| R-17 | Dismiss was irreversible with no route back. | Undo in the toast, rather than a confirmation dialog that would tax the common case to guard the rare one. |
| R-18 | Two `h-36` blocks for the whole queue. | A skeleton shaped like the banded list. |

## D. Visual

| # | Finding | Fix |
|---|---------|-----|
| R-19 | 28 floating cards of identical weight at `p-6`, priority conveyed only by vertical position. | Three banded panels of hairline-divided rows, with a mono eyebrow carrying each band's name, count and rule. |
| R-20 | Six controls on every row — three of them full buttons — so ~84 buttons on one screen. | Assign, Comment, the action verb, Mark done, and an overflow holding Snooze and Dismiss. Deferring and killing are rarer than acting and no longer priced as equals. |

## Deliberate non-changes

- **The cross-channel engine is untouched.** Its GoogleAds→SEO rule is one of the six bridges the
  product is built on and is covered by the logic suite. The duplicate is created by *composition*,
  so it is resolved in the composition layer. A guard test in `recommendation.test.ts` pins the
  title collision, because both dedupes match on title and would silently become no-ops if either
  string were reworded.
- **No finer-grained score was invented.** The middle band genuinely holds 19 of 26 rows. That is
  what the data says, and saying it is the point — manufacturing a spread would repeat the mistake
  this audit exists to fix.
- **`effortScore` is still a constant 40 for cross-channel rows.** Surfacing it as a word does not
  fix the underlying synthesis. A real effort model needs data the product does not have yet.

## Verification

`pnpm typecheck` 9/9 · `@growthos/logic` 235 tests (+1) · `@growthos/web` 37 tests (+13) ·
`next build` 38/38 routes, and the emitted CSS confirmed to carry `tracking-[0.08em]`,
`text-[10px]`, `hover:text-destructive` and `bg-success/[0.04]`.

**Run against live infrastructure** (Neon + ClickHouse + Redis): `recommendations.test.ts` and
`recommendations-all.test.ts`, 5/5 — including the three new cases that assert the queue lists no
title twice, that the surviving row is the specialised one, and that the order is stable across
reads. Both new maintenance queries had their generated SQL printed and inspected; the dedupe's
correlated subquery references the outer row (`"other"."title" = "recommendations"."title"`) rather
than self-joining.

**Not run:** the rest of the `@growthos/api` suite. The recommendations suites were run and passed;
the remaining Docker-backed suites were stopped at the user's request.

`pnpm typecheck` under `turbo` aborted twice with SIGABRT/stack-overrun while Docker was running —
memory pressure from concurrent `tsc` processes, not a type error. `pnpm --filter @growthos/web
typecheck` exits 0 on its own, and the full run passed 9/9 before Docker started.

`pnpm lint` still fails on `@growthos/web` (no ESLint config; `next lint` drops into an interactive
setup prompt). Pre-existing, untouched.
