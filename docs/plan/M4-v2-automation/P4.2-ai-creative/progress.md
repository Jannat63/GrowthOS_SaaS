# P4.2 — AI Creative Automation — Progress

Status: [x]  ·  Updated: 2026-08-27  ·  **P4.2a COMPLETE — all four slices done (P4.2a-1, P4.2a-2, P4.2a-3, P4.2a-4).** P4.2b (image/video generation) stays deferred on a paid generation API.

Every slice was re-audited against the source before being built, and **three of the four needed
plan corrections first** — twice the error was in a correction written the day before. Build order
changed as a result. See the log below and `plan.md`'s "Re-audit against the code".

## Slices

Listed in **execution order**, revised 2026-08-27. IDs are stable.

| Slice | Status | Notes |
|-------|--------|-------|
| P4.2a-1 Brand guidelines system | [x] | **Done 2026-08-27.** `brand_guidelines` (migration `0016`) + a pure `applyBrandGuidelines` filter in `@growthos/logic`, `GET`/`PUT /workspaces/:id/brand-guidelines`, and a Settings → Brand guidelines section. 31 engine tests + 13 route tests. |
| P4.2a-4 Server-side generation + metering | [x] | **Done 2026-08-27.** `POST /workspaces/:id/creatives/generate` (manager+), `apps/api/src/creatives.ts`, guidelines applied server-side, `assertWithinLimit` → `recordUsage` on delivered creatives only. Both studio components switched off the browser generators — **verified absent from the built bundle**. 13 route tests, including driving the starter ceiling to a real 402. Closes the last open M5 P5.2 item. |
| P4.2a-2 Creative scorecard | [x] | **Done 2026-08-27.** `scoreCreatives` in `@growthos/logic`, `getCreativeScorecard` in `fatigue.ts` (reusing the existing `creative_performance` loader), `GET .../meta-ads/scorecard`, and a provenance-labelled panel on `/creative-queue`. 21 engine + 6 integration tests. Re-specified twice first — the named primary inputs (hook/hold rate) do not exist, and the `fatigue_score` column named in the *first* rewrite turned out to be dead too. |
| P4.2a-3 Variant experiments | [x] | **Done 2026-08-27.** `creative_experiments` (migration `0017`), a pure transition/conclusion state machine in `@growthos/logic`, five routes, and a panel on `/creative-queue`. 22 engine + 20 route tests. **Re-specified first:** the plan gated `running` on a live connection, which gates a label and protects nothing — the `result` is what needed gating. |
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
  `frequency` and **the fatigue engine's derived decline** as the discriminators that stop it being
  read naively — and the band it produces is reported as "underperforming **relative to this
  account**", never as a claim about the creative in isolation.
  *(Corrected 2026-08-27: an earlier version of this bullet named the `fatigue_score` **column**. It
  is written as a literal `0` and never updated, so it carries no signal — see the log entry for
  P4.2a-2. `detectFatigueAll` derives decline from CTR week-over-week instead.)*
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

- 2026-08-27 — **P4.2a-2 built. The plan needed a SECOND correction first, and it was my own.**

  The 2026-08-27 rewrite of this slice replaced the non-existent hook/hold-rate inputs with "`ctr`,
  `cpm`, `frequency`, `fatigue_score`". Checking those against the data before building:

  - **`fatigue_score` is a dead column.** `fatigue.ts:54` writes it as a literal `0` and nothing
    anywhere else ever writes it — no worker, no sync path. Scoring on it would have given every
    creative an identical dimension while looking like a real input. This is precisely the error the
    rewrite criticised the original plan for, committed one day later. The lesson worth keeping:
    *"the column exists" and "the column carries data" are different checks, and only the second
    one counts.* The fatigue signal now comes from `detectFatigueAll`, which derives decline from
    CTR week-over-week — real data.
  - **`cpm` is a constant `12.5` in the seed.** It is displayed for context and never affects a
    band. Efficiency needs spend and conversions, which the table does not carry.
  - **The seed writes only `platform: 'meta_ads'`.** There are no `google_ads` creative rows at all,
    so a scorecard spanning both would have returned an empty half that reads as "every Google
    creative is underperforming". Scoped to `meta_ads`, matching `fatigue.ts`.

  So the honest input set is **`ctr` + `frequency` + engine-derived fatigue** — narrower than either
  version of the plan implied, and stated as such in the engine header.

  **Provenance was added to the slice rather than deferred.** `ensureCreativePerformanceSeed`
  fabricates rows for any workspace with none, so the default experience of this feature is a graded
  verdict over invented data — audit #14 in its purest form, and worse than the badge problem that
  audit found, because a *band* reads as a judgement rather than as a number. The panel declares
  `MODULE_PLATFORMS.fatigue` and renders `DataSourceBadge`, so it reports `sample` until Meta is
  actually connected.

  **The fixture was widened, not the threshold lowered.** The engine withholds a verdict below 5
  creatives, because with 3 the median *is* one of the 3. The `creatives` fixture held exactly 4, so
  every demonstration workspace would have shown "insufficient data" everywhere and the feature
  would have read as broken. Tuning the threshold to fit the fixture would have been backwards — it
  is a statistical judgement, and bending it to make demo data grade is how a confident verdict over
  too-thin evidence gets shipped. A fifth creative was added to the fixture instead, positioned mid-
  spread so the seeded account now yields one underperforming, one strong and three average — the
  feature's full range. `fatigue.test.ts` computes its expectations dynamically, so nothing broke.

  Two smaller decisions:

  - **`getCreativeScorecard` lives in `fatigue.ts`, not `meta-ads.ts` where the plan put it.** That
    module already owns every `creative_performance` read — its seed, its max-date windowing, its
    loader. A second reader in `meta-ads.ts` (which reads `ad_performance`, a different table) would
    have duplicated all three and drifted.
  - **Three kinds of "underperforming", not one.** Below-median at high frequency is *saturated*
    (widen targeting); below-median while declining is *fatiguing* (refresh, it worked before);
    below-median with neither is *weak* (it never connected). Saturation wins when both apply,
    because a saturated creative is declining *because* it is saturated and "rewrite the copy" would
    be the wrong action. Collapsing these into one number would lose the only part that tells a user
    what to do.

  Verified: 21 engine tests + 6 integration tests against real ClickHouse; 196 logic tests, 23 web
  tests, tsc clean on api and web, real Next production build.

