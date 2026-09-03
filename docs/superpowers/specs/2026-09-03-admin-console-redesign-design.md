# Super Admin console — redesign & feature build

**Date:** 2026-09-03
**Status:** built — all seven phases landed 2026-09-03. Tests still outstanding (see §8).
**Extends** `docs/growthos-modular-packages-and-admin.md` §3, which specified the first version of
this surface. Every decision there still holds; this document says what the panel becomes now that
it has been used.

---

## 1. Why

The console shipped as a working first version and has since been operated. What that exposed:

**Defects, not preferences.**

| | |
|---|---|
| "Exit to GrowthOS" is a dead end | It links to `/growth-hub`. Platform staff own zero workspaces by design, and `useWorkspace` returns live data with `memberships: []` rather than falling back — so the console's only escape hatch lands on a dashboard with no workspace. |
| Rows past the first page are unreachable | "Showing 50 of 52 people" with no next page. `parsePage` already supports `limit`/`offset`; the UI never sends them. |
| Only the name is clickable | `workspaces/page.tsx` wraps the `<Link>` around the name cell. In a directory you aim at the row. |
| The audit log drowns in its own noise | `workspace.list`, `user.list` and `health.view` write a row on every fetch, and no admin hook sets `staleTime`, so every window refocus writes another. Nine consecutive entries, all reads, all the same actor. The record of what *changed* is buried under the record of who looked. |
| No sort, no filter, anywhere | Fine at 15 rows. Not at 1,500. |
| Seed and test accounts are indistinguishable from customers | `ws-test-1787933213237@example.com` sits in the same undifferentiated list as a real signup. |

**Design.** The console is the customer dashboard's shell in dark paint — header, 224px sidebar,
card grid — and four nav items do not earn a permanent 224px column. The Overview is four facts in a
1920x1080 viewport and answers no operational question. It also lands three of the five commonest
generated-design tells: the identical-rounded-card kit, tracked-out all-caps monospace eyebrows used
as decoration, and a big-number-with-small-label hero.

**Information.** Nearly everything an operator needs is already in Neon and the panel never asks for
it — see §4.

---

## 2. Decisions

Taken 2026-09-03, in conversation. These are settled; do not silently reopen them.

- **D-A1 — Scope: redesign plus account actions.** Every read-only capability the existing schema
  can serve, plus safe writes (extend trial, grant/revoke platform role, force sign-out). **No
  impersonation** and **no suspend/ban** in this build — impersonation is sequenced last by
  `growthos-modular-packages-and-admin.md` §3.5 as the highest-risk feature, and suspend/ban needs a
  migration plus enforcement in every guard, which reaches far beyond this panel.
- **D-A2 — Navigation: icon rail plus command palette.** A 52px icon rail replaces the 224px
  sidebar; the real navigation is a Cmd/Ctrl-K palette that jumps to any workspace, person, or id.
- **D-A3 — Overview leads with work, not metrics.** "What needs you today" is the hero; platform
  totals sit beneath it as a divided ledger line.
- **D-A4 — Keep recording views; collapse repeats.** The header's promise ("every view is recorded")
  stays literally true. A repeat of the same read by the same actor against the same target within
  five minutes updates the existing row and increments a counter in `metadata` instead of inserting
  a new one. Hooks gain `staleTime` so refocusing a tab stops writing rows at all. The log view
  defaults to changes only, with reads one toggle away.

**Zero migrations.** Every feature in this build is served by tables that already exist. The repeat
counter lives in the existing `metadata` jsonb column precisely so this stays true.

---

## 3. Design language

The console is `dark`-scoped in every theme and uses the Signal tokens from
`apps/web/styles/globals.css` unchanged — no new colours, no hardcoded hex (CLAUDE.md). What changes
is how they are deployed.

### 3.1 The idea

