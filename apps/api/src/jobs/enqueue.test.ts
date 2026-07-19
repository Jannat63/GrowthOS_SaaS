import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { enqueue } from './enqueue.js'
import { getRedis, QUEUE_KEY, closeRedis } from './client.js'

// Integration: requires local Redis + Neon (both up in dev).
describe('enqueue', () => {
  const created: string[] = []
  afterAll(async () => {
    for (const id of created) await db.delete(schema.backgroundJobs).where(eq(schema.backgroundJobs.id, id))
    await getRedis().del(QUEUE_KEY)
    await closeRedis()
  })

  it('inserts a queued row and pushes a matching envelope', async () => {
    const res = await enqueue({ workspaceId: 'test-ws', type: 'echo', payload: { hello: 'world' } })
    created.push(res.jobId)

    expect(res.statusUrl).toBe(`/api/v1/workspaces/test-ws/jobs/${res.jobId}`)

    const [row] = await db.select().from(schema.backgroundJobs).where(eq(schema.backgroundJobs.id, res.jobId))
    expect(row).toBeDefined()
    expect(row!.status).toBe('queued')
    expect(row!.type).toBe('echo')

    const raw = await getRedis().lpop(QUEUE_KEY)
    expect(raw).not.toBeNull()
    const env = JSON.parse(raw as string)
    expect(env).toMatchObject({ v: 1, jobId: res.jobId, workspaceId: 'test-ws', type: 'echo', payload: { hello: 'world' } })
  })
})
