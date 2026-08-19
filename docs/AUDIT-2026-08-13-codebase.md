# Codebase audit — 2026-08-13

A whole-codebase review of GrowthOS as it stands after the post-merge repair, the Growth Hub /
plan-enforcement / pagination work, and P4.3a. Separate from
`AUDIT-2026-08-13-post-merge.md`, which covers only the damage from the `main` merge.

**Method:** read every entry point (routes, guards, crypto, OAuth, worker consumer, web data layer),
plus targeted sweeps for known failure patterns — swallowed errors, unparameterised SQL, unguarded
routes, unvalidated config, unbounded queries. Findings below are things I confirmed by reading the
code, not inferred from docs.

## Status

| # | Finding | Status |
|---|---------|--------|
| 1 | Client discards the API's error message | ✅ fixed |
| 2 | `liveOrMock` fabricates data for refused requests | ✅ fixed |
| 3 | 4s timeout below the real latency floor | ✅ fixed |
| 4 | Worker loses jobs on crash | ✅ fixed |
| 5 | Nothing detects a stuck job | ✅ fixed |
| 6 | Automation acts on global fixtures | ✅ fixed for fatigue — now reads per-workspace `creative_performance`, and `refresh_creative` is un-gated. `getScoredSearchTerms()` is still fixture-derived, deliberately: `queue_content` is additive, internal and idempotent, so it carries none of the risk |
| 7 | Security-critical secrets unvalidated at boot | ✅ fixed |
| 8 | OAuth callback swallows failures unlogged | ✅ fixed |
| 9 | Test suite unreliable | ✅ fixed — the diagnosis below was **wrong**; see "What it actually was" |
| 10 | No error monitoring or uptime checks | ✅ fixed for monitoring — `/health/ready`, crash reporting gated on `SENTRY_DSN`, process-level handlers. **Still nothing polls the endpoint** — needs a host and an uptime service |
| 11 | Background work logs via `console.*` | ✅ fixed — shared pino logger; zero `console.*` left outside `env.ts`'s pre-boot banner |
| 12 | Swallowed `catch {}` blocks | ✅ fixed — all 7, one of which hid a real bug |
| 13 | `README.md` replaced by an unrelated commit | ✅ fixed — it was a verbatim copy of the blueprint, so nothing was lost; replaced with a real orientation README |
| 14 | Seeded data presented as real | ✅ fixed — three-state provenance (`live`/`sample`/`offline`) plus a plain notice until a channel is connected |

**13 of 14 fixed.** The one remaining item is the uptime half of #10: `/health/ready` exists and
answers correctly, but nothing polls it, and nothing can until this is deployed somewhere with a
URL. That is a hosting decision, not code.

The list below is the original audit, unedited. Two of its conclusions turned out to be wrong, and
both are worth keeping visible rather than quietly correcting — see the notes on #9 and #13.

---

## What is solid (worth not breaking)

These were checked specifically and came back clean:

- **Authorization is complete.** All 40 workspace-scoped routes call `requireWorkspaceMember`, and
  every route calls `requireUser`. Verified by parsing each route body, not by eyeballing.
- **`guards.ts` fails closed.** An unrecognised role ranks −1, so Better Auth's default `"member"`
  string clears no threshold. This is the correct direction and the comment explains why.
- **Every ClickHouse query is parameterised.** No string interpolation of user input anywhere.
- **Token encryption is textbook** AES-256-GCM with a random IV per encryption and an auth tag.
- **OAuth `state` is HMAC-signed** with a nonce, a 10-minute TTL, and a timing-safe comparison.

---

## P0 — Users see wrong things, or work silently disappears

### 1. The web client throws away every error message the API sends
`apps/web/lib/api/client.ts:26` — `throw new ApiError(\`API ${res.status} on ${path}\`)`.

The API returns `{ error: { code, message, statusCode } }` with messages written for humans: *"You've
reached your starter plan's limit (5) for this feature this week."*, *"This action was approved at
20%, but the rule's cap is now 10%."* None of it reaches the user. Every failure surfaces as
`API 402 on /workspaces/x/recommendations`.

