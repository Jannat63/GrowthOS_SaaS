import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

/**
 * Build the Fastify app. Kept separate from `listen` so it can be exercised
 * with `app.inject()` in tests without opening a port.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true })

  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  })

  app.get('/health', async () => {
    return { status: 'ok', service: 'api', time: new Date().toISOString() }
  })

  return app
}
