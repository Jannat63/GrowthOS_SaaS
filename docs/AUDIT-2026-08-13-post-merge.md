# Post-merge engineering audit — 2026-08-13

Audit of `shihab-restructure` immediately after merge commit `a74c680` (`Merge branch 'main' into
shihab-restructure`), where every conflict was resolved by taking **main's** side.

Two independent lines of work had built overlapping subsystems: this branch (WebSocket transport,
white-labeled PDF export, autonomous scheduled intelligence loop) and `main` (M5 billing, public
API, SEO extras, its own node-cron scheduler, its own WebSocket layer). Taking "theirs" everywhere
kept main's implementation of each overlap and left this branch's implementation on disk,
disconnected — plus deleted one feature that only existed here.

**Verification status:** this audit and every fix below are static work — file reading, git
archaeology, and hand-checked edits. `pnpm typecheck`, `build`, `lint`, and the test suites were
**not run**, at the user's explicit instruction. Nothing here is verified by execution. See
[Verification still owed](#verification-still-owed).

Legend: `[x]` fixed · `[!]` deferred (reason given) · `[ ]` open

---

## P0 — Merge fallout: broken or disconnected code

### [x] 1. The autonomous automation loop is disconnected from the app
The feature built in `10110f5` (per-workspace scheduling cadence, Redis-locked ticks, persistent
alert de-duplication, run observability) was on disk with nothing reaching it: `apps/api/src/scheduler/`
had no importer, the `/automation` and `/scheduler/runs` endpoints were gone from `routes/v1.ts`, and
`AutomationSection.tsx` was no longer rendered by the settings page.

**Fixed by** restoring it *onto main's* infrastructure rather than reinstating a second stack:
- `scheduler/intelligence-scheduler.ts` now publishes through `../ws.js` (the surviving transport)
  using main's event names — `report:ready` became `intelligence:report_ready`, which is what
  `WsEventType` declares and what `useWorkspaceSocket.ts` already handles.
- `scheduler.ts` became the single scheduler: `startScheduler()` registers the daily trial reminder
  and an hourly call into `runSchedulerTick()`. Its own `runIntelligenceRefresh` (unguarded, every
  workspace, every 4h) and `runMerAnomalyCheck` were removed — the tick does both, with a lock and
  with de-duplication.
- `GET/PATCH /api/v1/workspaces/:id/automation` and `GET /api/v1/workspaces/:id/scheduler/runs`
  restored in `routes/v1.ts` (GET viewer+, PATCH/runs admin+, PATCH audited).
- `AutomationSection` remounted in `app/(dashboard)/settings/page.tsx`.
- `scheduler/intelligence-scheduler.test.ts` updated to mock `../ws.js` and assert the new event
  shapes; `scheduler.test.ts`'s header corrected (it now needs Redis as well as Neon).

### [x] 2. `packages/db/src/schema/automation.ts` was not exported from the schema barrel
`schema.automationAlerts` / `schema.schedulerRuns` did not exist on the exported namespace while
`scheduler/{queries,alerts}.ts` referenced them — a typecheck failure for the whole package, since
`tsc` compiles everything under `src/` whether or not it is imported.

**Fixed:** `export * from './automation.js'` added to `packages/db/src/schema/index.ts`.

### [x] 3. `apps/api/src/reports/weekly-pdf.ts` imported packages the API no longer depends on
It imported `react` and `@react-pdf/renderer`; neither survives in `apps/api/package.json` (main's
Puppeteer + HTML-template path won). Unresolvable imports in dead code.

**Fixed:** deleted `apps/api/src/reports/` (implementation + test). The live path is
`pdf-report.ts` + `pdf-report-generate.ts`, wired at `routes/v1.ts`.

### [x] 4. Duplicate WebSocket implementation, on a different Redis channel
Live: `apps/api/src/ws.ts` (channel `growthos:ws-events`) + `routes/ws.ts`, which every consumer and
the Python worker (`apps/worker/app/jobs.py`) already use. Dead: `apps/api/src/ws/{server,rooms,events}.ts`
on channel `ws:events` — and, found while sweeping, its worker-side twin `apps/worker/app/events.py`
(same dead channel, different envelope shape, imported only by its own test).

**Fixed:** deleted `apps/api/src/ws/` (5 files), `apps/worker/app/events.py`, and
`apps/worker/tests/test_events.py`.

### [x] 5. Duplicate web real-time stack
Live: `WorkspaceSocketProvider` + `useWorkspaceSocket`, mounted in the dashboard layout. Dead:
`RealtimeProvider.tsx` (no importer) + `useRealtime.ts` + `useRealtime.test.ts` + `lib/realtime/client.ts`.

**Fixed:** deleted all four.

### [x] 6. Migration files existed that the migrator would never run
`0009_rainy_zarek.sql` and `0010_whole_pestilence.sql` were absent from `meta/_journal.json` (main's
`0009_billing_core` / `0010_trial_reminder_column` / `0011_api_keys` had taken those numbers), so a
fresh environment would never create `automation_alerts` / `scheduler_runs` — while
`workspaces.automation_config` was still declared in `schema/auth.ts`.

**Fixed:**
- renamed to `0012_automation_config.sql` / `0013_automation_tables.sql` and added both to the journal;
- rewrote their DDL as `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`, because the dev
  Neon database already has these objects from the pre-merge numbering — re-running must be a no-op,
  not an error;
- hand-authored `meta/0012_snapshot.json` and `0013_snapshot.json` (modelled on `0011`, with the
  `prevId` chain extended), since the merge had overwritten the branch's snapshots. Without them the
  next `drizzle-kit generate` would emit a *second* migration creating the same tables.

### [x] 7. `docs/plan` lost the automation-loop record
`3c92c41`'s updates to `PROGRESS.md` and `M3-v1-channels/progress.md` were overwritten, leaving zero
mentions of a shipped feature in the documents CLAUDE.md names as the source of truth for progress.

**Fixed:** `PROGRESS.md` header now records the merge and points here; the P3.4 row, the Scheduler
row, and a new P4.3 row describe the loop as it now exists (restored, consolidated, hourly).

---

## P1 — Real defects in the merged-in code

### [x] 8. Standing MER anomalies re-alerted every 4 hours, forever
`scheduler.ts`'s `runMerAnomalyCheck` published `analytics:mer_alert` on every tick where
`anomaly.detected` was true, with no memory of what it had already alerted on — and the web client
raises a toast per event. A workspace with a persistent anomaly got the same alert 6× a day.

**Fixed:** that cron path is gone. Alerts now flow through `refreshWorkspace`, which writes a
signature per `(workspace, alertType)` into `automation_alerts` and emits only when the signature
changes (`shouldEmitAlert`). A standing condition stays silent; a *different* swing re-alerts.

### [x] 9. `startWsRedisSubscriber()` ran inside `buildApp()`
`routes/ws.ts` called it at plugin registration, so every route test that built the app opened a
Redis subscriber it never asked for — the exact discipline `scheduler.ts` documents avoiding.

**Fixed:** the call moved into `subscribeSocket()` in `ws.ts`, so the fan-out subscriber starts the
first time a socket actually joins a room. With no local sockets there is nothing to deliver to, so
this is the earliest point it is genuinely needed — and `routes/ws.test.ts`, which opens a real
socket before publishing, still exercises the real path.

### [x] 10. Nothing prevented two API instances running the same scheduled job
`checkTrialsEndingSoon` read candidate rows and *then* wrote `trialReminderSentAt` per row — a
select-then-update with no guard, so two instances ticking together both passed the
`!sub.trialReminderSentAt` check and both emailed the same customer.

**Fixed on two levels:**
- both cron tasks now run under `withRedisLock` (`scheduler/lock.ts`), so N instances produce one run;
- the reminder is *claimed* before it is sent: the update carries `WHERE trial_reminder_sent_at IS
  NULL` and returns the claimed row, and the email is sent only if a row was actually claimed. The
  recipient lookup happens before the claim, so a workspace with no owner email keeps its reminder
  for the next run instead of burning it.

### [x] 11. Stripe webhook retries re-sent the "trial converted" email
`checkout.session.completed` sent `sendTrialConvertedEmail` unconditionally. Stripe retries until it
gets a 2xx and a retry carries the same event; `syncSubscription` is idempotent, the email was not.

**Fixed:** the handler reads the stored `stripeSubscriptionId` before syncing and sends only when it
differs from the incoming subscription's id — i.e. only on first delivery. Retries still sync, silently.

### [x] 12. `POST /api/v1/workspaces` blamed the slug for every failure
The catch-all returned "the URL slug may already be taken" and discarded the underlying error, so a
Better Auth or database outage reached the user as a validation problem and left no operator trace.

**Fixed:** `request.log.error({ err }, 'createOrganization failed')` before throwing. The user-facing
message is unchanged — a duplicate slug really is the common case.

---

## P2 — Contract drift and known gaps

### [x] 15. The Stripe webhook sat behind the global IP rate limiter
200 req/min per IP applied to `POST /api/v1/billing/webhook`; a burst of deliveries from one source
IP could be 429'd, which Stripe treats as a failed delivery and retries — turning a spike into a
retry storm.

**Fixed:** `allowList` on the rate-limit plugin exempts that one route. It is authenticated by
webhook signature, which is the stronger control.

### [x] 17. Minor query hygiene
**Fixed:** `.limit(1)` added to the in-flight-job lookup in `routes/v1.ts`. The trial-reminder scan
is now bounded by `WHERE trial_reminder_sent_at IS NULL` as a side effect of #10, so it no longer
reads every trialing subscription on every run.

### [!] 13. The Growth Hub's headline metrics are permanently mock — DEFERRED
`useGrowthHub.ts` calls `/workspaces/:id/analytics/growth-hub`, which exists nowhere in `apps/api`
(zero matches). `liveOrMock` silently serves fixture data, so the dashboard home page shows invented
KPIs while M2 is marked complete. The hook's comment still says "the endpoint arrives in M2".

**Deferred, not hidden:** this is a missing feature, not merge damage — building it means defining
the KPI set against real ClickHouse data and verifying the numbers, which cannot be done responsibly
without running anything. **This is the single most user-visible item on the list** and should be
the next piece of work.

### [!] 14. List endpoints do not paginate as the contract requires — DEFERRED
CLAUDE.md specifies `limit`/`offset` + `total` for list endpoints; only `GET /audit-logs` complies.
`recommendations`, `members`, `connections`, `content-briefs` return unbounded arrays, and
`api-keys` returns `{ keys }` rather than `{ data, total }`.

**Deferred:** every one of these has a web caller that destructures the current shape, so this is a
coordinated API + web change that needs the test suites to land safely.

### [!] 16. Background work logs via `console.*` instead of the Fastify logger — DEFERRED
`scheduler.ts`, `ws.ts`, and `scheduler/*` use `console.log`/`console.error`, so scheduled-job output
bypasses pino and carries no request context.

**Deferred:** these modules have no Fastify instance in scope; doing it properly means exporting a
root logger and threading it through, and two existing tests assert on `console` spies.

### [ ] 18. `README.md` was replaced by an unrelated commit — NEEDS A HUMAN
`8c4b7b5`, titled "Update print statement from 'Hello' to 'Goodbye'", added 1011 lines to
`README.md`; `3774322` then removed one line ("Remove 'Jannat' from README"). The commit message
describes something entirely different from the change. Not touched here — someone who knows what
that README is supposed to say should read it.

---

## Verification still owed

Nothing below has been executed. In order:

1. `pnpm typecheck` — the highest-value check by far. It is what proves #2/#3 are actually resolved
   and that the rewired scheduler, the restored routes, and the deletions leave no dangling import.
2. `pnpm --filter @growthos/api test` — needs Neon + Redis + ClickHouse. Covers the rewritten
   scheduler tests, `routes/ws.test.ts` (against the lazy subscriber change), and `billing.test.ts`
   (against the claim-before-send rewrite).
3. `pnpm --filter @growthos/web build` — the settings page and hook wiring.
4. `pnpm --filter @growthos/db exec drizzle-kit generate` on a scratch branch — should report **no
   changes**. If it emits a migration, the hand-authored snapshots in #6 are wrong and should be
   replaced by whatever it generates.
5. A real tick end to end: start the API, confirm one `scheduler_runs` row per hour, confirm a
   repeated MER anomaly emits once rather than every tick.
