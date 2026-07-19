import { Redis } from 'ioredis'

export const QUEUE_KEY = 'jobs:queue'

let client: Redis | null = null

// Lazy singleton so importing this file never opens a socket at module load (keeps inject() tests cheap).
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null })
  }
  return client
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
  }
}
