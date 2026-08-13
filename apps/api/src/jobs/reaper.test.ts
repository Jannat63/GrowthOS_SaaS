import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { failStuckJobs } from './reaper.js'

// Integration: requires Neon. The reaper is the only thing in the system that notices a job which
// stopped making progress — without it a client polls a spinner that will never resolve.

const ws = 'test-reaper-ws'
const HOUR = 60 * 60 * 1000

async function seedJob(status: string, ageMs: number, startedAgeMs?: number) {
  const [row] = await db
    .insert(schema.backgroundJobs)
    .values({
      workspaceId: ws,
      type: 'onboarding_analyze',
      status,
      queuedAt: new Date(Date.now() - ageMs),
      startedAt: startedAgeMs === undefined ? null : new Date(Date.now() - startedAgeMs),
    })
    .returning({ id: schema.backgroundJobs.id })
  return row!.id
}

const statusOf = async (id: string) => {
  const [row] = await db
    .select({ status: schema.backgroundJobs.status, error: schema.backgroundJobs.error })
    .from(schema.backgroundJobs)
    .where(eq(schema.backgroundJobs.id, id))
  return row!
}

describe('failStuckJobs', () => {
  beforeEach(async () => {
    await db.delete(schema.backgroundJobs).where(eq(schema.backgroundJobs.workspaceId, ws))
  })

  afterAll(async () => {
    await db.delete(schema.backgroundJobs).where(eq(schema.backgroundJobs.workspaceId, ws))
  })

  it('fails a job left processing far longer than any job should take', async () => {
    const id = await seedJob('processing', 3 * HOUR, 2 * HOUR)

    const { failed } = await failStuckJobs(HOUR)

    expect(failed).toBeGreaterThanOrEqual(1)
    const row = await statusOf(id)
    expect(row.status).toBe('failed')
    expect(row.error).toContain('without completing')
  })

  it('fails a job that was queued and never picked up — no worker was running', async () => {
    const id = await seedJob('queued', 3 * HOUR)
    await failStuckJobs(HOUR)
    expect((await statusOf(id)).status).toBe('failed')
  })

  it('leaves a job that is merely slow alone — this is a backstop, not a timeout', async () => {
    const id = await seedJob('processing', 30 * 60 * 1000, 10 * 60 * 1000)
    await failStuckJobs(HOUR)
    expect((await statusOf(id)).status).toBe('processing')
  })

  it('ages a started job from when it started, not from when it was queued', async () => {
    // Queued three hours ago but only picked up a minute ago: still healthy.
    const id = await seedJob('processing', 3 * HOUR, 60 * 1000)
    await failStuckJobs(HOUR)
    expect((await statusOf(id)).status).toBe('processing')
  })

  it('never touches jobs that already reached a terminal state', async () => {
    const complete = await seedJob('complete', 5 * HOUR, 5 * HOUR)
    const failedJob = await seedJob('failed', 5 * HOUR, 5 * HOUR)

    await failStuckJobs(HOUR)

    expect((await statusOf(complete)).status).toBe('complete')
    expect((await statusOf(failedJob)).status).toBe('failed')
  })

  it('is idempotent — a second sweep finds nothing left to do', async () => {
    await seedJob('processing', 3 * HOUR, 2 * HOUR)
    await failStuckJobs(HOUR)

    const remaining = await db
      .select({ id: schema.backgroundJobs.id })
      .from(schema.backgroundJobs)
      .where(
        inArray(schema.backgroundJobs.status, ['queued', 'processing']),
      )
    const ours = await db
      .select({ id: schema.backgroundJobs.id })
      .from(schema.backgroundJobs)
      .where(eq(schema.backgroundJobs.workspaceId, ws))
    expect(remaining.map((r) => r.id)).not.toContain(ours[0]!.id)
  })
})
