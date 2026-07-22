# Scheduled Intelligence & Automation Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-running scheduler to `apps/api` that periodically refreshes each workspace's Weekly Growth Intelligence Report and pushes the result to connected clients over the real-time WebSocket layer — with no user action, no external credentials, and no Claude.

**Architecture:** A lightweight interval loop lives in `apps/api` (started from `index.ts`, never from `app.ts`, so `inject()` tests never spin it up). Each tick acquires a short-lived **Redis lock** so that with multiple API instances exactly one runs the tick. It lists active workspaces with the timestamp of their most recent report, selects the ones whose report is older than a configurable cadence, and for each calls the existing TypeScript `getWeeklyReport(workspaceId)` (which already persists to `intelligence_reports`). It then publishes a new `report:ready` event via the existing `publishEvent`, which the WS layer fans out to that workspace's sockets. The pure decision logic (due-check, selection) is split into its own module so it is unit-tested without infra.

**Tech Stack:** TypeScript (ESM, NodeNext — relative imports end in `.js`), Fastify v5, Drizzle + Neon, ioredis, Vitest. Frontend: Next 15 / React 19, TanStack Query, sonner.

## Global Constraints

- **ESM + NodeNext:** every relative import in `apps/api` **must** include the `.js` extension (e.g. `import { publishEvent } from '../ws/events.js'`), even though the source is `.ts`. — verbatim from CLAUDE.md.
- **JSON is camelCase** across the API boundary.
- **The scheduler is additive and best-effort:** a failing tick (or a workspace that errors) must never crash the API process or block request serving. Swallow and log per-workspace errors; continue the loop.
- **Deterministic only (D4):** no Claude / Anthropic calls. The report comes from `@growthos/logic` engines over ClickHouse + Neon.
- **Scheduler starts only in the real server entrypoint** (`index.ts`), never in `buildApp()` (`app.ts`) — keeps `inject()`/health tooling free of timers and Redis.
- **Env flags (exact names):** `SCHEDULER_ENABLED` (default on unless the string `"false"`), `SCHEDULER_INTERVAL_MS` (tick period, default `60000`), `INTELLIGENCE_CADENCE_MS` (per-workspace refresh cadence, default `604800000` = 7 days). All read with `process.env.X ?? <default>`.
- **Redis lock key:** `scheduler:intelligence:lock`. Reuse the existing publisher connection via `getRedis()` from `apps/api/src/jobs/client.js`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `packages/types/src/index.ts` (modify) | Add `report:ready` to the `WebSocketEvent` union. |
| `apps/api/src/scheduler/schedule.ts` (create) | **Pure** decision logic: `isDue()` and `selectDueWorkspaces()`. No I/O. Unit-tested. |
| `apps/api/src/scheduler/schedule.test.ts` (create) | Unit tests for the pure logic. |
| `apps/api/src/scheduler/lock.ts` (create) | `withRedisLock(key, ttlMs, fn)` — SET NX PX guard so one instance runs a tick. |
| `apps/api/src/scheduler/lock.test.ts` (create) | Unit test with a mocked `getRedis`. |
| `apps/api/src/scheduler/intelligence-scheduler.ts` (create) | The tick + interval: query workspaces, select due, refresh each, publish `report:ready`; `startIntelligenceScheduler()` / `runSchedulerTick()`. |
| `apps/api/src/scheduler/queries.ts` (create) | `listWorkspacesWithLastRun()` — the one Drizzle query the tick needs. |
| `apps/api/src/index.ts` (modify) | Start the scheduler after `listen()`, guarded by `SCHEDULER_ENABLED`. |
| `apps/web/lib/hooks/useRealtime.ts` (modify) | Map `report:ready` → invalidate `["intelligence-report", ws]` + toast. |
| `apps/web/lib/hooks/useRealtime.test.ts` (modify) | Add a case for `report:ready`. |

---

### Task 1: Add the `report:ready` event type + web client handling