Every careful error message in the API is currently dead weight. **Fix:** parse the envelope, keep
`code` and `message` on `ApiError`, and render `message`.

### 2. `liveOrMock` turns permission errors, plan limits, and timeouts into fabricated data
`apps/web/lib/hooks/liveOrMock.ts:13` — `catch { return { data: mock(), source: "mock" } }`, used by
25 hooks.

It catches *everything*. A 403, a 402, an expired session, or a slow response all produce invented
business numbers rendered as though they were real, distinguished only by a small badge. Someone
deciding a budget can be looking at fiction.

This was a defensible M1 decision ("the app renders without a backend"). It is no longer defensible
now that the app has real data, real money, and real permissions. **Fix:** fall back only on network
/ 5xx failures; let 4xx propagate to the UI as errors.

### 3. A 4-second client timeout, against a database measured at 5–17 seconds
`client.ts:24` — `AbortSignal.timeout(4000)`.

During this audit a single `resolveApiKey` query took **17 seconds** against Neon, and a trivial
`listActiveWorkspaceIds` took 5.7s. Combined with #2, a healthy-but-slow backend renders as mock
data. The PDF export route (Puppeteer) is also plausibly over 4s.

**Fix:** raise the timeout substantially, and make timeouts visible rather than silently mocked.

### 4. The worker loses jobs on crash
`apps/worker/app/consumer.py:33` — `redis.blpop(...)`.

`BLPOP` removes the job the instant it is read. If the worker dies between that and completion, the
envelope is gone: no acknowledgement, no retry, no dead-letter queue. The `background_jobs` row stays
`queued`/`processing` forever and the client polls a job that will never finish.

`enqueue.ts:5` claims *"a worker crash never loses a job"* — that is true of the database row and
false of the work. **Fix:** reliable-queue pattern (`BLMOVE` into a processing list, remove on
success, reclaim on startup), and correct the comment.

### 5. Nothing ever detects a stuck job
There is no timeout sweep, no reaper, no maximum age. A job marked `processing` when a worker dies
stays `processing` indefinitely, and the UI polls it forever.

**Fix:** a scheduler pass that fails jobs stuck beyond a threshold — the scheduler already exists.

### 6. Automation acts on global fixtures, not per-workspace data
`getFatigueResults()` (`fatigue.ts:8`) and `getScoredSearchTerms()` (`search-terms.ts:10`) take **no
`workspaceId`**. They return identical fixture data for every workspace.

Tolerable while it only drove suggestions. It now drives **actions**: P4.3a proposes
`refresh_creative` for the same "Creative A" and `queue_content` for the same keywords in every
workspace. Two customers get the same content brief.

**Fix:** either scope these to the workspace (as `ad_performance` already is via
`ensureAdPerformanceSeed`) or exclude fixture-derived signals from the automation planner until they
are real. The second is smaller and more honest.

---

## P1 — Operational and security gaps