**A ledger, not a dashboard.** The operator's native unit is the row: scan rows, open one, read its
file, write a line into the record. Cards are demoted to genuinely separable objects (an account
file, a destructive action). Queues, figures and lists are rows divided by hairlines. Radius stays
on interactive elements so the surface reads as a console, not a broadsheet.

### 3.2 Colour has one job: say what needs a human

| Token | Means | Example |
|---|---|---|
| neutral / muted | Fine. The default for most rows most of the time. | An active subscription; a trial with three weeks left |
| `--warning` (gold) | Needs you this week. | Trial ends in under 3 days; a connection last synced over 7 days ago |
| `--destructive` (rose) | Broken now. | `past_due`; a failed background job; an inactive connection |
| `--primary` (ember) | Your own action. Never a status. | Buttons, focus rings, the active rail item |

`trialing` becomes **neutral**. It is the normal state of a new account, and rendering it gold made
the entire status column gold, which is why gold currently means nothing. `BrandingProvider` does
not mount under `(admin)`, so `--primary` is stable here and can be relied on.

### 3.3 Type inverts the customer app's roles

- **JetBrains Mono is the working face.** Every id, email, count, amount, plan, status and
  timestamp, with `tabular-nums`, right-aligned in numeric columns. An operator compares values down
  a column, and proportional digits misalign.
- **Archivo appears once per page**, as the page name, at `text-xl` — smaller than the customer app
  sets it. This is a tool, not a landing page.
- **Inter carries only real sentences** — explanations, reasons, empty states, help text.

**No tracked-out all-caps labels anywhere.** Column headers are sentence-case Inter at `text-xs`.
This removes the decorative eyebrows (`Every view is recorded`, `WORKSPACES`, `PLATFORM STAFF`,
`Reason`) outright. The one that carries meaning — "every view is recorded" — is not deleted but
relocated to where it is structural: the audit-log page, the account file's admin-history tab, and
the operator's own menu.

### 3.4 The state spine

