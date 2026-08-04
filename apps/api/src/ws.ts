import type { WebSocket } from 'ws'
import { getRedis } from './jobs/client.js'

/**
 * Real-time WebSocket transport. Named as a deferred item independently across four different
 * phases (P2.5 fatigue, P2.6 blended MER, P2.7 dashboard, P3.4 intelligence) — every one of them
 * currently relies on polling instead. This is the piece that was never built.
 *
 * Two delivery paths, unified through one channel:
 *  - Events raised from THIS process (apps/api — recommendation:new, meta:fatigue_alert,
 *    intelligence:report_ready, analytics:mer_alert) call `publish()` directly.
 *  - Events raised by the Python worker (job:complete, job:failed — a genuinely separate process)
 *    are published to the same Redis channel from `apps/worker/app/jobs.py`.
 *
 * `publish()` always goes through Redis, even for same-process events — never calls the local
 * broadcast directly. That keeps there being exactly ONE delivery path (the subscriber below), so
 * an event never gets double-delivered to a socket connected to the same process that raised it.
 * If Redis itself is unreachable, `publish()` falls back to local-only delivery so this process's
 * own connected clients aren't left hanging.
 *
 * The in-memory room registry is per-process, matching this app's single-long-running-process
 * deployment model (same assumption the scheduler already makes) — a multi-instance deployment
 * would need every instance subscribed to the same Redis channel, which this design already
 * supports; it's the "publish, don't call local directly" part that makes that work.
 */

export type WsEventType =
  | 'recommendation:new'
  | 'job:complete'
  | 'job:failed'
  | 'meta:fatigue_alert'
  | 'analytics:mer_alert'
  | 'intelligence:report_ready'

export interface WsEvent {
  type: WsEventType
  workspaceId: string
  payload?: Record<string, unknown>
}

const REDIS_CHANNEL = 'growthos:ws-events'

const rooms = new Map<string, Set<WebSocket>>()

export function subscribeSocket(workspaceId: string, socket: WebSocket): void {
  let room = rooms.get(workspaceId)
  if (!room) {
    room = new Set()
    rooms.set(workspaceId, room)
  }
  room.add(socket)
}

export function unsubscribeSocket(workspaceId: string, socket: WebSocket): void {
  const room = rooms.get(workspaceId)
  if (!room) return
  room.delete(socket)
  if (room.size === 0) rooms.delete(workspaceId)
}

/** How many sockets are currently connected for a workspace — exposed for tests/introspection. */
export function connectionCount(workspaceId: string): number {
  return rooms.get(workspaceId)?.size ?? 0
}

function publishLocal(event: WsEvent): void {
  const room = rooms.get(event.workspaceId)
  if (!room || room.size === 0) return
  const message = JSON.stringify(event)
  for (const socket of room) {
    if (socket.readyState === socket.OPEN) socket.send(message)
  }
}

/**
 * Broadcasts an event to every socket connected for `event.workspaceId`, in every process.
 *
 * Races the Redis publish against a short timeout rather than awaiting it directly. The shared
 * Redis client (jobs/client.ts) sets `maxRetriesPerRequest: null` for the job queue's own use —
 * correct there, but it means a command issued while Redis is unreachable gets queued and waits
 * indefinitely for a connection that may never come, rather than rejecting. Without this timeout,
 * a Redis outage would hang every code path that calls `publish()` (recommendation creation,
 * fatigue alerts, the scheduler) — caught by this file's own test suite timing out for real
 * against this dev sandbox's genuinely-unavailable Redis before this fix was added.
 */
export async function publish(event: WsEvent): Promise<void> {
  try {
    await Promise.race([
      getRedis().publish(REDIS_CHANNEL, JSON.stringify(event)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('redis publish timed out')), 1500)),
    ])
  } catch (err) {
    console.error('[ws] redis publish failed — falling back to local-only delivery', err)
    publishLocal(event)
  }
}

let subscriberStarted = false

/** Starts the Redis subscriber that turns published events (from any process) into local socket sends. Call once, at boot. */
export function startWsRedisSubscriber(): void {
  if (subscriberStarted) return
  subscriberStarted = true

  const subscriber = getRedis().duplicate()
  subscriber.subscribe(REDIS_CHANNEL).catch((err) => {
    console.error('[ws] redis subscribe failed', err)
  })
  subscriber.on('message', (_channel, raw) => {
    try {
      publishLocal(JSON.parse(raw) as WsEvent)
    } catch (err) {
      console.error('[ws] failed to parse a ws event off redis', err)
    }
  })
}
