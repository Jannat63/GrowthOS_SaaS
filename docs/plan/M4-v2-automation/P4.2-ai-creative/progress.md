# P4.2 — AI Creative Automation — Progress

Status: [ ]  ·  Updated: 2026-08-20  ·  **Not started** — planned (`plan.md`). Split at the credential
line: P4.2a (brand guidelines, creative scorecard, variant experiments, metering) is buildable now;
P4.2b (image/video generation) is deferred on a paid generation API.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| P4.2a-4 `ai_creatives_generated` metering | [ ] | **Planned.** The metric and plan mapping already exist in `plan-limits.ts`; nothing calls `recordUsage`. Wire it at the generator call sites, mirroring `recommendations_generated`. Closes the last open M5 P5.2 item. |
| P4.2a-1 Brand guidelines system | [ ] | **Planned.** `brand_guidelines` table + a pure `applyBrandGuidelines` filter over existing generator output. |
| P4.2a-2 Creative scorecard | [ ] | **Planned.** Grades creatives that ran, against channel benchmarks *and* the workspace's own median. |
| P4.2a-3 Variant experiments | [ ] | **Planned.** `creative_experiments` structure; measurement honestly gated on live ad delivery. |
| P4.2b Image / video generation | [!] | **Deferred** — 15–25 image variants/week and storyboard rendering need a paid generation API. D4 defers paid AI. |

## Design decisions worth keeping visible

- **"Performance prediction" is deliberately not built as named.** The roadmap bullet asks for
  predicted performance *before a creative runs*. Doing that honestly needs a model trained on
  historical creative outcomes; this codebase has no model, no training data, and D4 defers the
  Anthropic API. A formula returning a confident-looking predicted CTR would be precisely the failure
  `AUDIT-2026-08-13-codebase.md` #14 identified — fabricated numbers rendered as real. It is replaced
  by a **scorecard over creatives that have actually run**, which is a smaller claim and a true one.
- **Two references, not one.** The scorecard grades against published channel benchmarks *and* the
  workspace's own median. A benchmark alone punishes brands in expensive verticals; a self-median
  alone cannot tell a workspace its whole account is underperforming.
- **CTR is a confirming signal, not the primary score.** It is mid-funnel and reflects targeting as
  much as creative quality.
- **Guidelines drop violating variants rather than rewriting them.** Rewriting without a language
  model produces mangled copy; fewer clean variants beat more broken ones.
- **Benchmarks carry their source and date in the code.** They decay, and an unattributed magic
  number cannot be revalidated later.

## Log

- 2026-08-20 — Phase folder created; `plan.md` written. Audited what P4.2 actually specified (one
  README line, one PRD mention) and designed the phase. Split at the credential line, and rescoped
  bullet 4 from "performance prediction" to an observed-data scorecard for the reason above.