The one place this design spends boldness. Each row in a queue or directory carries a 2px marker on
its left edge: transparent when fine, gold when it needs attention, rose when broken. Status stops
being a column you read and becomes an edge you scan — which is what makes a long directory
tractable. It is a functional device (a ledger's margin mark), not decoration, and it is the only
such device on the surface.

Implemented as `border-l-2` on the row with a token colour, so it costs no extra element and works
inside a `<TableRow>`.

### 3.5 Time

Relative first, always: `9d ago`, `in 2 days`, `3 min ago`. The absolute value goes in `title` so it
is one hover away. Operators reason in "how long has this been broken", not in `8/13/2026`. One
helper, `relativeTime()`, in `apps/web/lib/utils/`.

### 3.6 Motion

One orchestrated moment: the command palette opening. Everything else is response to an action — a
row tinting on hover, a confirmation expanding. No entrance animations on cards or sections.
`prefers-reduced-motion` respected.

### 3.7 Layout

```
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  gold hairline, 2px, full bleed
┌────┬───────────────────────────────────────────────────┐
│ ▤  │  ⌕ Find an account, a person, an id…        ⌘K    │  48px, one rule beneath
│    ├───────────────────────────────────────────────────┤
│ ▣ 3│  Console                                 Shihab ▾ │  Archivo xl + operator menu
│ ◫  │                                                   │
│ ☷  │  Needs you                                        │
│ ▤  │ ┃ Acme Retail        past due 9 days     $199/mo  │  rose spine
│    │ ┃ Nova Labs          trial ends in 2 days         │  gold spine
│    │ ┃ Rivet Co           Google Ads synced 9d ago     │  gold spine
│    │                                                   │
│    │  ┌─────────┬────────┬─────────┬────────────────┐  │
│ ─  │  │ 15      │ 52     │ $1,160  │ 4              │  │  divided ledger line,
│ ⏻  │  │ workspaces people   mrr      new this week  │  │  not four cards
│    │  └─────────┴────────┴─────────┴────────────────┘  │
│    │  starter ████████████████░░ 14   growth ░ 1       │
└────┴───────────────────────────────────────────────────┘
```

Left-aligned throughout; numbers right-aligned within their columns. Content is full-bleed — tables
want the width — with no `max-w` container. The rail collapses to a bottom bar under `md`.

---

## 4. What the database already knows

Every row below is served by a table that exists today. This is the feature list, and it is mostly a
matter of asking.

| Source | Surfaced as |
|---|---|
| `subscriptions.status = 'past_due'` | Overview queue; a directory filter |
| `subscriptions.stripeCustomerId` / `stripeSubscriptionId` | Deep link out to Stripe from the account file |
| `subscriptions.trialEndsAt`, `trialReminderSentAt` | Trials ending soon; whether the reminder actually fired |
| `subscriptions.cancelAt` | Cancelling-soon queue |
| `usage_records` against `PLAN_LIMITS` (via the existing `getUsageSummary()`) | Usage tab: bars against the plan's ceiling. At the ceiling is an upgrade conversation; far below it on Scale is a churn risk |
| `background_jobs` (status, error) | Failed and stuck jobs, platform-wide and per account |
| `platform_connections.isActive`, `lastSyncedAt` | Broken and stale integrations — the commonest cause of a support ticket |
| `session` (`ipAddress`, `userAgent`, `updatedAt`, `expiresAt`) | Last seen; active devices; force sign-out |
| `workspace_invitations` | Invitations that were never accepted |
| `audit_logs` (per-workspace) | What the *customer* did — the timeline support actually needs |
| `api_keys`, `webhook_endpoints` and deliveries | Integration health for Scale accounts |
| `admin_audit_log` | Filterable ledger; and per-account "who from our side has looked at this" |

**Deliberately excluded.** `user.emailVerified` is not surfaced: `apps/api/src/auth.ts` does not
enable email verification, so the column is `false` for every account and would read as a
platform-wide fault. For the same reason there is no "resend verification" action — there is nothing
to resend. Revisit both if verification is ever turned on.

**One addition to `@growthos/types`:** `PLAN_PRICE_USD_CENTS` (plus a `planPriceLabel` helper), beside `PLAN_LIMITS`. MRR needs a canonical
monthly price, and the only prices in the repo today are display strings hardcoded in
`app/(marketing)/pricing/page.tsx` ($79 / $199 / $399) and Stripe price *ids* in `billing.ts`. The
marketing page is repointed at the new constant, so the figure has one home. This is the same rule
CLAUDE.md applies to the seeded demo figures: do not re-derive, import.

---

## 5. API surface

All under `/api/v1/admin`, all requiring a platform role and none touching workspace membership.
Every route continues to write an audit entry.

### Changed

- `GET /admin/overview` — replaces `GET /admin/health`. Returns the totals it already did, plus
  `mrrCents`, `signupsLast7d`, and an `attention` object holding the four queues (past due, trials
  ending, stale or inactive connections, failed jobs), each item carrying enough to render a row and
  link to the account.
- `GET /admin/workspaces` — gains `sort` and `filter` (`past_due` | `trial_ending` |
  `no_connections` | `cancelling`), keeps `search` and paging. Each row gains `trialEndsAt` and
  `lastActivityAt`.
- `GET /admin/users` — gains `sort` and `filter` (`staff` | `no_workspace`), keeps `search` and
  paging. Each row gains `lastSeenAt`.
- `GET /admin/audit-log` — gains `actor`, `action`, `targetType`, `targetId`, `from`, `to`, and
  `mutatingOnly` (default true).

### New

- `GET /admin/workspaces/:id/usage` — `getUsageSummary()` against `PLAN_LIMITS`.
- `GET /admin/workspaces/:id/activity` — the workspace's own `audit_logs` plus its recent
  `background_jobs`, merged and time-ordered.
- `GET /admin/workspaces/:id/admin-history` — `admin_audit_log` filtered to this target.
- `POST /admin/workspaces/:id/extend-trial` — `{ days: 1..90, reason }`. super_admin only.
- `GET /admin/users/:id` — profile, memberships with roles, active sessions, last seen.
- `POST /admin/users/:id/platform-role` — `{ role: 'support_agent' | 'super_admin' | null, reason }`.
  **super_admin only.** Refuses to change the caller's own role, so the last super admin cannot lock
  themselves out of the console. This does not weaken `input: false` on the Better Auth field: the
  role is still unsettable through any customer-facing form, and is now settable by an audited
  super-admin route as well as by `packages/db/scripts/grant-admin.ts`.
- `POST /admin/users/:id/revoke-sessions` — `{ reason }`. Deletes the user's sessions. super_admin
  only.

Every write takes a reason of 10 or more characters, matching the existing plan-override contract,
and records before/after in `metadata`.

### `logAdminAction` change (D-A4)

For read actions only: if a row exists with the same `actorUserId`, `action`, `targetType` and
`targetId` and a `created_at` within five minutes, update its `created_at` and set
`metadata.repeats = (metadata.repeats ?? 1) + 1` instead of inserting. Writes always insert. Still
never throws.

---

## 6. Pages

1. **Overview** — the work queue first: past due, trials lapsing, stale connections, failed jobs,
   each row spined by severity and linking straight to the account. Beneath it the divided ledger
   line (workspaces, people, MRR, new this week) and the plan ramp. When nothing needs attention the
   queue says so plainly and the page is short — that is a good day, not an empty state to
   apologise for.
2. **Workspaces** — full-width sortable directory, whole rows clickable, paginated, with the filter
   chips from §5. Plan and status collapse into one column so gold appears only when something is
   wrong.
3. **Workspace detail — the account file.** Tabs: *Account* (subscription, plan override, extend
   trial, Stripe link), *People*, *Connections* (last sync, what is broken), *Usage* (bars against
   the plan ceiling), *Activity* (their audit log and jobs), *Admin history* (who from our side has
   looked at this account, and when).
4. **People** — directory with the same treatment, plus a filter for platform staff.
5. **Person detail — new.** Profile, memberships and roles, active sessions with device and last
   seen, and the staff actions: grant or revoke a platform role, force sign-out.
6. **Audit log** — a filterable ledger, defaulting to changes only, with reads one toggle away.
   Repeat reads render as `Browsed people ×7`.
7. **Welcome** — unchanged in behaviour, restyled to the new language.

---

## 7. Build order

Each phase leaves the console working.

1. **Foundations** — `PLAN_PRICE_USD_CENTS`; `relativeTime()`; the shadcn primitives this needs in
   `packages/ui` (`command`, `select`, `separator`, `sheet`); `staleTime` on the admin hooks;
   `logAdminAction` repeat-collapsing.
2. **Shell** — rail, command palette, header, operator menu, and the "Exit to GrowthOS" fix.
3. **Overview** — `GET /admin/overview` and the queue-first page.
4. **Directories** — sort, filter, pagination, clickable rows, the state spine, for both tables.
5. **Account file** — the six tabs and their routes, including extend-trial.
6. **Person detail** — the page, its route, and the two staff actions.
7. **Audit log** — filters, mutating-only default, repeat rendering.

## 8. Testing

`apps/api` route tests for every new endpoint, covering the role split (a `support_agent` is refused
every write), the reason requirement, and the self-demotion guard. A unit test for the
repeat-collapsing branch of `logAdminAction`. `apps/web` unit tests for `relativeTime()` and the
severity mapping.

Note: the API suite has not been run since workspace foreign keys landed, and those constraints turn
previously silent inserts into errors. Expect to fix fixtures that insert rows for workspaces they
never created.

## 9. Out of scope

Impersonation (`growthos-modular-packages-and-admin.md` §3.5 — sequenced last, deliberately).
Suspend and ban. The support inbox (Part C — its own decision). Editing a customer's campaign or
creative data on their behalf (§3.6). A permissions builder for custom admin roles (§3.6).