**Files:**
- Modify: `packages/types/src/index.ts` (the `WebSocketEvent` union, ~line 325)
- Modify: `apps/web/lib/hooks/useRealtime.ts` (`planForEvent`)
- Test: `apps/web/lib/hooks/useRealtime.test.ts`

**Interfaces:**
- Produces: `WebSocketEvent` now includes `{ type: "report:ready"; workspaceId: string; periodStart: string }`. The scheduler (Task 5) emits it; the web hook consumes it.

- [ ] **Step 1: Add the case to the failing web test**

In `apps/web/lib/hooks/useRealtime.test.ts`, add inside the `describe("planForEvent", …)` block:

```ts
  it("report:ready refreshes the intelligence report with a stable toast id", () => {
    const plan = planForEvent(
      { type: "report:ready", workspaceId: WS, periodStart: "2026-07-17" },
      WS
    );
    expect(plan.keys).toContainEqual(["intelligence-report", WS]);
    expect(plan.toastId).toBe(`report-${WS}`);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @growthos/web test`
Expected: FAIL — `report:ready` falls through `planForEvent`'s `default` (empty `keys`), and `plan.toastId` is `undefined`.

- [ ] **Step 3: Extend the type union**

In `packages/types/src/index.ts`, change the `WebSocketEvent` union to add the new member:

```ts
export type WebSocketEvent =
  | { type: "job:complete"; jobId: string; workspaceId: string }
  | { type: "recommendation:new"; workspaceId: string; recommendationId: string }
  | { type: "meta:fatigue_alert"; workspaceId: string; adSetId: string }
  | { type: "analytics:mer_alert"; workspaceId: string }
  | { type: "report:ready"; workspaceId: string; periodStart: string };
```

- [ ] **Step 4: Handle it in the web hook**

In `apps/web/lib/hooks/useRealtime.ts`, add a case to the `switch (event.type)` in `planForEvent`, immediately before `default:`:

```ts
    case "report:ready":
      return {
        keys: [["intelligence-report", workspaceId]],
        toast: "Your weekly intelligence report was updated",
        toastId: `report-${workspaceId}`,
      };
```

- [ ] **Step 5: Run the web tests to verify they pass**

Run: `pnpm --filter @growthos/web test`
Expected: PASS (5 `planForEvent` cases).

- [ ] **Step 6: Typecheck both affected packages**

Run: `pnpm --filter @growthos/types build && pnpm --filter @growthos/web typecheck`
Expected: no errors. (`@growthos/types` is consumed as compiled output; rebuild it so `apps/web` and `apps/api` see the new member.)

- [ ] **Step 7: Commit**

```bash
git add packages/types/src/index.ts apps/web/lib/hooks/useRealtime.ts apps/web/lib/hooks/useRealtime.test.ts
git commit -m "feat(types,web): add report:ready real-time event + client handling"
```

---

### Task 2: Pure scheduling logic (`isDue`, `selectDueWorkspaces`)

**Files:**
- Create: `apps/api/src/scheduler/schedule.ts`
- Test: `apps/api/src/scheduler/schedule.test.ts`

**Interfaces:**
- Produces:
  - `interface WorkspaceRun { workspaceId: string; lastRunAt: Date | null }`
  - `isDue(lastRunAt: Date | null, now: Date, cadenceMs: number): boolean`
  - `selectDueWorkspaces(rows: WorkspaceRun[], now: Date, cadenceMs: number): string[]`
- Consumed by: Task 4 (queries return `WorkspaceRun[]`) and Task 5 (the tick calls `selectDueWorkspaces`).

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/scheduler/schedule.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isDue, selectDueWorkspaces } from './schedule.js'

const CADENCE = 7 * 24 * 60 * 60 * 1000 // 7 days
const now = new Date('2026-07-23T00:00:00Z')

