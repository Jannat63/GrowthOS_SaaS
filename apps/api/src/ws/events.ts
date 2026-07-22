import type { WebSocketEvent } from '@growthos/types'
import { getRedis } from '../jobs/client.js'

/** Redis pub/sub channel carrying every real-time event across processes (API + worker). */
export const WS_CHANNEL = 'ws:events'

/** Wire envelope on the channel: the target workspace plus the client-facing event. */
export interface WsEnvelope {
  workspaceId: string
  event: WebSocketEvent
}

/**
 * Publish a real-time event to a workspace. Fire-and-forget and best-effort: it swallows
 * its own errors (same contract as `recordAudit`) so a bus failure can never break the
 * mutation that emitted it. The API's WS server (and any other API process) receives it
 * over Redis and fans it out to that workspace's connected sockets.
 */
export async function publishEvent(workspaceId: string, event: WebSocketEvent): Promise<void> {
  try {
    const payload: WsEnvelope = { workspaceId, event }
    await getRedis().publish(WS_CHANNEL, JSON.stringify(payload))
  } catch {
    // Never throw — real-time delivery is additive; clients still poll.
  }
}
