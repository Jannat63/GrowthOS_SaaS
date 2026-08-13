# P4.3 — Progress

Status: [~]  ·  Updated: 2026-08-13  ·  **P4.3a complete, P4.3b gated.**

The phase was split at the credential line — see `plan.md` for the audit that produced that decision.
Everything that does not require a Google Ads developer token or Meta App Review is built and running;
the three ROADMAP bullets that do are deliberately not started.

| Sub-phase | Status | Notes |
|-----------|--------|-------|
| P4.3a Automation control plane | [x] | Rules, planner, ledger, executor, adapters, approval queue, scheduler wiring. Runs in dry-run against real signals. |
| P4.3b Live platform adapters | [!] | **Blocked** — needs a Google Ads developer token + Meta App Review, and an ad account with real data to test against. One seam to fill (`REAL_ADAPTERS` in `executor.ts`); no rework anywhere else. |

## ROADMAP bullets, against what shipped

| # | Bullet | Status |
|---|--------|--------|
| 1 | AI action mode: platform executes recommendations | [~] Control plane executes; the platform side is a dry run until P4.3b. |
| 2 | Auto-pause underperforming ad sets, scale winners | [~] Proposed and approvable; dispatch is dry-run. |
| 3 | Auto-refresh fatigued creatives | [~] Proposed from real per-workspace `creative_performance` data (un-gated 2026-08-13); dispatch is dry-run. |
| 4 | Auto-add converting search terms to the SEO content queue | [x] **Live.** `content-queue` adapter writes a real content brief. |
| 5 | Approval workflow: rules + batches | [x] Per-tick proposals, human approve/reject, admin+ only. |
| 6 | Automation audit log | [x] `automation_actions` is the ledger; every rule change and approval also goes through `recordAudit`. |

## What shipped (P4.3a)

| Layer | Artifact | Tests |
|-------|----------|-------|
| DB | `packages/db/src/schema/automation.ts` — `automation_rules` + `automation_actions`; migration `0014_awesome_jack_flag.sql` | — |
| logic | `engines/automation-planner.ts` — pure `planActions(signals, rules, state)`, `targetKey()`, `requiresPreviousValue()`. Four action types: `pause_campaign`, `adjust_budget`, `refresh_creative`, `queue_content` | 19 ✓ |
| API | `automation/rules.ts` (list/upsert/delete), `automation/actions.ts` (propose/list/approve/reject), `automation/executor.ts` (the three gates), `automation/adapters/{dry-run,content-queue}.ts` | 13 ✓ |
| API | 6 routes on `/api/v1/workspaces/:id/automation/*` — rules GET/PATCH/DELETE, actions GET (paginated), approve, reject. Admin+ for rules and approvals; all audit-logged | — |
| API | `scheduler/intelligence-scheduler.ts` gains a planning pass per workspace on the existing hourly tick | 2 ✓ |
| Web | `/automation` approval queue — proposal, reason, what would change, per-item and bulk approve/reject, dry-run banner; `useAutomationQueue.ts`; sidebar entry | build ✓ |

Commits: `1edcddb` (tables), `a79905e` (planner), `a6c69d1` (control plane).

## Design decisions worth not re-litigating

**Policy lives in the executor, never in an adapter.** An adapter receives an action already proven
approved, reversible, and within caps. This is what stops a future live integration from bypassing a
safety check that was written before it existed.

**`previousValue` is an execution precondition, not metadata.** An action that overwrites existing
state and cannot say what it would overwrite is refused. Additive actions (`queue_content`) are
exempt via `requiresPreviousValue`.

**Caps are re-read at execution, and a violation refuses rather than clamps.** A rule can be edited
between proposal and approval. Executing a quietly-clamped version of what a human approved is the
precise failure this design exists to prevent, so it errors instead. Only `maxChangePercent` is
genuinely re-checkable today — `maxActionsPerDay` is a planning-time bound, and `minDailyBudget`
needs a campaign's real daily budget, so it becomes enforceable in P4.3b alongside the adapter that
can read it.

**`REAL_ADAPTERS` is empty on purpose.** Registering a stub for a platform with no credentials would
make the seam look finished. Resolution requires both a registered adapter *and* an active
connection; either missing falls back to the dry run, so a half-finished integration cannot leak a
call to a live account.

**Batching is per-tick, not the ROADMAP's "daily".** The intelligence loop already runs hourly; an
artificial daily gate would only add latency to a proposal a human still has to approve.

## Log

- 2026-08-13 — Phase folder created. Audited the existing plan and found there wasn't one: six
  unelaborated ROADMAP checkboxes, one PRD line, no endpoints in `API_SPEC.md`, no tables in
  `DATA_MODELS.md`. Same shape as the "47 cross-channel rules" finding. `plan.md` designs the phase
  rather than restating it, and splits it at the credential line.
- 2026-08-13 — **P4.3a shipped.** See the table above.
- 2026-08-13 — `refresh_creative` un-gated. It had been excluded from the planner because
  `getFatigueResults()` returned identical fixture data for every workspace, which would have meant
  proposing an action against another customer's creative (codebase audit #6). Fatigue now reads
  per-workspace rows from `creative_performance`, so the signal is real and the gate came off. The
  gating mechanism itself was kept — it is what stops a future adapter being wired to a signal that
  isn't real yet.
