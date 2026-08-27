# P4.2 — AI Creative Automation

Milestone: M4 · Depends on: `@growthos/logic` `meta-ads-advisor` + `google-ads-advisor` (P3.2/P3.3),
`creative_performance` (ClickHouse, M2 P2.5), `plan-limits.ts` (M5 P5.2)

## Audit of the existing plan (2026-08-20)

There was no phase folder. Everything the repo specified about P4.2:

- `docs/plan/M4-v2-automation/README.md` — one line: *"15–25 image variants/week, brand-guidelines
  system, performance prediction, video script→storyboard, UGC A/B testing"*
- `docs/blueprint/PRD.md` — AI creative generation as a Scale-tier differentiator

Same shape as the "47 cross-channel rules" and the P4.3 findings: a list of capabilities, not a
specification. This document designs the phase.

### The five bullets, against what this codebase can actually reach

| # | Bullet | Buildable now? |
|---|--------|----------------|
| 1 | 15–25 image variants / week | **No** — needs a paid image-generation API |
| 2 | Video script → storyboard | **No** for rendering; the *script* half already exists (`generateUGCScript`) |
| 3 | Brand-guidelines system | **Yes** — pure data + constraint application |
| 4 | Performance prediction | **Partly, and not as named** — see below |
| 5 | UGC A/B testing | **Yes** for the variant//experiment structure; measurement needs live ad data |

**Decision: split at the credential line**, as P4.3 and P4.4 do. P4.2a = brand guidelines, creative
scorecard, variant experiments, metering (this document). P4.2b = image/video generation, deferred.

### Why "performance prediction" is not built as named

The bullet asks for predicted performance of a creative *before it runs*. Doing that honestly needs a
model trained on historical creative attributes and their outcomes. This codebase has no such model,
no training data, and D4 defers the Anthropic API — and the industry evidence is that pre-flight
creative prediction is oversold even by teams who do have models. Shipping a formula that returns a
confident-looking predicted CTR would be exactly the failure `AUDIT-2026-08-13-codebase.md` #14
identified: fabricated numbers rendered as though they were real.

**What replaces it: a creative scorecard over creatives that have actually run.** It grades observed
performance against published channel benchmarks and the workspace's own median, and says which
creatives are underperforming and why. That is a real, defensible signal from data we already hold in
`creative_performance`. It is a smaller claim than "prediction", and it is true.

---

## Re-audit against the code (2026-08-27) — two blocking corrections

This plan was written 2026-08-20 from the roadmap, not from the source. Checked against the
codebase before starting the build, two of its four slices could not be built as written. Both
sections below have been rewritten; this is the record of why.

### Correction 1 — P4.2a-4 metering has no call site to wire, and was not the smallest slice

The plan said metering was "smallest, unblocks a checklist item" and put it first, to be wired "at
the generator call sites, following exactly the shape `recommendations_generated` uses". The shape
description is accurate (`recommendations.ts:167` → `getRemainingAllowance`, `:172` → `recordUsage`).
**The call sites are not.** Every generator runs *in the browser*:

- `apps/web/components/meta-ads/AdCopyStudio.tsx` — `"use client"`, imports `generateAdCopyVariants`
  and `generateUGCScript` from `@growthos/logic` and calls them in a click handler.
- `apps/web/components/google-ads/RsaGenerator.tsx` — `"use client"`, same for
  `generateRsaHeadlines` / `generateRsaDescriptions`.

There is **no creative-generation endpoint in `apps/api` at all** — a grep for all four generators
across `apps/api/src` returns nothing. `recordUsage` writes to Postgres from the API process and is
unreachable from a client component, so there is nothing to wire and no way to wire it.

This is bigger than a metering gap. **The Scale-tier "AI creative generation" limit is unenforceable
by construction**: generation is pure client-side computation over a bundled library, so any visitor
on any plan can generate unlimited creatives, and `aiCreativesPerMonth` in `plan-limits.ts` is a
number that can never bind. `plan-limits.ts:22` already says `ai_creatives_generated` "still has no
call site — that action doesn't exist until M4 P4.2"; the part it does not say is that creating the
action means moving generation server-side.

**P4.2a-4 is therefore re-scoped** from "wire metering" to "make generation a server action, then
meter it", and **moved out of first position** — it is now the largest of the four slices, not the
smallest.

### Correction 2 — the scorecard's primary inputs do not exist, and two thirds of its benchmarks are for platforms we do not ingest

`creative_performance` (`infra/clickhouse/schema/001_analytics_schema.sql:46`) is, in full:

```
workspace_id, creative_id, creative_name, platform, date, ctr, cpm, frequency, fatigue_score
```

- **There is no hook rate and no hold rate**, and no video metrics of any kind — nor impressions,
  spend, or conversions. The plan named hook rate and hold rate as "the primary inputs", with CTR
  demoted to "confirming". Those columns are not "available where available"; they are **never**
  available. Meta's video metrics come from the Insights API, which is gated behind the same App
  Review that blocks P3.3.
