import Fastify, { type FastifyInstance, type FastifyError } from 'fastify'
import { sql } from 'drizzle-orm'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './auth.js'
import { AppError } from './errors.js'
import { logger } from './logger.js'
import { captureException } from './monitoring.js'
import { registerV1Routes } from './routes/v1.js'
import { registerConnectionRoutes } from './routes/connections.js'
import { registerBillingRoutes } from './routes/billing.js'
import { registerPublicApiRoutes } from './routes/public-api.js'
import { registerWsRoutes } from './routes/ws.js'

interface HealthCheck {
  name: string
  status: 'ok' | 'error'
  ms: number
  error?: string
}

/**
 * Runs one readiness probe with its own timeout and error boundary, so a single hanging dependency
 * cannot hang the health endpoint itself — the one endpoint that must always answer.
 */
async function probe(name: string, fn: () => Promise<unknown>): Promise<HealthCheck> {
  const started = Date.now()
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('probe timed out')), 3_000)),
    ])
    return { name, status: 'ok', ms: Date.now() - started }
  } catch (err) {
    return {
      name,
      status: 'error',
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Build the Fastify app. Kept separate from `listen` so it can be exercised
 * with `app.inject()` in tests without opening a port.
 */
// Return type inferred rather than annotated as FastifyInstance: supplying our own pino instance
// specialises the logger type parameter, and pinning it to the default would be a lie about what
// `app.log` actually is. Callers use `ReturnType<typeof buildApp>`.
export function buildApp() {
  // Share the root logger rather than letting Fastify build its own, so request logs and the
  // background work in scheduler/ws/automation land in one stream at one level. Fastify v5 takes a
  // pre-built logger as `loggerInstance`; passing it as `logger` type-infers an HTTP/2 server.
  const app = Fastify({ loggerInstance: logger })

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
  // The Stripe webhook is exempt: its caller is Stripe, not a user, deliveries arrive in bursts
  // from a small set of source IPs, and a 429 is treated by Stripe as a failed delivery to retry —
  // rate-limiting it turns a spike into a retry storm (docs/AUDIT-2026-08-13-post-merge.md #15).
  // It is authenticated by webhook signature instead, which is the stronger control here.
  app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 200),
    timeWindow: '1 minute',
    allowList: (request) => request.url === '/api/v1/billing/webhook',
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
    // Only unexpected failures are reported. AppError and validation errors above are the API
    // working correctly — a 402 or a 403 is an answer, not an incident, and routing those to
    // monitoring would bury the real crashes in expected traffic.
    captureException(err, {
      url: request.url,
      method: request.method,
      requestId: request.id,
      workspaceId: (request.params as { id?: string } | undefined)?.id,
    })
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
    })
  })

  // Liveness: is this process up and serving? Deliberately dependency-free, so a database blip
  // never causes an orchestrator to kill an otherwise healthy process.
  app.get('/health', async () => {
    return { status: 'ok', service: 'api', time: new Date().toISOString() }
  })

  /**
   * Readiness: can this process actually do its job?
   *
   * `/health` only ever proved the event loop was turning, so nothing in this system could
   * distinguish "up" from "up but unable to reach its database". Each dependency is probed
   * independently and reported by name, because "degraded" is only actionable if it says which
   * part — and a 503 with a named culprit is what makes this worth pointing a monitor at.
   */
  app.get('/health/ready', async (_request, reply) => {
    const checks = await Promise.all([
      probe('database', async () => {
        const { db } = await import('@growthos/db')
        await db.execute(sql`select 1`)
      }),
      probe('redis', async () => {
        const { getRedis } = await import('./jobs/client.js')
        await getRedis().ping()
      }),
      probe('clickhouse', async () => {
        const { getClickhouse } = await import('./analytics.js')
        await getClickhouse().query({ query: 'SELECT 1', format: 'JSONEachRow' })
      }),
    ])

    const failed = checks.filter((c) => c.status !== 'ok')
    if (failed.length > 0) reply.status(503)
    return {
      status: failed.length === 0 ? 'ok' : 'degraded',
      service: 'api',
      time: new Date().toISOString(),
      checks: Object.fromEntries(checks.map((c) => [c.name, c])),
    }
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
