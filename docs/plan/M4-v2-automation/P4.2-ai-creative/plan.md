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

### Benchmarks

Seeded as named constants with their source and date recorded in the engine, because benchmarks
decay and an unattributed magic number cannot be revalidated:

| Channel | Video CTR benchmark |
|---------|--------------------|
| Meta | 1.62% |
| TikTok | 0.84% |
| YouTube | 0.42% |

CTR is treated as a **confirming** signal, not the primary score — it is mid-funnel and reflects
targeting as much as creative. The primary inputs are hook rate and hold rate where available, with
CTR and the existing fatigue score as supporting dimensions.

### Design

A pure engine, `scoreCreatives(creatives, benchmarks, guidelines?)`, returning per-creative a score,
a band (`strong` | `average` | `underperforming`), and the **specific reason** — never a bare number.
It composes with the existing `creative-fatigue` engine rather than duplicating its logic.

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

## P4.2a-4 — `ai_creatives_generated` metering

The metric and its plan mapping already exist in `apps/api/src/plan-limits.ts`; nothing calls
`recordUsage` for it, which the go-live checklist records as open. Wire it at the generator call
sites, following exactly the shape `recommendations_generated` uses in `recommendations.ts`:
check `getRemainingAllowance` first, generate, then record the count actually produced.

This is the last open metering item from M5 P5.2.

---

## P4.2b — Image and video generation (deferred)

15–25 image variants per week and video storyboard rendering both need a paid image/video generation
API. No credential exists, and D4 defers paid AI. When reached, this slots behind the same optional-
integration pattern as Stripe/Resend/Sentry: configured, or a clean no-op.

## Build order

`P4.2a-4` (metering, smallest and unblocks a checklist item) → `P4.2a-1` (guidelines) →
`P4.2a-2` (scorecard) → `P4.2a-3` (experiments). Guidelines precede the scorecard because the
scorecard can optionally read them; experiments come last because they compose the other three.
