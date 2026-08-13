import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { listActiveWorkspaceIds, runIntelligenceRefresh, runTrialReminders } from './scheduler.js'

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

  describe('runTrialReminders', () => {
    it('completes without throwing and logs a result', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      await expect(runTrialReminders()).resolves.toBeUndefined()
      expect(log).toHaveBeenCalledWith(expect.stringContaining('trial reminders'))
      log.mockRestore()
    })
  })

  describe('runIntelligenceRefresh', () => {
    it('never throws even when every workspace fails (ClickHouse unavailable here) — one bad workspace never kills the loop', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await expect(runIntelligenceRefresh()).resolves.toBeUndefined()

      // Each of our 3 seeded workspaces should have logged its own failure independently —
      // proof the loop kept going past workspace A's failure to reach B and C.
      const failureLogsForOurWorkspaces = errorSpy.mock.calls.filter((call) =>
        [wsA, wsB, wsC].some((id) => String(call[0]).includes(id)),
      )
      expect(failureLogsForOurWorkspaces.length).toBe(3)

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('intelligence refresh'))
      errorSpy.mockRestore()
      logSpy.mockRestore()
    })
  })
})