### 7. Security-critical secrets are not validated at boot
`env.ts` requires only `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. The API reads **22**
environment variables, including `TOKEN_ENCRYPTION_KEY` (at-rest OAuth token encryption) and
`OAUTH_STATE_SECRET` (CSRF protection on the OAuth callback). Neither is required nor warned about.

Missing them doesn't fail at boot — it fails mid-OAuth, as a generic redirect. **Fix:** require both
when any OAuth provider is configured; add Google credentials to the optional-integration warning
list, which currently mentions Stripe and Resend but not the one integration that actually works.

### 8. The OAuth callback swallows every failure with no logging
`routes/connections.ts:69` — `catch { return reply.redirect(...connect_error=1) }`.

Token exchange failures, provider outages, and encryption errors are indistinguishable, and none is
logged. An operator debugging a broken integration has nothing. Same class as the `POST /workspaces`
bug already fixed. **Fix:** `request.log.error({ err })` before redirecting.

### 9. The test suite is not trustworthy
Documented in `apps/api/vitest.config.ts`. Across five full runs it failed differently every time —
four different sets of files, every one passing in isolation, with `Error connecting to database:
fetch failed` rather than assertion failures. `fileParallelism: false` was tried and reverted: it
tripled runtime (75s → 256s) and still produced 8 failures, which rules out connection concurrency.

Root cause is ~150 integration tests against a remote free-tier Neon.

**ATTEMPTED AND REVERTED — read this before trying again.** The obvious fix is a local Postgres in
`docker-compose.yml`, but `packages/db/src/client.ts` uses `drizzle-orm/neon-http`, which speaks
Neon's own protocol and cannot talk to an ordinary Postgres. Supporting both means selecting the
driver from the connection string and adding `pg`.

Adding `pg` splits `drizzle-orm` into **two separately-resolved instances** under pnpm (it is a peer
dependency, so a new peer set produces a new resolution hash). Types from one are then not
assignable to the other, and the API package fails to compile with ~17 errors of the form
`SQL<unknown> is not assignable to SQL<unknown>`. Adding `pg` to `apps/api` as well does not fix it.
Restoring the committed lockfile and reinstalling does.

So the next attempt needs to solve the dependency graph first, not the database. Options worth
evaluating, cheapest first:
1. `pnpm.overrides` or a shared peer set pinning one `drizzle-orm` instance across the workspace.
2. A dedicated Neon branch per test run — keeps one driver, gets isolation, but not speed or
   offline capability.
3. Moving all database access behind `packages/db` so no other package imports `drizzle-orm`
   directly. The cleanest long-term shape, and the largest change.

The rejected shortcut is worth naming: leaving the duplicate in place "because tests pass" would
have put two copies of the ORM in the production bundle to fix a test problem.

#### What it actually was — the analysis above is wrong, and instructively so

Everything above is a correct description of a real dependency problem, and an incorrect diagnosis
of *this* one. It reasoned from the proposed fix (local Postgres) backwards, and never checked the
one thing the error message was pointing at.

`@neondatabase/serverless` makes **exactly one `fetch` per query, with no retry**, and wraps a
thrown fetch as `NeonDbError("Error connecting to database: ...")` — verbatim the error every
failing run produced. The database was never the problem. An unretried network call was.

Three causes, all fixed:

1. **No retry in the driver.** `neonConfig.fetchFunction` replaces the transport, so the retry lives
   in `packages/db/src/retry.ts` and protects production too. Reads retry on any transient failure;
   writes only when the request provably never arrived, because Neon's HTTP endpoint gives each
   statement its own implicit transaction and a replayed INSERT has nothing to roll back.
2. **A 5-second default test timeout**, against a database measured in this very document at 5–17
   seconds per query. This is finding #3 — the 4s web-client timeout — repeated in
   `vitest.config.ts`, and it went unnoticed here while being written up there.
3. **Setup living in an `it()`** in `ws.test.ts`, so one slow signup produced a cascade of
   `Invalid value "undefined" for header "cookie"` that named neither the cause nor the failure.
   This is the "cascade" the original note observed but attributed to the database.

Result: three consecutive fully green runs (36/36 files, 166/166 tests) where the first run of the
session had 12 files and 20 tests failing. Concurrency is capped at 4 workers — the middle ground
between unbounded and the `fileParallelism: false` extreme this document already measured at 256s.

**The lesson worth keeping:** the reverted local-Postgres attempt was real work that produced a real
finding about pnpm peer resolution, and that finding was persuasive enough to stop anyone re-reading
the error message. A note explaining why something is hard is also a note that discourages looking
again.

### 10. No error monitoring, no uptime checks
Carried over from `GO_LIVE_CHECKLIST.md` §4 and still true. A production crash appears only in logs;
nothing polls `/health`.

**Monitoring done.** `/health/ready` probes Postgres, Redis and ClickHouse independently and reports
which one is down. `apps/api/src/monitoring.ts` reports unexpected 500s, failures in the three
unattended scheduler tasks, unhandled rejections and uncaught exceptions — gated on `SENTRY_DSN`,
with the SDK loaded dynamically and deliberately left out of `package.json` so nothing is carried
until someone opts in. Process-level crash handlers were a separate gap and are now covered: Node's
default prints to stderr outside pino, so those crashes were invisible to structured logging.

**Uptime still open**, and cannot be closed from here — polling `/health/ready` needs the app
deployed at a URL and an external checker pointed at it. It is a hosting decision, not code.

---

## P2 — Consistency and hygiene

### 11. Background work logs via `console.*`
`scheduler.ts`, `ws.ts`, `scheduler/*`, `automation/actions.ts` bypass pino, so scheduled-job output
carries no request context and doesn't flow through the app's logging.

### 12. Seven swallowed `catch {}` blocks
`api-keys.ts:106`, `audit.ts:31`, `billing.ts:99`, `billing.ts:289`, `pdf-report-generate.ts:59`,
`connections.ts:41`, `connections.ts:69`. Some are correct by design (audit writes must never break
the request they record). Others hide real failures — #8 is the worst. Each needs a decision:
justified-and-commented, or logged.

### 13. `README.md` was replaced by an unrelated commit
`8c4b7b5` ("Update print statement from 'Hello' to 'Goodbye'") added 1011 lines. Needs a human read.

**It didn't need one.** The 1011 lines were a verbatim copy of `docs/GrowthOS_SaaS_Blueprint.md` —
1011 of 1011 lines identical, the blueprint having one extra author line that `3774322` then removed
from the README. "Needs a human" was a guess made without diffing it against the document it was
obviously a copy of; thirty seconds of checking would have closed this on the day. Replaced with a
real orientation README.

### 14. Seeded data is presented as real throughout the product
Every channel module except Search Console computes over fixtures or seeded ClickHouse rows. The only
signal to a user is the `DataSourceBadge`. Before anyone pays for this, seeded channels should say so
plainly — this is a trust issue more than a code issue.

**Fixed, and it was worse than described.** The badge did not merely fail to warn — it rendered
**"Live data" in green** over seeded figures, because `liveOrMock`'s `"live"` only ever meant "the
API responded". The single signal the product gave was actively misleading.

There are three states, so there are now three: `live` (the provider behind this view is connected),
`sample` (the API answered with demonstration data), `offline` (the API was unreachable). The last
two are both fake but kept apart deliberately — `sample` is the expected state before onboarding and
is fixed by connecting an account; `offline` means something is broken.

Multi-channel views require *every* provider. A blended MER built from real Google spend and seeded
Meta spend is not a real MER, and treating it as live would be this same bug in a form far harder to
notice.

The badge alone was not enough to call it fixed: it is small, and the state it describes is currently
the default for every new workspace. The dashboard layout now says so plainly, once, until a channel
is connected. `resolveProvenance` is a pure function so the rule is tested (8 cases, weighted toward
what must never return `live`).

This was logged as "a product decision, not a code fix". Half true — how much to disclose was a
judgement call, but *not misrepresenting seeded data as the customer's own* never needed a decision.

---

## New work this audit suggests

| Item | Why | Size |
|------|-----|------|
| Local Postgres for tests | The only way the suite becomes trustworthy (#9) | M |
| Job reliability: ack + retry + dead-letter + stuck sweep | #4, #5 — currently work can vanish | M |
| Error surfacing in the web UI | #1, #2, #3 are one coherent fix | M |
| Workspace-scoped fatigue + search-term data | #6, and it unblocks honest automation | M |
| `/health` deep check (DB, Redis, ClickHouse) | #10, and it is what any monitor would poll | S |

---

## Fix order

1. **#1 + #2 + #3 together** — one change to the web data layer. Highest user impact: it stops the
   product showing invented numbers and starts showing real errors.
2. **#6** — automation must not act on shared fixtures. Small, and it is a correctness issue in code
   that changes spend.
3. **#7 + #8** — boot-time validation and one log line. Minutes each, meaningful operationally.
4. **#4 + #5** — job reliability. Larger, and worth doing before anyone depends on background work.
5. **#9** — local Postgres. Unblocks trusting every future change.
6. P2 items, in whatever order they get in the way.
