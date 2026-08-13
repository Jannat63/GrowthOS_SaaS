import Fastify, { type FastifyInstance, type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './auth.js'
import { AppError } from './errors.js'
import { registerV1Routes } from './routes/v1.js'
import { registerConnectionRoutes } from './routes/connections.js'
import { registerBillingRoutes } from './routes/billing.js'
import { registerPublicApiRoutes } from './routes/public-api.js'
import { registerWsRoutes } from './routes/ws.js'

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

  // Security headers (M5 P5.4 hardening). CSP is left at helmet's safe default rather than a
  // hand-tuned policy — this is an API (JSON responses only, no HTML/script serving), so the
  // main value here is the non-CSP headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.).
  // Revisit if this app ever serves HTML/inline scripts directly.
  app.register(helmet)

  // Rate limiting (P2.8 hardening): 200 req/min per IP by default, emitting the RATE_LIMITED envelope.
  app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down.', statusCode: 429 },
    }),
  })

  // OpenAPI spec + interactive docs for the Public API (M4 P4.4). Generated from the route
  // schemas in routes/public-api.ts rather than hand-written, so it can't drift out of sync with
  // the actual routes. Internal /api/v1 routes have no `schema` blocks, so they're naturally
  // excluded — only what's explicitly documented shows up.
  app.register(swagger, {
    openapi: {
      info: { title: 'GrowthOS Public API', version: '1', description: 'Read access to your recommendations, keyword rankings, and weekly report. Scale plan required — generate a key from Settings → API Keys.' },
      servers: [{ url: '/api/public/v1' }],
      components: {
        securitySchemes: {
          apiKey: { type: 'http', scheme: 'bearer', description: 'A key created from Settings → API Keys, e.g. gos_live_...' },
        },
      },
    },
  })
  app.register(swaggerUi, { routePrefix: '/api/public/v1/docs' })

  // Typed error envelope: { error: { code, message, statusCode } } (see CLAUDE.md).
  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err instanceof AppError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message, statusCode: err.statusCode } })
    }
    if (err.validation) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: err.message, statusCode: 400 } })
    }
    request.log.error(err)
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
    })
  })

  app.get('/health', async () => {
    return { status: 'ok', service: 'api', time: new Date().toISOString() }
  })

  // Versioned domain routes.
  app.register(registerV1Routes)
  // Real platform OAuth connect/callback/disconnect/sync (M3 P3.0).
  app.register(registerConnectionRoutes)
  // Stripe billing: checkout, subscription read, webhook (M5 P5.1).
  app.register(registerBillingRoutes)
  // Public REST API — Bearer-token authenticated, versioned separately (M4 P4.4).
  app.register(registerPublicApiRoutes)
  // Real-time WebSocket transport — recommendation:new, job:complete/failed, meta:fatigue_alert,
  // analytics:mer_alert, intelligence:report_ready.
  app.register(registerWsRoutes)

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