- **The benchmark table lists Meta, TikTok and YouTube.** The `platform` enum here — and in
  `channel_performance` at line 21 — is `meta_ads | google_ads`. **Nothing in this system ingests
  TikTok or YouTube.** Two of the three benchmark rows could never match a row.

Left unrevised, the engine would silently fall back to the one signal the plan explicitly says must
not be primary, and present the result as a graded verdict. That is `AUDIT-2026-08-13-codebase.md`
#14 — fabricated confidence — rebuilt in a new module.

**Also flagged:** the plan states the right principle for benchmarks ("source and date recorded in
the engine, because an unattributed magic number cannot be revalidated") and then supplies three
numbers **with no source attached**. They must be sourced at implementation time or replaced with
the workspace's own history. A number carried from a plan into a constant is exactly the
unattributable magic number the principle warns about.

### Checked and correct

`ai_creatives_generated` → `aiCreativesPerMonth` exists (`plan-limits.ts:36`); the metering shape in
`recommendations.ts` is as described; `apps/web/components/settings/` holds eight sibling sections so
`BrandGuidelinesSection` fits the established pattern; `/creative-queue` exists; the next migration
number is `0016`. P4.2a-1 and P4.2a-3 needed no correction.

---

## P4.2a-1 — Brand guidelines system

### Goal

The deterministic generators already shipped — `generateAdCopyVariants`, `generateUGCScript`
(meta-ads-advisor), `generateRsaHeadlines` / `generateRsaDescriptions` (google-ads-advisor) — produce
generic copy because they know nothing about the brand. A workspace-level guidelines record turns
them from templates into brand-constrained templates, with no new external dependency.

### Data model

**`brand_guidelines`** — one row per workspace

- `id`, `workspace_id` (unique)
- `tone` — enum: `professional` | `friendly` | `bold` | `technical` | `playful`
- `banned_terms` text[] — words the brand must never emit (competitor names, overclaims like
  "guaranteed", regulated language)
- `required_disclaimers` text[] — appended where the channel allows
- `value_props` text[] — the claims copy should draw from
- `target_persona` text
- `reading_level` int — target grade level for generated copy

### Application

Guidelines are applied in `@growthos/logic` as a **pure filter over generator output**, not as a
parameter threaded through every generator:

```
generateAdCopyVariants(input) → applyBrandGuidelines(variants, guidelines) → constrained variants
```

This keeps each generator's signature unchanged, makes the constraint independently testable, and
means one implementation covers every current and future generator. Variants violating a banned term
are dropped rather than rewritten — rewriting without a language model produces mangled copy, and a
smaller set of clean variants beats a larger set of broken ones.

### Files

- `packages/db/src/schema/brand.ts` + migration
- `packages/logic/src/engines/brand-guidelines.ts` + test
- `apps/api/src/routes/v1.ts` — `GET`/`PUT /workspaces/:id/brand-guidelines`
- `apps/web/components/settings/BrandGuidelinesSection.tsx`

---

## P4.2a-2 — Creative scorecard

### Goal

Grade creatives that have run, against two references: published channel benchmarks, and the
workspace's own median for that channel. Two references matter because a benchmark alone punishes a
brand in an expensive vertical, and a self-median alone cannot tell a workspace its whole account is
underperforming.

### Inputs — rewritten 2026-08-27 to the columns that exist

Scored **only** from what `creative_performance` actually holds: `ctr`, `cpm`, `frequency`,
`fatigue_score`, `date`, `platform`. The original spec's primary inputs (hook rate, hold rate) do
not exist in the schema and cannot until Meta App Review lands — see Correction 2.

That inverts the original weighting, and the inversion must be **stated in the output**, not hidden:

- **The workspace's own trailing median is the primary reference**, not a published benchmark. It is
  the reference this data can actually support — it needs no external attribution, it is
  vertical-adjusted for free, and it is computed from rows we hold. A creative is graded against how
  *this account* normally performs.
- **CTR is the main observable**, because it is the only performance rate in the table. The original
  plan is right that CTR is mid-funnel and reflects targeting as much as creative — so the band it
  produces is reported as *"underperforming relative to this account"*, never as a claim about the
  creative in isolation.
- **`frequency` and `fatigue_score` are the discriminators** that stop CTR being read naively: a
  creative below median at frequency 6.0 is saturated, which is a different finding, with a
  different action, from one below median at frequency 1.2. This is where the score earns its
  keep — and it composes with the shipped `creative-fatigue` engine (`detectFatigueAll`) rather
  than re-deriving decline.
- **`cpm` is a cost-side flag only.** Efficiency needs spend and conversions, which the table does
  not have, so no ROAS/CPA claim is made anywhere.

**Published benchmarks are deferred, not seeded.** The three figures in the original draft carried
no source, and two named platforms (TikTok, YouTube) are not ingested. When a benchmark is added it
is a named constant carrying its source URL and retrieval date, for `meta_ads` and `google_ads`
only, and it enters as a *secondary* reference behind the self-median.

**Explicitly deferred**, recorded in the engine header so the next reader does not think it was
overlooked: hook/hold rate and true video scoring (Meta App Review), efficiency scoring (needs
spend + conversions), and cross-platform benchmarking (needs TikTok/YouTube ingestion).

### Design

A pure engine, `scoreCreatives(creatives, options)`, returning per-creative a score, a band
(`strong` | `average` | `underperforming`), and the **specific reason** — never a bare number. It
composes with the existing `creative-fatigue` engine rather than duplicating its logic.

Two rules the tests must hold it to:

1. **A thin account gets no verdict.** Below a minimum creative count a self-median is noise, so the
   engine returns `insufficient-data` with the count, not a confident band over three rows.
2. **Every band carries its reason and its reference.** "Underperforming" is never returned bare;
   it names the observed CTR, the median it was compared against, and the discriminator that
   explains it (saturated / fatiguing / genuinely weak).

### Files

- `packages/logic/src/engines/creative-scorecard.ts` + test
- `apps/api/src/meta-ads.ts` — surface over `creative_performance`
- `apps/web` — a scorecard panel on `/creative-queue`

---

## P4.2a-3 — Variant experiments (UGC A/B structure)

Pairs generated variants into experiments with a declared hypothesis and success metric, and records
them. **Measurement is honestly gated:** without live ad delivery there is no outcome to read, so an
experiment stays `draft` until a live channel connection exists. Building the structure now is what
makes the measurement half a wiring change later rather than a redesign.

**`creative_experiments`**: `id`, `workspace_id`, `hypothesis`, `variant_a`, `variant_b`,
`success_metric`, `status` (`draft` | `running` | `concluded`), `result` jsonb.

---

## P4.2a-4 — Server-side creative generation, then metering

**Re-scoped 2026-08-27.** This was written as "wire `recordUsage` at the generator call sites". There
are no server-side call sites: generation runs in the browser (see Correction 1). The metering is
three lines; **making an action that can be metered at all is the slice.**

### Why this is a correctness fix, not just plumbing

Today `aiCreativesPerMonth` is a plan limit that cannot bind. Generation is client-side computation
over a bundled library, so it is free and unlimited on every plan including Free, while Billing
presents it as a Scale-tier entitlement. Any limit enforced only in the browser is not a limit.

### Shape

`POST /workspaces/:id/creatives/generate`, guarded by `requireWorkspaceMember`, body discriminated on
`kind`:

- `ad-copy` → `generateAdCopyVariants(product, benefit, painPoint)`
- `ugc-script` → `generateUGCScript(product, duration)`
- `rsa` → `generateRsaHeadlines(keyword, audience)` + `generateRsaDescriptions(keyword)`

Server-side it applies brand guidelines (P4.2a-1) before returning — which is the second reason this
must move: **a client-side generator cannot be brand-constrained by a server-held record**, so
P4.2a-1 is only half-effective until this ships.

Metering follows `recommendations.ts:167–172` exactly: `getRemainingAllowance` first, generate, then
`recordUsage(workspaceId, 'ai_creatives_generated', produced)` with the count actually produced —
after guideline filtering, since dropped variants are not delivered value.

### Files

- `apps/api/src/creatives.ts` + `routes/v1.ts` wiring, and a route test asserting the limit binds
- `apps/web/lib/hooks/useCreativeGeneration.ts` — live call with the established `liveOrMock`
  fallback, so the page still renders with no backend
- `AdCopyStudio.tsx` / `RsaGenerator.tsx` switch from direct `@growthos/logic` calls to the hook

Keeping the `liveOrMock` fallback means the browser path stays as the *offline* path, which is what
the pattern is for; the difference is that the metered, guideline-constrained result now comes from
the server whenever there is one.

This closes the last open metering item from M5 P5.2.

---

## P4.2b — Image and video generation (deferred)

15–25 image variants per week and video storyboard rendering both need a paid image/video generation
API. No credential exists, and D4 defers paid AI. When reached, this slots behind the same optional-
integration pattern as Stripe/Resend/Sentry: configured, or a clean no-op.

## Build order

**Revised 2026-08-27.** IDs are stable; the order changed. The original put `P4.2a-4` first on the
belief that it was a three-line wiring job — it is the largest slice, and it depends on `P4.2a-1`.

`P4.2a-1` (brand guidelines) → `P4.2a-4` (server-side generation + metering) → `P4.2a-2` (scorecard)
→ `P4.2a-3` (experiments).

- **`P4.2a-1` first** because it is genuinely self-contained — a table, a pure filter, a route, a
  settings panel — and nothing it needs is missing.
- **`P4.2a-4` second, not first.** It consumes the guidelines record (the server is the only place
  the filter can be applied), and it is the slice that turns an unenforceable plan limit into a real
  one. Doing it before `P4.2a-1` would mean building the endpoint twice.
- **`P4.2a-2` third**, unchanged in position: it reads guidelines optionally and is independent of
  the generation endpoint.
- **`P4.2a-3` last**, unchanged: it composes the other three.
