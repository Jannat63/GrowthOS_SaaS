import { Redis } from 'ioredis'
import { moduleLogger } from '../logger.js'

export const QUEUE_KEY = 'jobs:queue'

const log = moduleLogger('jobs-redis')

let client: Redis | null = null

// Lazy singleton so importing this file never opens a socket at module load (keeps inject() tests cheap).
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null })

    // ioredis emits 'error' on every failed connection attempt. With no listener it falls back to
    // printing `[ioredis] Unhandled error event: ...` straight to stderr — unstructured, outside
    // pino, and invisible to any aggregator, which is the exact failure `logger.ts` exists to stop.
    // Only the first is logged at warn: a Redis outage produces one of these per retry, forever.
    let outageLogged = false
    client.on('error', (err) => {
      if (outageLogged) return
      outageLogged = true
      log.warn({ err }, 'job-bridge redis connection failed — retrying in the background')
    })
    client.on('ready', () => {
      outageLogged = false
    })
  }
  return client
}

export async function closeRedis(): Promise<void> {
  if (!client) return

  // Clear the singleton FIRST. `quit()` rejects on a client that never connected, and the old order
  // (quit, then null) left the dead client cached on that path — so a caller closing a broken
  // connection got an exception and kept the broken connection. Whatever happens below, the next
  // getRedis() now builds a fresh client against the current REDIS_URL.
  const closing = client
  client = null
  try {
    await closing.quit()
  } catch {
    closing.disconnect()
  }
}
