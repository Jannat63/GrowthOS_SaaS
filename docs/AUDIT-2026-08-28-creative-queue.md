# Audit — Creative Queue (`/creative-queue`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure`

Fifth in the series, after the Growth Hub, the Intelligence report, the Recommendations queue and
the Content Pipeline. All 15 findings below are fixed.

## Framing

The mirror of the Content Pipeline. There, a paid term that converts becomes an article you should
own; here, a page that already ranks becomes a Meta ad that puts the topic in front of people who
haven't searched yet.

The two pages were built from the same template and inherited the same faults, plus one of its
own: **half of this page restated the other half.** The "Top organic pages" table and the "Creative
opportunities" cards were the identical three keywords, because `getTopOrganicPages()` and
`ensureOrganicToPaid()` both call the same `topKeywords()` filter.

The distinction that drove the rebuild: the Content Pipeline's brief is a *document* for a writer,
so it renders as an outline. This brief is an *ad* — primary text, headline and CTA are literally
the fields of Meta's composer, each with a hard limit that truncates in the feed. So it renders as
those fields, under their own names, with their own budgets.

## A. Wrong or misleading

| # | Finding | Fix |
|---|---------|-----|
| Q-01 | **`brief as unknown as CreativeBrief`.** One jsonb column holds two shapes — a `ContentBrief` for paid→organic, a `CreativeBrief` for organic→paid — and the page reached for the second with a double cast. Nothing checked at runtime, so a row of the other shape rendered a card of blank fields with no error anywhere. | `ContentBriefRecord.brief` is typed as the union it always was, with structural guards `isCreativeBrief` / `isContentBrief`. Both pages narrow; neither casts. Guards are structural rather than keyed off `source`, which is a plain text column with no constraint tying a shape to a value. |
| Q-02 | **`headline` was never rendered.** `CreativeBrief` has six fields and the card showed five. In a Meta ad the headline is a distinct required element, not an optional extra — the brief was missing a component of the thing it was briefing. | Rendered, with its budget. |
| Q-03 | **The ad copy overflowed Meta's limits.** `best office chair for back pain` produced a 45-character headline (limit 40) and 127 characters of primary text (limit 125) — cut mid-phrase and collapsed behind "See more". And `titleCase` still had the `/\b\w/g` bug fixed a day earlier in `content-brief.ts` but not here, so the same keyword gave "Best Office Chair **for** Back Pain" in a content brief and "Best Office Chair **For** Back Pain" in an ad headline. | `META_LIMITS` exported and enforced. The headline shortens by dropping its suffix, then by dropping the keyword's leading qualifier — never by cutting the term, which would change what the ad is about. Primary text lost one trailing clause. All six realistic keywords now fit. |
| Q-04 | `Impact {rec.impactScore}` — the wrong field again, and on a page with no ordering it was an unexplained number. | Removed; the evidence line carries what actually bears on the decision. |
| Q-05 | Snooze sent no date **and** snoozed opportunities were filtered out entirely (`status === "pending"`), with no view anywhere that showed them — snoozing removed an item from the product's memory. | Dated snooze, and snoozed rows stay listed and marked. |
| Q-06 | One page-level `useRecommendationActions` shared by every card, so `disabled={actions.isPending}` disabled the buttons on all cards while any one was in flight. | One hook per card, with the optimistic updates and undo built for the queue. |

## B. Duplicated, unused, or measuring the wrong thing

| # | Finding | Fix |
|---|---------|-----|
| Q-07 | **The table and the cards were the same three keywords.** Both derive from `topKeywords()` (position ≤ 10, volume ≥ 5,000). The table added three numbers and duplicated everything else. | The table is deleted. Its figures move onto the card they justify, which makes each card self-contained and removes a whole redundant section. |
| Q-08 | **`opportunityScore` measured the wrong thing here.** It is an *SEO* score: 30% volume, 20% inverted keyword difficulty, 20% competitor gap, 20% paid proof, 10% GEO citation potential. Difficulty and competitor gap say nothing about whether to buy a Meta audience, and the GEO component is P4.4b — deferred, never built. Over half the number was irrelevant or unmeasured, printed as a bare integer with no scale. | Dropped from this page. The evidence line states the two facts that do bear on the decision: search volume (demand) and organic position (the topic already earns attention). The engine is untouched — the score is still right for the SEO module. |
| Q-09 | **The offline brief fallback produced only paid→organic briefs**, so with the API unreachable this page rendered opportunity cards with no brief at all — visible in the current screenshot, where all three cards show a title and nothing else. | The mock covers both bridges, with `id` namespaces kept apart because one string can be both a paid search term and an organic keyword. |
| Q-10 | The brief had no way off the screen — a buyer was expected to retype ad copy into Ads Manager. | **Copy for Ads Manager**, ordered the way the composer asks for it, with the counts. |

## C. Structure and visual

| # | Finding | Fix |
|---|---------|-----|
| Q-11 | The brief rendered as a flat grey block: hook, primary text, format, audience and CTA as undifferentiated paragraphs, so nothing said which text goes in which Meta field. | Two columns that match how the work splits — **Concept** (angle, format, audience: what to make) and **Ad copy** (the composer fields). |
| Q-12 | Character budgets, the one rule governing ad copy, were nowhere. | A count and a meter per limited field, gold when over. |
| Q-13 | One `h-40` skeleton per section. | Skeletons shaped like the cards. |
| Q-14 | "Top organic pages turned into Meta creative briefs — amplify proven demand with paid" describes the pipeline, not what the reader gets. | Written from the reader's side: topics the site already earns attention for, turned into ads aimed at people who haven't searched yet. |
| Q-15 | `titleCase` existed twice in `packages/logic` and had already drifted. | One `text.ts` — `titleCase`, `coreTopic`, `article` — imported by both generators, so the next fix reaches both. |

## Deliberate non-changes

- **`CreativeScorecard` and `VariantExperiments` are untouched.** Both are recent (M4 P4.2a), both
  state what they are and are not — the scorecard's copy explicitly refuses to call itself a
  prediction — and neither has the faults this audit is about.
- **`opportunityScore` itself.** It is a reasonable SEO score and the SEO module should keep
  showing it. The finding is that it was on the wrong page, not that it is wrong.
- **The generated ad copy is still a deterministic template (D4).** The fix was to make it fit and
  read correctly, not to reach for an LLM. It remains a starting point a buyer will rewrite.

## Verification

`typecheck` OK for all six packages (per-package; `turbo typecheck` aborts under memory pressure —
environmental, documented in the Recommendations audit) · `@growthos/logic` 252 tests (+12) ·
`@growthos/web` 47 tests · `next build` 38/38 routes · emitted CSS confirmed to carry
`bg-primary/50`, `bg-warning`, `text-warning` and `h-0.5` · every brief generated for all six
realistic keywords and checked against both Meta limits · the rebuilt page rendered end-to-end.

**Not run:** the `@growthos/api` suite — Docker-backed suites remain stopped at the user's request.
Nothing in this change touches an API route; the API-side edit is confined to the
`ContentBriefRecord` shape, which typechecks against its only producer and both consumers.

`pnpm lint` still fails on `@growthos/web` (no ESLint config). Pre-existing, untouched.