- 2026-08-27 — **P4.2a-3 built; P4.2a COMPLETE.** `creative_experiments` (migration `0017`), a pure
  transition/conclusion state machine in `@growthos/logic`, five routes (list / create / status /
  conclude / delete, read viewer+ and every write manager+, audit-logged), and a panel on
  `/creative-queue`. **22 engine tests + 20 route tests.**

  **The plan gated the wrong thing.** Its one substantive line was *"an experiment stays `draft`
  until a live channel connection exists."* Two problems:

  - **It protects nothing.** `draft` vs `running` is a label on a row. The real precedent is
    `resolveAdapter` in `automation/executor.ts`, where a connection gate requires both a registered
    adapter *and* an active connection and prevents an actual API call against a live ad account —
    a gate with teeth. Here there is no action to prevent, because **nothing in this codebase
    publishes an ad**.
  - **It would freeze the record of work that is genuinely happening.** The only way to run one of
    these tests today is manually, in Meta Ads Manager. A user who launched their test *is* running
    it; refusing to let them say so confuses **our** measurement capability with **their** workflow
    state.

  **What actually needed gating is the `result`.** The product never computes, infers or asserts a
  winner — it has no per-variant delivery data, and deriving one from account-level numbers would be
  fabrication. Concluding is an explicitly human act, and `buildResult` stamps `selfReported: true`
  on every outcome so a later reader (or the intelligence engine) cannot mistake a hand-typed CTR
  for an observed one. The UI says so in words too.

  **This reframed the slice, and the reframing is the point.** It is not "an A/B testing system
  waiting for its measurement half" — that would be speculative generality, building structure for a
  capability that may never arrive. It is an **experiment log**: a complete, useful feature today for
  the agency persona, recording what was tested, why, how it would be judged, and what the human
  concluded. Automatic measurement later becomes an addition *to a working feature* rather than the
  thing that finally makes it work.

  Decisions worth keeping visible:

  - **`concluded` is terminal, and a concluded experiment cannot be deleted.** A log whose history
    can be rewritten or erased after the fact is not a log. Abandoning before launch is expressed by
    concluding it (`draft → concluded` is allowed), not by deleting it.
  - **The engine deliberately does NOT overrule a winner that disagrees with the reported numbers.**
    A user may pick B despite A's higher CTR because B drove downstream revenue they can see and we
    cannot. Overruling them from two figures we did not measure would be the same false confidence
    this phase has been correcting throughout. Covered by a test at both layers.
  - **An inconclusive result requires notes.** "We could not tell" is only useful to a future reader
    if it says what was seen; a winner can stand on the variants alone.
  - **Variants are stored as a jsonb snapshot, not a reference.** The generators are deterministic
    templates, so re-deriving a variant later would return today's template output rather than what
    was actually tested.
  - **`successMetric` is free text, not an enum.** Limiting it to what we can read (CTR) would
    constrain the user's stated *intent* to our current *measurement* capability — different things.
    They may well be judging on CPA in their own reporting.
  - **A no-op transition is refused**, not silently accepted: a status write that looks successful
    while changing nothing reads to the caller as a state change that never happened.
  - **The offline fallback for the list is an empty list, not invented experiments.** These are
    records of what a real person decided to test; fabricating one would put words in their mouth.

  Verified: 218 logic tests, 20 route tests against real Neon, 23 web tests, tsc clean on api and
  web, real Next production build. Migration `0017` is `CREATE TABLE` + one index, no drops.
