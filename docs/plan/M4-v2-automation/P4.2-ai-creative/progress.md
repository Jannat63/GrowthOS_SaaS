# P4.2 — AI Creative Automation — Progress

Status: [~]  ·  Updated: 2026-08-27  ·  **In progress — P4.2a-1 and P4.2a-4 done.** The plan was re-audited
against the source before building and **two of its four slices could not be built as written**; both
were rewritten (see the log and `plan.md`'s "Re-audit against the code"). Build order changed as a
result. P4.2b (image/video generation) stays deferred on a paid generation API.

## Slices

Listed in **execution order**, revised 2026-08-27. IDs are stable.

| Slice | Status | Notes |
|-------|--------|-------|
| P4.2a-1 Brand guidelines system | [x] | **Done 2026-08-27.** `brand_guidelines` (migration `0016`) + a pure `applyBrandGuidelines` filter in `@growthos/logic`, `GET`/`PUT /workspaces/:id/brand-guidelines`, and a Settings → Brand guidelines section. 31 engine tests + 13 route tests. |
| P4.2a-4 Server-side generation + metering | [x] | **Done 2026-08-27.** `POST /workspaces/:id/creatives/generate` (manager+), `apps/api/src/creatives.ts`, guidelines applied server-side, `assertWithinLimit` → `recordUsage` on delivered creatives only. Both studio components switched off the browser generators — **verified absent from the built bundle**. 13 route tests, including driving the starter ceiling to a real 402. Closes the last open M5 P5.2 item. |
| P4.2a-2 Creative scorecard | [ ] | **Re-specified 2026-08-27.** Its named primary inputs (hook rate, hold rate) do not exist in `creative_performance`, and two of its three benchmarks are for platforms nothing ingests. Rewritten around the columns that exist, with the self-median as the primary reference. |
| P4.2a-3 Variant experiments | [ ] | **Planned**, unchanged. `creative_experiments` structure; measurement honestly gated on live ad delivery. |
| P4.2b Image / video generation | [!] | **Deferred** — 15–25 image variants/week and storyboard rendering need a paid generation API. D4 defers paid AI. |

## Design decisions worth keeping visible

- **"Performance prediction" is deliberately not built as named.** The roadmap bullet asks for
  predicted performance *before a creative runs*. Doing that honestly needs a model trained on
  historical creative outcomes; this codebase has no model, no training data, and D4 defers the
  Anthropic API. A formula returning a confident-looking predicted CTR would be precisely the failure
  `AUDIT-2026-08-13-codebase.md` #14 identified — fabricated numbers rendered as real. It is replaced
  by a **scorecard over creatives that have actually run**, which is a smaller claim and a true one.
- **Two references, not one** — *revised 2026-08-27.* The intent stands, the sources changed: the
  **workspace's own trailing median is now primary**, and published benchmarks are deferred rather
  than seeded. Two of the three benchmarks in the original draft (TikTok, YouTube) are for platforms
  this system does not ingest, and all three carried no source. A self-median needs no attribution
  and is vertical-adjusted for free.
- **CTR is a confirming signal, not the primary score** — *the reasoning is still right, but the
  data forces the opposite arrangement.* `creative_performance` holds no hook rate and no hold rate,
  so CTR is the only performance rate available. It is therefore the main observable, with
  `frequency` and `fatigue_score` as the discriminators that stop it being read naively — and the
  band it produces is reported as "underperforming **relative to this account**", never as a claim
  about the creative in isolation.
- **Guidelines drop violating variants rather than rewriting them.** Rewriting without a language
  model produces mangled copy; fewer clean variants beat more broken ones.
- **Benchmarks carry their source and date in the code.** They decay, and an unattributed magic
  number cannot be revalidated later.

## Log

- 2026-08-20 — Phase folder created; `plan.md` written. Audited what P4.2 actually specified (one
  README line, one PRD mention) and designed the phase. Split at the credential line, and rescoped
  bullet 4 from "performance prediction" to an observed-data scorecard for the reason above.

- 2026-08-27 — **Re-audited the plan against the source before building. Two slices were
  unbuildable as written.** The 2026-08-20 plan was written from the roadmap, not from the code, and
  it is a good illustration of why that gap matters — the errors were not sloppiness, they were
  reasonable assumptions about a codebase nobody had re-read.

  **1. P4.2a-4 had no call site to wire, and was not the smallest slice.** It was scheduled first on
  the belief it was three lines. Every generator — `generateAdCopyVariants`, `generateUGCScript`,
  `generateRsaHeadlines`, `generateRsaDescriptions` — is called **only from the browser**, in
  `"use client"` components (`AdCopyStudio.tsx`, `RsaGenerator.tsx`) that import `@growthos/logic`
  directly. `apps/api` contains no reference to any of them. `recordUsage` writes to Postgres from
  the API process, so there was nothing to wire.

  The consequence is larger than a missing counter: **`aiCreativesPerMonth` is a plan limit that
  cannot bind.** Generation is client-side computation over a bundled library, so it is free and
  unlimited on every plan, including Free, while Billing sells it as a Scale-tier entitlement. A
  limit enforced only in the browser is not a limit. The slice is re-scoped to "make generation a
  server action, then meter it" and moved out of first position — it is the largest of the four.

  **2. The scorecard's primary inputs do not exist.** The plan named hook rate and hold rate as
  primary, CTR as merely confirming. `creative_performance` is, in full: `workspace_id, creative_id,
  creative_name, platform, date, ctr, cpm, frequency, fatigue_score` — no hook rate, no hold rate, no
  video metrics, no spend or conversions. Those columns are not "available where available"; they
  are never available, and cannot be until Meta App Review lands. The benchmark table also listed
  TikTok and YouTube, while the `platform` enum is `meta_ads | google_ads` and nothing ingests either
  of the other two. Left unrevised the engine would have fallen back to the one signal the plan says
  must not be primary and presented it as a graded verdict — audit #14 rebuilt in a new module.

  Also flagged: the plan states the right principle for benchmarks ("source and date recorded,
  because an unattributed magic number cannot be revalidated") and then supplies three numbers with
  no source. They are now deferred rather than seeded.

- 2026-08-27 — **P4.2a-1 built.** `brand_guidelines` (one row per workspace, unique on
  `workspace_id`, migration `0016`), `applyBrandGuidelines` in `@growthos/logic`, `GET`/`PUT
  /workspaces/:id/brand-guidelines` (read viewer+, write admin+, audit-logged), and a Settings
  section. **31 engine tests + 13 route tests; 175 logic tests and a real Next production build
  both green.**

  Three decisions worth keeping visible:

  - **Only three of the six guideline fields are filterable, and the code says so rather than
    implying otherwise.** `bannedTerms` filters, `requiredDisclaimers` append, `readingLevel`
    filters. `valueProps` **ranks** — filtering on it would routinely empty the variant set.
    `tone` is **inert for now**: tone is a property of which template was chosen, so honouring it
    needs tone-keyed templates inside each generator; it is carried on the type so P4.2a-4 can pass
    it through. `targetPersona` is already a generator *input* (`generateRsaHeadlines(keyword,
    audience)`), not a filter criterion. Claiming five working constraints and shipping three would
    have been the more dishonest design.
  - **A blank banned term matches every string.** An empty entry compiles to a regex that matches
    anything, so one stray blank row in the settings textarea would silently drop *every* generated
    variant. Guarded at both ends — normalized away on write, skipped in the engine — because either
    alone is one refactor from being the only one. Covered by a test at each layer.
  - **`\b` cannot be applied blindly.** `#1` is the schema's own example of an overclaim, and the
    naive `\b#1\b` never matches "the #1 choice", because `\b#` requires a word character before the
    `#`. `C++` has the mirror problem. Word boundaries are applied per-side, only where the term's
    own edge is a word character, and terms are regex-escaped so a brand containing `.` or `+` is
    matched literally rather than as a pattern.

  Two smaller notes: reading level uses Flesch-Kincaid and **returns null below 20 words** rather
  than a number, because on a six-word headline a single polysyllabic brand name swings the estimate
  by several grades — a confident grade from one short sentence is exactly the fabricated-precision
  problem in miniature. And `drizzle.config.ts` needed `brand.ts` added to its explicit schema list:
  the file carries a warning that a missing entry makes `generate` emit `DROP TABLE` for every table
  it cannot see, which is how the 2026-08-13 merge nearly dropped `automation_alerts`.

- 2026-08-27 — **P4.2a-4 built. `aiCreativesPerMonth` binds for the first time.**
  `POST /workspaces/:id/creatives/generate` (`manager`+, matching recommendation act/assign — the
  other day-to-day working actions; `viewer`/`client` must not spend a workspace's paid quota),
  `apps/api/src/creatives.ts`, and both studio components switched off the browser generators.
  13 route tests.

  **The plan section for this slice was itself wrong and was corrected first.** It said the web hook
  should make "a live call with the established `liveOrMock` fallback, so the page still renders with
  no backend". That is wrong three ways: `liveOrMock` is a *query* pattern and no mutation hook uses
  it; a local fallback for a **quota-consuming** action means the quota is bypassed by disconnecting
  from the network; and it would keep the generators in the client bundle, which is the thing this
  slice removes. An enforcement path shipped with a documented bypass beside it is worse than none.
  `liveOrMock`'s stated purpose is about *reading the dashboard* — an action button that needs a
  server may fail with an error when there is no server, which is what these now do.

  Decisions worth keeping visible:

  - **Only delivered creatives are charged.** Metering counts what survives guideline filtering.
    Charging for variants the workspace's own banned-terms list caused us to drop would be billing
    them for our filter. A request whose every variant was filtered out costs nothing. Tested.
  - **The ceiling is driven for real in the test, not asserted to exist.** starter is 10/month and
    ad-copy yields 5 per call, so two calls exhaust it and the third must answer `402
    PLAN_LIMIT_REACHED`. A test that only checks the helper is *called* would pass against a limiter
    that never binds — which is precisely the failure this slice exists to fix.
  - **Batch size is capped at 25.** Without it a single request could name `count: 5000` and drain a
    month's quota (or, on an unlimited plan, hand back an unbounded response) in one call.
  - **`duration` is validated to 15 | 30 | 60.** `generateUGCScript` looks those up in a record;
    anything else falls through and returns `undefined`, which would have surfaced as a 500.

  **Verified the generators actually left the browser**, rather than assuming tree-shaking: after a
  production build, neither `"Trusted by thousands. Explore"` (RSA template) nor `"best purchase
  this year"` (UGC template) appears in any client chunk, while a control string from the same
  component (`"UGC script"`) still does — so the grep would have found them had they been there.

  **Behaviour change worth announcing:** starter workspaces go from unlimited client-side generation
  to 10/month (growth 100, scale unlimited; there is no free tier). That is the limit the pricing
  page has always advertised finally taking effect, but it *is* a reduction for existing starter
  workspaces and belongs in release notes rather than being discovered.

  Also fixed here: `routes/brand-guidelines.test.ts` was committed in `cc77cd9` with a type error
  (`payload: unknown` fails to match inject's `InjectPayload` overload, silently resolving the call
  to the non-promise `Chain` signature). The tests passed at runtime, so only `tsc` caught it — and
  the API typecheck had last been run *before* that file was written. Typed to
  `Record<string, unknown>`; suite still 13/13.
