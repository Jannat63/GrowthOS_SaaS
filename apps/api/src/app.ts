import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './auth.js'

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

  // Better Auth (D1) owns /api/auth/* — sign-up/in, sessions, and the organization
  // (workspace) endpoints. Convert Fastify's req/reply to the Web Request/Response
  // that Better Auth's handler expects.
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const url = new URL(request.url, `http://${request.headers.host}`)
      const headers = fromNodeHeaders(request.headers)
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      })
      const response = await auth.handler(req)
      reply.status(response.status)
      response.headers.forEach((value, key) => reply.header(key, value))
      return reply.send(response.body ? await response.text() : null)
    },
  })

  return app
}
