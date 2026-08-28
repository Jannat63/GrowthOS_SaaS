# Audit — Creative Queue, second pass (`/creative-queue`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure` · **Base:** `5606f42`

A second pass over a page already rebuilt earlier the same day (`88d7b38`, 15 findings). Prompted by
a screenshot in which all three opportunity cards were visibly the same ad. The first pass fixed how
the brief was *presented*; this one fixes what the brief *is*.

## Finding 0 — the screenshot was a stale build

The primary text in the screenshot read `…what makes the difference — and why it matters for you.`
at `108/125`. That string does not exist anywhere in the source at `5606f42`; `88d7b38` removed the
trailing clause, and the generator emits 79 characters for the same keyword. The dev server was
serving old chunks.

Recorded because it cost the first ten minutes of this session and would have cost them again: judge
a visual against a restarted dev server, not a long-lived one.

## A. The generator could not differentiate

| # | Finding | Fix |
|---|---------|-----|
| Q2-01 | **`generateCreativeBrief(topic: string)` took only the keyword**, so every opportunity produced a byte-identical ad. `format` and `callToAction` were literal constants; `hook`, `primaryText`, `audience` and `headline` were one template with a noun substituted. Three cards, one ad. The page's entire deliverable was a mail merge. | Takes `CreativeBriefInput` (`keyword`, `volume`, `currentPosition`, `paidProvenConversions`) — which `ScoredKeyword` already satisfies, so both call sites just pass `k`. |
| Q2-02 | **The copy asserted social proof the product does not measure.** Every ad opened `Thousands find their {topic} through us` — a factual claim about the customer's business, generated into copy meant for a live Meta ad. | Removed. A test now fails on `thousands\|millions\|everyone\|most people\|#1\|best-selling` in generated primary text. |
| Q2-03 | `CreativeBrief` was **declared twice** — `packages/types/src/index.ts` and `packages/logic/src/creative-brief.ts` — with nothing tying them together. Adding a field would have reproduced the `titleCase` drift exactly. | Declared once in `@growthos/types`, re-exported from logic. `@growthos/types` has no dependencies, so `logic -> types` is acyclic. |

### The play, and one rejected design

Plays are keyed on **organic position**: `own` (1-3, top of page one) and `claim` (4-10, page one
below the fold). That break is a real feature of a results page, not a tuned constant.

A third play gated on `paidProvenConversions >= 1` was **built and then removed**: it swallowed all
three fixtures (42, 31 and 12 conversions), because a top-ranking commercial term converting in paid
is the normal case. Any "enough conversions" threshold would have been invented rather than measured.
Paid proof now modifies the call to action instead — `Shop now` where the term has closed, `Learn
more` where it has not — which is the claim the evidence actually supports.

**Two keywords in the same position still get similar copy, and that is correct.** A deterministic
template cannot invent difference the data does not contain. The page groups by play so a shared
approach reads as a stated judgement rather than as the repetition it used to be.

## B. Presentation

| # | Finding | Fix |
|---|---------|-----|
| Q2-04 | The brief rendered as labelled form fields, describing the ad without showing it. Character budgets were abstract meters, though the rule they encode is concrete — past 125 characters Meta folds the copy behind "See more". | The brief renders as the post. The fold is drawn where Meta cuts, and overflow stays visible past it struck through. |
| Q2-05 | **The budget meter filled with `bg-primary/50`.** `--primary` is the action colour *and* the token `BrandingProvider` overwrites per workspace, so a measurement was painted in a tenant's brand colour — the hazard `CLAUDE.md` names explicitly, and pattern 7 of the defect-patterns note, still unfixed on this page. | Fills with `--muted-foreground`, `--warning` when over the limit. A character budget is a quantity, not an identity. |
| Q2-06 | **Everything sat within ~2% luminance** — `bg-secondary/25` over `--card` over `--background` — so nothing read as a distinct object. | Fixed with **value**: the preview takes `--card` against a `bg-background/40` body. Ember stays actions-only. |

| Q2-07 | **The queue sat third**, below the scorecard and an empty "No experiments yet" panel — the page's job started below the fold while an empty state held the space above it. | Queue first; scorecard and experiments follow as context. |
| Q2-08 | The preview's first draft used `aspect-[4/3]`, which was mostly empty space and pushed the copy down. Its headline used `truncate`, hiding the end of the one field being budgeted. | `aspect-[16/9]`, and the headline wraps. |
| Q2-09 | The group count rendered as a margin-separated span inside the heading, which a screen reader read as "Extend reach1". | Separated by a text node. |

