import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'

// Background work logs through the shared pino logger, not console — so the assertions about what a
// scheduled task reported have to watch that instead. Stubbed at the module boundary so the real
// logger never writes during the run.
const info = vi.fn()
const error = vi.fn()
vi.mock('./logger.js', () => ({
  logger: { info, error, warn: vi.fn(), child: () => ({ info, error, warn: vi.fn() }) },
  moduleLogger: () => ({ info, error, warn: vi.fn() }),
}))

const { listActiveWorkspaceIds, runIntelligenceRefresh, runTrialReminders } = await import(
  './scheduler.js'
)

// Integration: requires Neon + Redis (dev stack up) — Redis because both scheduled tasks now run
// under a lock so multiple API instances can't double-run them. runIntelligenceRefresh's resilience
// test deliberately does NOT mock a ClickHouse failure — in this dev environment ClickHouse
// genuinely isn't running, so every workspace's getWeeklyReport call fails for real. That's used as
// the test condition itself: if the tick survives 3/3 real failures without throwing, the
// per-workspace try/catch is proven correct under an actual failure, not a stubbed one.
//
// The seeded workspaces have no intelligence report, so they are always "due" regardless of cadence.
describe('scheduler', () => {
  const wsA = 'test-scheduler-ws-a'
  const wsB = 'test-scheduler-ws-b'
  const wsC = 'test-scheduler-ws-c'

  afterAll(async () => {
    for (const id of [wsA, wsB, wsC]) {
      await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id))
    }
  })

  beforeEach(async () => {
    info.mockReset()
    error.mockReset()
    for (const id of [wsA, wsB, wsC]) {
      await db
        .insert(schema.workspaces)
        .values({ id, name: id, slug: id, createdAt: new Date() })
        .onConflictDoNothing()
    }
  })

  describe('listActiveWorkspaceIds', () => {
    it('returns every workspace id, including the ones just seeded', async () => {
      const ids = await listActiveWorkspaceIds()
      expect(ids).toEqual(expect.arrayContaining([wsA, wsB, wsC]))
    })
  })

  // Both tasks run under a Redis lock, so what they DO depends on infrastructure that may be down:
  // with Redis unreachable the lock can't be taken and the task no-ops. What must hold either way is
  // that neither ever throws — they're fired from cron callbacks with nothing to catch them, so an
  // escaping rejection takes down the scheduled loop for the life of the process. That contract is
  // what these assert. The per-workspace resilience of the tick itself is covered by
  // scheduler/intelligence-scheduler.test.ts, which mocks the lock and asserts it directly.

  describe('runTrialReminders', () => {
    it('never throws, whether it wins the lock, loses it, or cannot reach Redis at all', async () => {
      await expect(runTrialReminders()).resolves.toBeUndefined()
      // Whatever happened, it accounted for itself on one level or the other rather than passing
      // silently — these run unattended, so a silent outcome is indistinguishable from not running.
      expect(info.mock.calls.length + error.mock.calls.length).toBeGreaterThan(0)
    })
  })

  describe('runIntelligenceRefresh', () => {
    it('never throws even when every workspace fails — one bad workspace never kills the loop', async () => {
      await expect(runIntelligenceRefresh()).resolves.toBeUndefined()

      // If the tick actually ran (Redis available), every seeded workspace should have failed
      // independently against the unavailable ClickHouse — proof the loop kept going past the
      // first failure rather than aborting. If the lock couldn't be taken, there is nothing to
      // assert beyond "it didn't throw", which the line above already covers.
      const perWorkspaceFailures = error.mock.calls.filter((call) =>
        [wsA, wsB, wsC].some((id) => JSON.stringify(call).includes(id)),
      )
      if (perWorkspaceFailures.length > 0) {
        expect(perWorkspaceFailures.length).toBe(3)
        expect(info).toHaveBeenCalledWith(expect.stringContaining('intelligence refresh'))
      }
    })
  })
})
