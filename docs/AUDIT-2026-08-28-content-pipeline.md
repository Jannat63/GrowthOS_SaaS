# Audit — Content Pipeline (`/content-pipeline`)

**Date:** 2026-08-28 · **Branch:** `shihab-restructure`

Fourth in the series, after the Growth Hub, the Intelligence report and the Recommendations queue.
All 16 findings below are fixed.

## Framing

This page is the handoff desk between paid and organic: a search term converts on Google Ads, ranks
nowhere organically, and the product generates a brief for the article that would win it for free.
Its audience is whoever writes that article.

It was built as a list of teasers. The brief — the entire deliverable, and the only artifact on
this screen a person actually uses — was rendered as four derived numbers, including
`headingStructure.length` printed where the outline itself belonged. The page asked for work
without showing the work, or what not doing it was costing.

## A. Wrong or misleading

| # | Finding | Fix |
|---|---------|-----|
| P-01 | **The generated brief copy was ungrammatical, and had been since it shipped.** Real output for the top term: `"What is the best best office chair for back pain?"` and `"How to choose the right best office chair for back pain"`. Title casing gave `"Best Office Chair For Back Pain"` (capital "For") and `"Gaming Chair Rgb"`. Every one of these strings was generated, persisted to Postgres and returned by the API — nobody read them, because the page only ever displayed a count. | `coreTopic()` strips a leading qualifier before a template adds its own; `article()` agrees a/an; title case leaves function words alone and uppercases real acronyms. Five tests pin the exact strings. |
| P-02 | "Impact 100" is `impactScore` — a different field from the `compositeScore` the queue is ordered by. On a page with no ordering at all it was simply an unexplained number. | Removed. Priority belongs to the queue; this page ranks by nothing, so it claims nothing. |
| P-03 | **Snooze deleted things.** The list filtered `status === "pending"`, so a snoozed opportunity vanished with no view anywhere that showed it — and the mutation sent no date, so it could never come back either. | Snooze carries a date (shared with the Recommendations queue), and snoozed opportunities stay listed and marked. |
| P-04 | One `useRecommendationActions` was created at page level and shared by every card, so `disabled={actions.isPending}` **disabled the buttons on all cards** while any single one was in flight. | The hook moved into the card, one per row, with the optimistic updates and undo built for the queue. |
| P-05 | "~1500 words" is a hardcoded constant identical for every brief, presented as a per-keyword estimate. | Labelled "Target 1,500 words", which is what a constant honestly is. |

## B. Data that existed and went unused

| # | Finding | Fix |
|---|---------|-----|
| P-06 | **Six of the brief's nine fields never rendered** — `headingStructure`, `faqQuestions`, `metaTitle`, `metaDescription`, `entities`, `internalLinkTargets`. The sibling Creative Queue renders its brief almost in full, so this page was the outlier. | The brief renders as the document it is: numbered outline, questions to answer, both meta fields, and the term list. Plus **Copy brief** — it is a handoff document and there was no way to get it off the screen. |
| P-07 | **`cost` and `clicks` were on every search term and never shown.** Those three terms cost **$1,128.20** for 61 conversions, one of them at a **$52.65** cost per conversion. That spend is the entire argument for writing the article, and none of it was on screen. | Spent / per-conversion columns in the table, the same figures on each card, and a header line scoped to the terms shown. |
| P-08 | `content_briefs` has carried `status` (draft → approved → in_progress → published) and `publishedUrl` since the table was created. Neither was written after the insert, displayed, or reachable by any endpoint — a page called **Pipeline** with no pipeline in it. | `PATCH /workspaces/:id/content-briefs/:briefId` (manager+, audited), a stage chip showing position, an advance button, and stage counts. `publishedUrl` links out when set. |
| P-09 | `ContentBriefRecord` did not carry `source`, `publishedUrl` or `createdAt` at all, so the UI could not have shown them. | Added to the type and the API response. |
| P-10 | The offline brief fallback returned `[]`, so with the API unreachable the page's entire deliverable disappeared and what remained looked broken. | The same fixtures through the same generator, with ids matching the offline queue's `p2o:<term>` scheme. |

## C. Structure and behaviour

| # | Finding | Fix |
|---|---------|-----|
| P-11 | A term appeared in the table and again as a card with nothing connecting them. | The signal badge jumps to the brief that term produced. (The anchor is slugified — offline ids are `p2o:best office chair for back pain`, whose spaces and colon are invalid in an `id` and would have silently broken the link.) |
| P-12 | "Reduce bid" was a dead badge: real advice — you are paying for a term you already rank #3 for — with no action anywhere on this page. | Links to the queue, where its recommendation lives. |
| P-13 | Two `h-40` blocks for the whole page. | Skeletons shaped like the table and the cards. |

## D. Visual

| # | Finding | Fix |
|---|---------|-----|
| P-14 | "Reduce bid" rendered in muted grey, which reads as "nothing to see" for what is actually wasted spend. | Gold (`--warning`) — waste, not an error. Opportunities keep ember; monitor stays muted. |
| P-15 | The card's largest element was a three-line summary of a document. | The brief is the card, in two columns, with mono structural labels. |
| P-16 | Meta fields, once shown, have exactly one rule governing them and no way to see it. | Character counts against the budgets a search result actually truncates at (60 / 160), over-budget in gold. |

## Deliberate non-changes

- **`wordCount` is still a constant 1,500.** It was relabelled as a target rather than made to look
  variable. Deriving a per-keyword length needs competition data the product does not have.
- **`internalLinkTargets` is still always empty** — the generator has no site graph to draw from.
  The section is omitted when empty rather than rendered as a heading a writer would read as
  something they forgot to fill in.
- **`entities` is a keyword token split, not entity extraction.** It is labelled "Terms to work
  in", which is what it honestly is, and deduped. Calling it "Entities" on screen would have
  dressed a `split(/\s+/)` up as NLP.
- **D4 holds.** Generation stays deterministic templates; the fix was to make the templates
  grammatical, not to reach for an LLM.

## Verification

`typecheck` OK for all six packages (run per-package; `turbo typecheck` aborts with SIGABRT under
memory pressure while Docker is running — environmental, documented in the previous audit) ·
`@growthos/logic` 240 tests (+5) · `@growthos/web` 47 tests (+10) · `next build` 38/38 routes ·
emitted CSS confirmed to carry `text-warning`, `scroll-mt-24`, `sm:grid-cols-2` and
`letter-spacing:.12em` · the rebuilt page rendered end-to-end against the fixtures.

**Not run:** the `@growthos/api` suite. The new `PATCH /content-briefs/:briefId` route and
`updateContentBriefStatus` typecheck and their SQL is a plain guarded UPDATE, but **neither has been
executed against a live database** — Docker-backed suites were stopped at the user's request. That
is the one piece of this change without runtime verification.

`pnpm lint` still fails on `@growthos/web` (no ESLint config). Pre-existing, untouched.