describe('isDue', () => {
  it('is due when never run', () => {
    expect(isDue(null, now, CADENCE)).toBe(true)
  })
  it('is due when the last run is older than the cadence', () => {
    expect(isDue(new Date('2026-07-15T00:00:00Z'), now, CADENCE)).toBe(true) // 8 days
  })
  it('is not due when the last run is within the cadence', () => {
    expect(isDue(new Date('2026-07-20T00:00:00Z'), now, CADENCE)).toBe(false) // 3 days
  })
  it('is due exactly at the cadence boundary', () => {
    expect(isDue(new Date('2026-07-16T00:00:00Z'), now, CADENCE)).toBe(true) // exactly 7 days
  })
})

describe('selectDueWorkspaces', () => {
  it('returns only the workspace ids that are due', () => {
    const rows = [
      { workspaceId: 'a', lastRunAt: null }, // never run → due
      { workspaceId: 'b', lastRunAt: new Date('2026-07-20T00:00:00Z') }, // 3 days → not due
      { workspaceId: 'c', lastRunAt: new Date('2026-07-10T00:00:00Z') }, // 13 days → due
    ]
    expect(selectDueWorkspaces(rows, now, CADENCE)).toEqual(['a', 'c'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/schedule.test.ts`
Expected: FAIL — `Cannot find module './schedule.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/scheduler/schedule.ts`:

```ts
/** A workspace paired with the timestamp of its most recent intelligence report (null = never). */
export interface WorkspaceRun {
  workspaceId: string
  lastRunAt: Date | null
}

/** True when a workspace has never been refreshed, or its last refresh is at least `cadenceMs` old. */
export function isDue(lastRunAt: Date | null, now: Date, cadenceMs: number): boolean {
  if (lastRunAt === null) return true
  return now.getTime() - lastRunAt.getTime() >= cadenceMs
}

/** The subset of workspace ids due for a refresh this tick, preserving input order. */
export function selectDueWorkspaces(rows: WorkspaceRun[], now: Date, cadenceMs: number): string[] {
  return rows.filter((r) => isDue(r.lastRunAt, now, cadenceMs)).map((r) => r.workspaceId)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/schedule.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/scheduler/schedule.ts apps/api/src/scheduler/schedule.test.ts
git commit -m "feat(api): pure scheduling logic — isDue + selectDueWorkspaces"
```

---

### Task 3: Redis single-runner lock (`withRedisLock`)

**Files:**
- Create: `apps/api/src/scheduler/lock.ts`
- Test: `apps/api/src/scheduler/lock.test.ts`

**Interfaces:**
- Consumes: `getRedis()` from `apps/api/src/jobs/client.js` (returns an ioredis client).
- Produces: `withRedisLock(key: string, ttlMs: number, fn: () => Promise<void>): Promise<boolean>` — returns `true` if the lock was acquired and `fn` ran, `false` if another holder had it. Releases the lock afterward (best-effort).

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/scheduler/lock.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const set = vi.fn()
const del = vi.fn()
vi.mock('../jobs/client.js', () => ({
  getRedis: () => ({ set, del }),
}))

const { withRedisLock } = await import('./lock.js')

describe('withRedisLock', () => {
  beforeEach(() => {
    set.mockReset()
    del.mockReset()
  })

  it('runs fn and releases when the lock is acquired', async () => {
    set.mockResolvedValueOnce('OK') // SET NX succeeded
    const fn = vi.fn().mockResolvedValue(undefined)

    const ran = await withRedisLock('k', 5000, fn)

    expect(ran).toBe(true)
    expect(fn).toHaveBeenCalledTimes(1)
    // Acquired with NX + PX ttl.
    expect(set).toHaveBeenCalledWith('k', expect.any(String), 'PX', 5000, 'NX')
    expect(del).toHaveBeenCalledWith('k')
  })

  it('does not run fn when the lock is already held', async () => {
    set.mockResolvedValueOnce(null) // SET NX returned null → not acquired
    const fn = vi.fn()

    const ran = await withRedisLock('k', 5000, fn)

    expect(ran).toBe(false)
    expect(fn).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('still releases the lock if fn throws', async () => {
    set.mockResolvedValueOnce('OK')
    const fn = vi.fn().mockRejectedValue(new Error('boom'))

    await expect(withRedisLock('k', 5000, fn)).rejects.toThrow('boom')
    expect(del).toHaveBeenCalledWith('k')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/lock.test.ts`
Expected: FAIL — `Cannot find module './lock.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/scheduler/lock.ts`:

```ts
import { getRedis } from '../jobs/client.js'

/**
 * Run `fn` only if we win a short-lived Redis lock — so with N API instances exactly one runs
 * a given tick. The lock auto-expires after `ttlMs` (crash safety) and we delete it when done.
 * Returns whether `fn` actually ran. Set `ttlMs` comfortably above a tick's worst-case duration.
 */
export async function withRedisLock(
  key: string,
  ttlMs: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const redis = getRedis()
  // SET key <val> PX ttl NX → 'OK' if acquired, null if another holder has it.
  const acquired = await redis.set(key, '1', 'PX', ttlMs, 'NX')
  if (acquired !== 'OK') return false
  try {
    await fn()
  } finally {
    await redis.del(key).catch(() => {}) // best-effort release; the TTL is the backstop
  }
  return true
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/lock.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/scheduler/lock.ts apps/api/src/scheduler/lock.test.ts
git commit -m "feat(api): Redis single-runner lock for the scheduler"
```

---

### Task 4: Workspace-with-last-run query

**Files:**
- Create: `apps/api/src/scheduler/queries.ts`
- Test: `apps/api/src/scheduler/queries.test.ts`

**Interfaces:**
- Consumes: `db`, `schema` from `@growthos/db`; `WorkspaceRun` from `./schedule.js`.
- Produces: `listWorkspacesWithLastRun(): Promise<WorkspaceRun[]>` — every workspace with the `createdAt` of its most recent `intelligence_reports` row (or `null` if it has none).

**Note:** This is an integration test — it needs Neon (dev stack up), like the other `apps/api` DB tests. `schema.intelligenceReports` has columns `workspaceId`, `periodStart`, `report`, `createdAt` (see `apps/api/src/intelligence.ts:44-50`). `schema.workspaces` is the Better-Auth organization table (`id`, `name`, …).

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/scheduler/queries.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { listWorkspacesWithLastRun } from './queries.js'

// Integration: requires Neon (dev stack up).
describe('listWorkspacesWithLastRun', () => {
  const ws = 'test-sched-ws'

  beforeAll(async () => {
    await db.insert(schema.workspaces).values({ id: ws, name: 'Sched Test', slug: `sched-${Date.now()}` })
    await db.insert(schema.intelligenceReports).values({
      workspaceId: ws,
      periodStart: '2026-07-10',
      report: { weekStart: '2026-07-10' },
    })
  })

  afterAll(async () => {
    await db.delete(schema.intelligenceReports).where(eq(schema.intelligenceReports.workspaceId, ws))
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws))
  })

  it('returns the workspace with the createdAt of its latest report', async () => {
    const rows = await listWorkspacesWithLastRun()
    const row = rows.find((r) => r.workspaceId === ws)
    expect(row).toBeDefined()
    expect(row!.lastRunAt).toBeInstanceOf(Date)
  })
})
```

> If `schema.workspaces` requires more non-null columns than `id`/`name`/`slug`, add them to the insert — check `packages/db/src/schema` for the workspaces (organization) table definition before running.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/queries.test.ts`
Expected: FAIL — `Cannot find module './queries.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/scheduler/queries.ts`:

```ts
import { sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { WorkspaceRun } from './schedule.js'

/**
 * Every workspace with the timestamp of its most recent intelligence report (null = never run).
 * Left join + max(createdAt) so brand-new workspaces surface as `lastRunAt: null` and get picked
 * up on the first tick.
 */
export async function listWorkspacesWithLastRun(): Promise<WorkspaceRun[]> {
  const rows = await db
    .select({
      workspaceId: schema.workspaces.id,
      lastRunAt: sql<Date | null>`max(${schema.intelligenceReports.createdAt})`,
    })
    .from(schema.workspaces)
    .leftJoin(
      schema.intelligenceReports,
      sql`${schema.intelligenceReports.workspaceId} = ${schema.workspaces.id}`,
    )
    .groupBy(schema.workspaces.id)

  return rows.map((r) => ({
    workspaceId: r.workspaceId,
    lastRunAt: r.lastRunAt ? new Date(r.lastRunAt) : null,
  }))
}
```

- [ ] **Step 4: Run to verify it passes** (Neon must be reachable via `apps/api/.env`)

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/queries.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/scheduler/queries.ts apps/api/src/scheduler/queries.test.ts
git commit -m "feat(api): list workspaces with last intelligence-run timestamp"
```

---

### Task 5: The scheduler tick + interval

**Files:**
- Create: `apps/api/src/scheduler/intelligence-scheduler.ts`
- Test: `apps/api/src/scheduler/intelligence-scheduler.test.ts`

**Interfaces:**
- Consumes: `withRedisLock` (Task 3), `selectDueWorkspaces` (Task 2), `listWorkspacesWithLastRun` (Task 4), `getWeeklyReport` from `../intelligence.js`, `publishEvent` from `../ws/events.js`.
- Produces:
  - `refreshWorkspace(workspaceId: string): Promise<void>` — runs `getWeeklyReport` then publishes `report:ready`.
  - `runSchedulerTick(now?: Date): Promise<number>` — one guarded tick; returns the number of workspaces refreshed (0 if the lock was not won).
  - `startIntelligenceScheduler(): () => void` — starts the interval, returns a stop function.
- Config (read at call time): `SCHEDULER_INTERVAL_MS` (default `60000`), `INTELLIGENCE_CADENCE_MS` (default `604800000`), lock key `scheduler:intelligence:lock`.

- [ ] **Step 1: Write the failing test** (unit — dependencies mocked, no infra)

Create `apps/api/src/scheduler/intelligence-scheduler.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const listWorkspacesWithLastRun = vi.fn()
const getWeeklyReport = vi.fn()
const publishEvent = vi.fn()
// Lock always grants in this test so the tick body runs.
vi.mock('./lock.js', () => ({
  withRedisLock: async (_k: string, _t: number, fn: () => Promise<void>) => {
    await fn()
    return true
  },
}))
vi.mock('./queries.js', () => ({ listWorkspacesWithLastRun }))
vi.mock('../intelligence.js', () => ({ getWeeklyReport }))
vi.mock('../ws/events.js', () => ({ publishEvent }))

const { runSchedulerTick, refreshWorkspace } = await import('./intelligence-scheduler.js')

describe('runSchedulerTick', () => {
  beforeEach(() => {
    listWorkspacesWithLastRun.mockReset()
    getWeeklyReport.mockReset()
    publishEvent.mockReset()
  })

  it('refreshes only due workspaces and publishes report:ready for each', async () => {
    const now = new Date('2026-07-23T00:00:00Z')
    listWorkspacesWithLastRun.mockResolvedValue([
      { workspaceId: 'due', lastRunAt: null },
      { workspaceId: 'fresh', lastRunAt: new Date('2026-07-22T00:00:00Z') },
    ])
    getWeeklyReport.mockResolvedValue({ weekStart: '2026-07-17' })

    const count = await runSchedulerTick(now)

    expect(count).toBe(1)
    expect(getWeeklyReport).toHaveBeenCalledWith('due')
    expect(getWeeklyReport).not.toHaveBeenCalledWith('fresh')
    expect(publishEvent).toHaveBeenCalledWith('due', {
      type: 'report:ready',
      workspaceId: 'due',
      periodStart: '2026-07-17',
    })
  })

  it('one workspace failing does not stop the others', async () => {
    listWorkspacesWithLastRun.mockResolvedValue([
      { workspaceId: 'bad', lastRunAt: null },
      { workspaceId: 'good', lastRunAt: null },
    ])
    getWeeklyReport.mockImplementation(async (ws: string) => {
      if (ws === 'bad') throw new Error('clickhouse down')
      return { weekStart: '2026-07-17' }
    })

    const count = await runSchedulerTick(new Date('2026-07-23T00:00:00Z'))

    expect(count).toBe(1) // only 'good' succeeded
    expect(publishEvent).toHaveBeenCalledWith('good', expect.objectContaining({ type: 'report:ready' }))
  })
})

describe('refreshWorkspace', () => {
  beforeEach(() => {
    getWeeklyReport.mockReset()
    publishEvent.mockReset()
  })
  it('publishes report:ready with the report period', async () => {
    getWeeklyReport.mockResolvedValue({ weekStart: '2026-07-17' })
    await refreshWorkspace('w1')
    expect(publishEvent).toHaveBeenCalledWith('w1', {
      type: 'report:ready',
      workspaceId: 'w1',
      periodStart: '2026-07-17',
    })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/intelligence-scheduler.test.ts`
Expected: FAIL — `Cannot find module './intelligence-scheduler.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/src/scheduler/intelligence-scheduler.ts`:

```ts
import { getWeeklyReport } from '../intelligence.js'
import { publishEvent } from '../ws/events.js'
import { withRedisLock } from './lock.js'
import { selectDueWorkspaces } from './schedule.js'
import { listWorkspacesWithLastRun } from './queries.js'

const LOCK_KEY = 'scheduler:intelligence:lock'

function intervalMs(): number {
  return Number(process.env.SCHEDULER_INTERVAL_MS ?? 60_000)
}
function cadenceMs(): number {
  return Number(process.env.INTELLIGENCE_CADENCE_MS ?? 7 * 24 * 60 * 60 * 1000)
}

/** Refresh one workspace's report and push a report:ready event to its clients. */
export async function refreshWorkspace(workspaceId: string): Promise<void> {
  const report = await getWeeklyReport(workspaceId)
  await publishEvent(workspaceId, {
    type: 'report:ready',
    workspaceId,
    periodStart: report.weekStart,
  })
}

/**
 * One guarded tick: win the lock, find workspaces whose report is older than the cadence, and
 * refresh each. Per-workspace errors are logged and skipped so one failure never stalls the rest.
 * Returns how many workspaces were refreshed (0 if another instance held the lock).
 */
export async function runSchedulerTick(now: Date = new Date()): Promise<number> {
  let refreshed = 0
  // Lock TTL = interval so a crashed holder's lock expires before the next tick.
  await withRedisLock(LOCK_KEY, intervalMs(), async () => {
    const rows = await listWorkspacesWithLastRun()
    const due = selectDueWorkspaces(rows, now, cadenceMs())
    for (const workspaceId of due) {
      try {
        await refreshWorkspace(workspaceId)
        refreshed++
      } catch (err) {
        console.error(`[scheduler] refresh failed for workspace ${workspaceId}:`, err)
      }
    }
  })
  return refreshed
}

/** Start the recurring scheduler. Returns a stop function that clears the interval. */
export function startIntelligenceScheduler(): () => void {
  const timer = setInterval(() => {
    runSchedulerTick().catch((err) => console.error('[scheduler] tick failed:', err))
  }, intervalMs())
  // Do not keep the process alive solely for the scheduler.
  timer.unref?.()
  return () => clearInterval(timer)
}
```

> Note: `new Date()` as a default arg is fine here — this is production runtime code, not a Workflow script.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/intelligence-scheduler.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/scheduler/intelligence-scheduler.ts apps/api/src/scheduler/intelligence-scheduler.test.ts
git commit -m "feat(api): intelligence scheduler tick + interval (lock-guarded, per-workspace-safe)"
```

---

### Task 6: Wire the scheduler into the server entrypoint

**Files:**
- Modify: `apps/api/src/index.ts`

**Interfaces:**
- Consumes: `startIntelligenceScheduler` (Task 5).

- [ ] **Step 1: Update `index.ts`**

Replace the contents of `apps/api/src/index.ts` with:

```ts
import { buildApp } from './app.js'
import { startIntelligenceScheduler } from './scheduler/intelligence-scheduler.js'

const app = buildApp()
const port = Number(process.env.API_PORT ?? 3001)

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})

// Autonomous intelligence refresh loop. Started only here (never in buildApp), so inject()
// tests and health tooling stay timer-free. Disable with SCHEDULER_ENABLED=false.
if (process.env.SCHEDULER_ENABLED !== 'false') {
  const stop = startIntelligenceScheduler()
  const shutdown = () => {
    stop()
    app.close().finally(() => process.exit(0))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  app.log.info('intelligence scheduler started')
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @growthos/api typecheck`
Expected: no errors.

- [ ] **Step 3: Verify `buildApp()` still boots with NO scheduler/timer** (regression guard)

Run:
```bash
pnpm --filter @growthos/api build
node --env-file=apps/api/.env --input-type=module -e "import('./apps/api/dist/app.js').then(async m => { const a=m.buildApp(); const r=await a.inject({method:'GET',url:'/health'}); console.log(r.statusCode); await a.close(); process.exit(0) })"
```
Expected: prints `200` and exits immediately (no lingering timer — proves the scheduler is not in `buildApp`).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): start intelligence scheduler from server entrypoint (flag-gated + graceful stop)"
```

---

### Task 7: Full-suite verification + live tick smoke test

**Files:** none (verification only).

- [ ] **Step 1: Run the API scheduler unit tests together**

Run: `pnpm --filter @growthos/api exec vitest run src/scheduler/`
Expected: PASS — schedule (5) + lock (3) + intelligence-scheduler (3) = 11 pure/mocked tests. (queries.test.ts needs Neon; run it too if the dev stack is up.)

- [ ] **Step 2: Typecheck the whole repo + build web**

Run: `pnpm typecheck && pnpm --filter @growthos/web build`
Expected: no errors; all web pages compile.

- [ ] **Step 3: Live tick smoke test** (dev stack up: Redis + ClickHouse + Neon)

Set a short cadence so an existing workspace is immediately due, then run one tick against the real DB/Redis and confirm it refreshes and would publish:

```bash
INTELLIGENCE_CADENCE_MS=0 SCHEDULER_ENABLED=false node --env-file=apps/api/.env --input-type=module -e "import('./apps/api/dist/scheduler/intelligence-scheduler.js').then(async m => { const n = await m.runSchedulerTick(); console.log('refreshed', n, 'workspaces'); process.exit(0) })"
```
Expected: logs `refreshed <N> workspaces` with `N >= 0` and no unhandled errors. (With `INTELLIGENCE_CADENCE_MS=0` every workspace is due, so `N` equals the workspace count. Rebuild first if needed: `pnpm --filter @growthos/api build`.)

- [ ] **Step 4: (Optional) End-to-end with a live socket**

Reuse the WS smoke pattern from the real-time layer: open an authenticated socket, subscribe to a workspace, then run one `runSchedulerTick()` in a second process with `INTELLIGENCE_CADENCE_MS=0` and assert a `report:ready` frame arrives for that workspace. This proves scheduler → WS fan-out end to end.

- [ ] **Step 5: Update plan-tracking docs**

Edit `docs/plan/M3-v1-channels/P3.4-intelligence-v1/` progress + `docs/plan/PROGRESS.md`: mark the **scheduled loop** deferral in P3.4 as delivered (dated), noting it drives the real-time layer autonomously. Add a log line under `docs/plan/M3-v1-channels/progress.md`.

- [ ] **Step 6: Commit**

```bash
git add docs/plan
git commit -m "docs(plan): scheduled intelligence loop delivered — closes P3.4 scheduled-loop deferral"
```

---

## Scope Expansion — Feature-Rich Automation (added 2026-07-23)

The base plan (Tasks 1–7) ships the autonomous refresh loop. The following increments make it a
full automation product. Each is an independently committable slice built on the core.

### Increment B — Per-workspace automation config

- **DB:** add `automationConfig` jsonb to `workspaces` (`{ enabled: boolean; cadenceMs: number }`),
  mirroring the `whiteLabelConfig` precedent (`packages/db/src/schema/auth.ts:102`). Migration via
  `drizzle-kit generate` → `db:migrate`.
- **Types:** `AutomationConfig` in `@growthos/types` (defaults: `enabled: true`, weekly cadence).
- **Selection:** `queries.listWorkspacesWithLastRun()` also returns each workspace's config; the tick
  skips `enabled === false` and uses the **per-workspace** `cadenceMs` (falling back to the global
  default when unset). `selectDueWorkspaces` gains per-row cadence.
- **API:** `GET/PATCH /api/v1/workspaces/:id/automation` (read any member; PATCH admin+, zod-validated,
  audited `automation.updated`).
- **Web:** an **Automation** section on Settings — enable toggle + cadence select — via a
  `useAutomation` hook; live→mock like the other hooks.

### Increment C — Autonomous fresh alerting (real re-detection)

- **DB:** `automation_alerts` table — `(workspaceId, alertType, signature, emittedAt)`, unique on
  `(workspaceId, alertType)`. Persistent so an alert re-fires only when the *signature changes* (a new
  anomaly appears, or a different creative fatigues) — replacing the per-process `merAlerted` Set.
- **Logic:** `shouldEmitAlert(prevSignature, nextSignature): boolean` (pure, unit-tested) — emit when
  the signature is new/changed and non-empty.
- **Refresh:** `refreshWorkspace` additionally computes the current MER anomaly (`getMerTrend`) and
  fatigue set (`getFatigueResults`), and for each that is newly-alertable, upserts the signature and
  emits `analytics:mer_alert` / `meta:fatigue_alert`. Migrate `analytics.ts` off its in-memory dedupe
  to this persistent state (shared helper).

### Increment D — Observability

- **DB:** `scheduler_runs` table — `(id, startedAt, finishedAt, refreshedCount, alertCount,
  errorCount, details jsonb)`. One row per tick.
- **Tick:** `runSchedulerTick` records a run row (counts + per-workspace error details).
- **API:** `GET /api/v1/scheduler/runs?limit=` (admin of any of the caller's workspaces; returns recent
  runs) + `GET /api/v1/workspaces/:id/automation/status` (last run affecting this workspace).
- **Web:** a **Automation activity** card on Settings listing recent ticks (time, refreshed, alerts,
  errors), via `useSchedulerRuns`.

### Global additions to constraints

- New events reuse the existing `publishEvent` bus and WS union (Task 1 already adds `report:ready`;
  `analytics:mer_alert` / `meta:fatigue_alert` already exist).
- All new DB writes are best-effort inside the tick — a metrics/alert-state write failure must never
  abort a refresh.

## Self-Review

- **Spec coverage:** scheduler start (Task 6), single-runner safety (Task 3), due-cadence selection (Task 2), the query (Task 4), the tick + per-workspace isolation + WS push (Task 5), the new event type + client (Task 1), verification incl. the `buildApp` regression guard and a live tick (Task 7). Global constraints (ESM `.js`, additive/best-effort, D4 no-Claude, flag-gated, camelCase) are enforced across the relevant tasks.
- **Placeholder scan:** none — every code step carries full source.
- **Type consistency:** `WorkspaceRun` (Task 2) is produced by `listWorkspacesWithLastRun` (Task 4) and consumed by `runSchedulerTick` (Task 5); `report:ready` payload `{ type, workspaceId, periodStart }` is identical in the type union (Task 1), the emitter (Task 5), and the web handler (Task 1). `withRedisLock` signature matches its mock (Task 5) and its impl (Task 3).
- **Open item to check during Task 4:** confirm the required non-null columns on `schema.workspaces` before the insert in `queries.test.ts` (noted inline).
