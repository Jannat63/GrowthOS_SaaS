import { db, schema } from '@growthos/db'
import type { EnqueueResponse, JobEnvelope } from '@growthos/types'
import { getRedis, QUEUE_KEY } from './client.js'

// Insert the authoritative row FIRST, then push to Redis — a worker crash never loses a job.
export async function enqueue(input: {
  workspaceId: string
  type: string
  payload?: Record<string, unknown>
}): Promise<EnqueueResponse> {
  const [row] = await db
    .insert(schema.backgroundJobs)
    .values({ workspaceId: input.workspaceId, type: input.type })
    .returning({ id: schema.backgroundJobs.id })
  if (!row) throw new Error('Failed to insert background job.')

  const envelope: JobEnvelope = {
    v: 1,
    jobId: row.id,
    workspaceId: input.workspaceId,
    type: input.type,
    payload: input.payload ?? {},
  }
  await getRedis().lpush(QUEUE_KEY, JSON.stringify(envelope))

  return { jobId: row.id, statusUrl: `/api/v1/workspaces/${input.workspaceId}/jobs/${row.id}` }
}
