# P4.3 — Automated Campaign Management

Milestone: M4 · Depends on: the scheduler backbone (restored 2026-08-13), `@growthos/logic` advisors,
`audit_logs` (P3.5 Slice B)

## Audit of the existing plan (2026-08-13)

**There wasn't one.** Everything the repo specifies about this phase:

- `docs/blueprint/ROADMAP.md` — six unelaborated checkboxes under "Month 12–13"
- `docs/blueprint/PRD.md` line 192 — *"Automated campaign management (AI executes, not just recommends)"*
- `docs/plan/M4-v2-automation/README.md` — a one-line phase summary

No endpoints in `API_SPEC.md`, no tables in `DATA_MODELS.md`, no phase folder. Same shape as the
"47 cross-channel rules" finding: a number and a sentence, not a specification. So this document
designs the phase rather than restating it.

### The six ROADMAP bullets, against what this codebase can actually reach

| # | Bullet | Needs live ad-platform write access? |
|---|--------|--------------------------------------|
| 1 | AI action mode: platform executes recommendations | **Yes** |
| 2 | Auto-pause underperforming ad sets, scale winners | **Yes** |
| 3 | Auto-refresh fatigued creatives | **Yes** |
| 4 | Auto-add converting search terms to the SEO content queue | **No — entirely internal** |
| 5 | Approval workflow: rules + daily batches | **No** |
| 6 | Automation audit log | **No** |

Three of six need a Google Ads developer token and Meta App Review, neither of which exists — and as
of this writing there is no ad-account data to test against either. Three need nothing external, and
they happen to be the three carrying the design risk.

### The safety argument for building it in this order

An action mode that mutates live campaigns is the highest-risk feature in this product: its failure
mode is spending a customer's money incorrectly, overnight, unattended. Building the control plane
first — and running it in dry-run against real signals for as long as credentials take to arrive — is
not a workaround for missing access. It is the correct sequence. By the time a real adapter is
plugged in, the planner, the approval gate, the caps, and the ledger will have been exercised
continuously against real data.

**Decision: split the phase at the credential line.**

---

## P4.3a — Automation control plane (buildable now)

### Goal
A workspace can define automation rules; the scheduler proposes concrete actions from signals the app
already computes; a human approves or rejects them; approved actions execute through an adapter and
are recorded in full. With no platform credentials the adapter is a dry run that changes nothing and
records exactly what it would have sent.

### Data model (new — no blueprint precedent, designed here)

**`automation_rules`** — one row per rule per workspace.
- `id`, `workspace_id`, `action_type`, `enabled`
- `mode`: `suggest` (propose only, always needs approval) | `auto` (auto-approve when within caps)
- `threshold` jsonb — the rule's trigger parameters (e.g. `{ wastedSpendMin: 50 }`)
- `caps` jsonb — safety rails: `{ maxChangePercent, maxActionsPerDay, minDailyBudget }`
- `created_at`, `updated_at`

**`automation_actions`** — the ledger. One row per proposed action, ever.
- `id`, `workspace_id`, `rule_id`, `action_type`
- `status`: `proposed` → `approved` → `executed` | `failed`, or `rejected` / `expired`
- `target` jsonb — what it acts on (`{ platform, campaignId, adSetId }`)
- `payload` jsonb — what it would do (`{ newDailyBudget: 40 }`)
- `previous_value` jsonb — **required before execution**, so any action can be undone
- `reason` text — human-readable justification, generated deterministically (D4: no Claude)
- `approved_by`, `approved_at`, `executed_at`, `result` jsonb, `error` text
- `created_at`

`previous_value` being non-null is an execution precondition, not a nicety: an action that cannot be
described in reverse must not run.

### Components

1. **Planner** (`packages/logic/src/engines/automation-planner.ts`) — pure. Takes the signals the app
   already produces (wasted spend from `google-ads-advisor`, fatigue from `creative-fatigue`,
   converting terms from `search-terms-bridge`) plus the workspace's rules, and returns proposed
   actions. Pure functions, fully unit-testable, no I/O — same shape as every other engine here.
2. **Executor** (`apps/api/src/automation/executor.ts`) — takes approved actions and dispatches to an
   adapter by `target.platform`. Enforces caps and the `previous_value` precondition before dispatch.
3. **Adapters** (`apps/api/src/automation/adapters/`) — one interface, three implementations:
   - `dry-run` — default for any platform without an active connection. Records the intended call,
     changes nothing, returns success. This is what runs today.
   - `content-queue` — **real, works now.** Turns a converting search term into a content brief via
     the existing `content_briefs` machinery. Bullet 4, live from day one.
   - `google-ads` / `meta-ads` — P4.3b.
4. **Scheduler wiring** — the hourly tick already restored in `scheduler/intelligence-scheduler.ts`
   gains a planning pass per workspace. Batching is per-tick with a digest, not the ROADMAP's "daily":
   the loop already runs hourly and an artificial daily gate would just add latency.
5. **API** — `GET/POST/PATCH /workspaces/:id/automation/rules`,
   `GET /workspaces/:id/automation/actions` (paginated), `POST .../actions/:id/approve`,
   `POST .../actions/:id/reject`. Admin+ for rules and approvals; every one audited via `recordAudit`.
6. **Web** — an approval queue: what's proposed, why, what would change, approve/reject per item or
   in bulk. Plus rule configuration in Settings, next to the existing Automation section.

### Explicitly out of scope for P4.3a
Real platform mutation. No adapter that calls Google or Meta ships in this slice.

---

## P4.3b — Live platform adapters (gated)

Implement `google-ads` and `meta-ads` against the adapter interface from P4.3a. Requires a Google Ads
developer token and Meta App Review. No rework in the planner, executor, ledger, or UI — the adapter
is selected by platform at dispatch.

**Gate before any real write:** a workspace must have run in `suggest` mode with a real connection for
a full cycle, and the caps must be set. Auto-mode against a live account is opt-in per rule, never a
default.

---

## Testing

- Planner: pure unit tests in `@growthos/logic` — thresholds, caps, no-signal cases, dedupe.
- Executor: cap enforcement, the `previous_value` precondition, adapter dispatch, failure recording.
- Routes: authz per role, approve/reject transitions, rejected-then-approved is impossible.
- Dry-run adapter: asserts it records intent and mutates nothing.

## Status

See `progress.md`.
