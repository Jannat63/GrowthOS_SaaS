import { and, inArray, lt, sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { publish } from '../ws.js'

/**
 * Fails jobs that have been in flight impossibly long.
 *
 * Nothing else in the system ever notices a job that stops making progress. If the worker dies
 * mid-job, or a job is enqueued while no worker is running at all, the row sits at `processing` or
 * `queued` forever — and the client polls it forever, showing a spinner that will never resolve.
 * The worker's reliable queue (see `consumer.py`) recovers the *envelope* when a worker restarts,
 * but nothing recovers the case where no worker comes back, or where the envelope was never picked
 * up because Redis lost it.
 *
 * A terminal state is strictly better than an eternal one: the user sees an error they can retry
 * instead of a spinner they cannot interpret, and the `job:failed` event closes out any client
 * waiting on the socket.
 *
 * The threshold is deliberately generous. This is a backstop for jobs that are never coming back,
 * not a timeout for slow ones — failing a job that is merely taking a while would be worse than the
 * problem it fixes.
 */

const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour

const STUCK_STATUSES = ['queued', 'processing'] as const

export interface ReapResult {
  failed: number
}

export async function failStuckJobs(maxAgeMs: number = DEFAULT_MAX_AGE_MS): Promise<ReapResult> {
  const cutoff = new Date(Date.now() - maxAgeMs)

  const stuck = await db
    .update(schema.backgroundJobs)
    .set({
      status: 'failed',
      error: `Job exceeded ${Math.round(maxAgeMs / 60000)} minutes without completing — no worker reported a result.`,
      completedAt: new Date(),
    })
    .where(
      and(
        inArray(schema.backgroundJobs.status, [...STUCK_STATUSES]),
        // A job that never started is aged from when it was queued; one that started, from when it
        // started. COALESCE keeps both in a single statement rather than two passes.
        lt(
          sql`coalesce(${schema.backgroundJobs.startedAt}, ${schema.backgroundJobs.queuedAt})`,
          cutoff,
        ),
      ),
    )
    .returning({
      id: schema.backgroundJobs.id,
      workspaceId: schema.backgroundJobs.workspaceId,
    })

  for (const job of stuck) {
    void publish({
      type: 'job:failed',
      workspaceId: job.workspaceId,
      payload: { jobId: job.id, error: 'Timed out' },
    })
  }

  return { failed: stuck.length }
}

/** Count of jobs currently in flight — used by the health check to expose queue depth. */
export async function inFlightJobCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.backgroundJobs)
    .where(inArray(schema.backgroundJobs.status, [...STUCK_STATUSES]))
  return row?.n ?? 0
}

/** Exposed for tests and callers that want the default without repeating it. */
export const STUCK_JOB_MAX_AGE_MS = DEFAULT_MAX_AGE_MS