### The colour mistake, recorded because it is repeatable

The first version of Q2-05/Q2-06 introduced `--channel-meta` violet — on the meters, the preview
chrome, a "META CREATIVE" eyebrow and the group rule — reasoning that the page is a Meta page and
the channel token is the one thing white-labelling cannot repaint.

Shihab rejected it on sight: the product has a brand colour, and this put a second saturated hue
next to it. He was right, and the diagnosis is worth keeping:

**The problem was flatness, which is a *value* problem, and it was answered with a *hue*.** Surface
separation fixed it on its own; the violet was solving nothing and competing with ember. The meters
were the worst instance — six saturated bars per screen, all sitting at roughly the same fill,
carrying no information the adjacent `72/125` did not already carry.

What survives from that reasoning is only the negative half: the meter must not be `--primary`,
because `BrandingProvider` repaints it per tenant. The answer to that is **neutral**, not a different
accent. Channel colour still belongs where it distinguishes channels *from each other* — `Bridge`,
the intelligence page — not as decoration on a single-channel page.

All `--channel-meta` usage was removed; the eyebrow was deleted rather than recoloured, since the
sidebar's active item and the sentence beneath the title already say the page is about Meta ads.

## C. Creative scorecard

| # | Finding | Fix |
|---|---------|-----|
| Q2-10 | **CTR appeared twice on every row.** Each `reason` opened `CTR 1.80% — …` and the figures underneath repeated `CTR 1.80%`. Saturated rows repeated frequency too (`at frequency 4.2` … `Frequency 4.2`). | `reason` is interpretation only; the row states the measurement once, leading at `text-lg` because it is the number that decides the band. Only `CreativeScorecard.tsx` consumed `reason`. |
| Q2-11 | Five rows of "x% above/below the median" is a table read line by line, and three of five were undifferentiated grey. | A deviation bar per row on a shared centre tick — the five become one shape. Null-safe: no bar where there is no usable median, rather than a bar pinned at centre asserting "exactly average". |

## D. Recommendations queue (reported separately)

| # | Finding | Fix |
|---|---------|-----|
| Q2-12 | **`RecommendationRow` had no hover state.** The only `hover:` on the page was on the filter chips. Rows carry per-row controls, so which row an action belonged to was only knowable by aiming carefully. | `hover:bg-secondary/40` plus `focus-within:` so keyboard users get the same anchor. Sits above the `acted` tint, so an acted row still reads as acted. |

## Verification

- `typecheck` OK for all six packages, run per-package (`turbo typecheck` aborts under memory
  pressure — environmental, documented in the Recommendations audit).
- `@growthos/logic` **259** tests (from 252) · `@growthos/web` **61** (from 60).
- `next build` **38/38** routes.
- Emitted CSS confirmed to carry `aspect-[16/9]`, `hover\:bg-secondary\/40:hover`,
  `focus-within\:bg-secondary\/40` and the `minmax(0,20rem)` card template. Grepped with the
  fixed-width form; the literal-string grep for `hover:bg-secondary` returns 0 because the selector
  is escaped, which is the trap the previous audit recorded.
- The page was **rendered and screenshotted** at 1600px against the fixtures, driven down the
  `liveOrMock` offline path by rejecting `localhost:3001` fetches in the browser. Both groups render,
  the two plays produce visibly different ads, and the only console error is the WebSocket failing
  auth, which is expected without a session.

**Not run:** the `@growthos/api` suite. Docker-backed suites remain stopped at the user's request.
The API-side change here is one call site (`generateCreativeBrief(k.keyword)` -> `(k)`) in
`organic-to-paid.ts`; it typechecks against the new signature and the value passed is the same
`ScoredKeyword` the function already had in scope.

**Migration note:** `play` and `rationale` are optional. `content_briefs.brief` is jsonb holding rows
written before plays existed; those rows still satisfy `isCreativeBrief` (which deliberately does not
test `play`), still render, and are grouped under a trailing "Briefed earlier" heading rather than
being filed under a play nothing measured them for. No backfill is assumed.
