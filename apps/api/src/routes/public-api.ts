import type { FastifyInstance, FastifyRequest } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { Redis } from 'ioredis'
import { AppError } from '../errors.js'
import { resolveApiKey } from '../api-keys.js'
import { moduleLogger } from '../logger.js'
import { getApiRateLimit } from '../plan-limits.js'
import { ensureAllRecommendations } from '../recommendations.js'
import { getKeywordRankings } from '../seo.js'
import { getWeeklyReport } from '../intelligence.js'

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by this plugin's preHandler after resolving the Authorization: Bearer <api key> header. */
    workspaceId?: string
    /**
     * The `api_keys` row id behind this request, set by the same preHandler (M4 P4.4a-1). It is the
     * rate limiter's bucket key. Deliberately the id and never the key or its hash: the key is a
     * live credential, and a bucket key ends up in Redis, in logs, and in error messages.
     */
    apiKeyId?: string
  }
}

/**
 * Is this a public-API *data* route — one that carries its own per-key rate limiter?
 *
 * Exported so `app.ts`'s global per-IP limiter can exempt exactly these and nothing else. It lives
 * here, beside the limiter it describes, so the exemption cannot drift away from the routes it is
 * meant to track. `/api/public/v1/docs` is excluded on purpose: the docs UI is mounted at the root
 * scope, so it never reaches this plugin's limiter and must keep the global one.
 */
export function isPublicApiDataRoute(url: string): boolean {
  const path = url.split('?')[0] ?? ''
  return path.startsWith('/api/public/v1/') && !path.startsWith('/api/public/v1/docs')
}

/**
 * Public REST API (M4 P4.4 — the buildable half of "GEO tracking + public API"). Bearer-token
 * authenticated (`Authorization: Bearer gos_live_...`), NOT cookie-session authenticated like
 * every other route in this app — this is meant to be called from external systems (Zapier,
 * a customer's own scripts), not a browser. Versioned separately at `/api/public/v1` so it can
 * evolve independently of the internal `/api/v1` surface the web app depends on.
 *
 * Read-only for now: recommendations, keyword rankings, and the weekly report — exactly the three
 * the blueprint names as public-API candidates. Registered as its own Fastify plugin (separate
 * encapsulation scope) so its auth precheck (`preHandler`) only ever applies to these routes.
 */

async function requireApiKey(request: FastifyRequest): Promise<{ workspaceId: string; keyId: string }> {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null
  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Missing Authorization: Bearer <api key> header.')
  }
  const resolved = await resolveApiKey(token)
  if (!resolved) {
    throw new AppError('UNAUTHORIZED', 'Invalid, revoked, or plan-ineligible API key.')
  }
  return resolved
}

const recommendationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    sourceChannel: { type: 'string' },
    targetChannel: { type: 'string' },
    title: { type: 'string' },
    body: { type: 'string' },
    impactScore: { type: 'number' },
    effortScore: { type: 'number' },
    urgencyScore: { type: 'number' },
    compositeScore: { type: 'number' },
    status: { type: 'string' },
  },
} as const

export async function registerPublicApiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    // Only guard this plugin's own routes — Fastify encapsulation scopes the hook here, but be
    // explicit in case this plugin is ever composed alongside others.
    const { workspaceId, keyId } = await requireApiKey(request)
    request.workspaceId = workspaceId
    request.apiKeyId = keyId
  })

  // ── Per-key rate limits (M4 P4.4a-1) ───────────────────────────────────────────────────────
  //
  // A second @fastify/rate-limit instance, registered INSIDE this plugin so it applies only to
  // these routes. That containment is not obvious — the plugin is `fastify-plugin`-wrapped, which
  // normally means "do not create a child context" — so it was verified rather than assumed: an
  // instance registered here throttles only this scope's routes and leaves the root app's routes
  // untouched. `app.ts` separately exempts these routes from the global per-IP limiter, or that
  // coarser bucket would still be the binding constraint.
  //
  // Two settings are load-bearing and easy to get wrong:
  //
  //  - `hook: 'preHandler'`. The default is `onRequest`, which runs BEFORE the auth hook above —
  //    `keyGenerator` would then see no `apiKeyId` and silently bucket every customer together
  //    under one fallback key. As a route-level preHandler it runs after this instance's own
  //    instance-level preHandler, so the key is always resolved by then.
  //  - `skipOnError: true`. It defaults to FALSE, meaning a store failure rejects the request. With
  //    a Redis-backed store that turns a Redis outage into a 500 on every public-API call. Failing
  //    open is the right trade here: rate limiting is a fairness control, not an authorization one,
  //    and the key has already been authenticated by the hook above.
  const rateLimitLog = moduleLogger('public-api-rate-limit')

  // A dedicated connection rather than the shared `getRedis()` singleton. That one is built with
  // `maxRetriesPerRequest: null` and the offline queue on, which is right for the job bridge but
  // fatal here: while Redis is unreachable a command is queued forever instead of rejecting, so it
  // would hang every public-API request rather than degrading. `ws.ts` documents hitting exactly
  // this and works around it with a timeout race, which is not available inside the limiter's own
  // store. These options make the command fail fast so `skipOnError` can do its job.
  const rateLimitRedis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1_000,
  })

  // ioredis emits 'error' on every failed reconnect attempt, and an unhandled 'error' on an
  // EventEmitter takes the process down — so this listener is required, not optional. Only the
  // first is logged at warn: an outage produces a steady stream of identical errors, and burying
  // the rest of the log under them is its own failure.
  let redisOutageLogged = false
  rateLimitRedis.on('error', (err) => {
    if (redisOutageLogged) return
    redisOutageLogged = true
    rateLimitLog.warn({ err }, 'public API rate-limit store unreachable — failing open until it returns')
  })
  rateLimitRedis.on('ready', () => {
    redisOutageLogged = false
  })

  // Tie the socket's life to the app's. Without this, every buildApp() in the test suite would
  // leave an open connection behind and the vitest worker would not exit.
  app.addHook('onClose', async () => {
    rateLimitRedis.disconnect()
  })

  await app.register(rateLimit, {
    redis: rateLimitRedis,
    nameSpace: 'growthos:public-api-rl:',
    hook: 'preHandler',
    skipOnError: true,
    timeWindow: '1 minute',
    // Draft-spec headers (`RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`) rather than
    // the `X-RateLimit-*` set the global limiter uses. The library emits the limit/remaining/reset
    // trio on EVERY response by default and adds `Retry-After` on a 429 — which is the contract we
    // want: a client that first learns its budget at the moment it is cut off cannot slow down in
    // time. Scoped to this plugin, so the global limiter's header names are unchanged.
    enableDraftSpec: true,
    // `PUBLIC_API_RATE_LIMIT_MAX` overrides the plan-derived ceiling, mirroring the global limiter's
    // own `RATE_LIMIT_MAX` escape hatch in app.ts. It exists so the ceiling can be pulled down in an
    // incident without a deploy — and so the tests can exhaust a bucket in three requests instead of
    // a hundred and twenty against a hosted database. The plan-resolution path it bypasses is
    // covered directly by `getApiRateLimit`'s own tests.
    max: async (request) => {
      const override = Number(process.env.PUBLIC_API_RATE_LIMIT_MAX)
      if (Number.isFinite(override) && override > 0) return override
      return getApiRateLimit(request.workspaceId!)
    },
    // One bucket per API key, so a customer's own keys do not throttle each other and their limit
    // does not move with their source IP. The `?? request.ip` arm is unreachable behind the auth
    // hook and exists so a future unauthenticated route in this scope fails closed onto an IP
    // bucket rather than sharing one global bucket named `undefined`.
    keyGenerator: (request) => request.apiKeyId ?? request.ip,
    // An AppError, not a plain envelope object — see the same note on the global limiter in app.ts.
    // The library throws this value, and only an Error reaches the error handler's typed branch; a
    // plain object falls through to the 500 catch-all.
    errorResponseBuilder: () =>
      new AppError('RATE_LIMITED', 'API rate limit exceeded for this key — see the RateLimit-Reset header.'),
  })

  app.get(
    '/api/public/v1/recommendations',
    {
      schema: {
        tags: ['Public API'],
        summary: 'List cross-channel recommendations for the authenticated workspace',
        security: [{ apiKey: [] }],
        response: { 200: { type: 'object', properties: { recommendations: { type: 'array', items: recommendationSchema } } } },
      },
    },
    async (request) => {
      // Set by the preHandler above, which runs before every handler in this plugin and throws if unresolved.
      const workspaceId = request.workspaceId!
      return { recommendations: await ensureAllRecommendations(workspaceId) }
    },
  )

  app.get(
    '/api/public/v1/keywords',
    {
      schema: {
        tags: ['Public API'],
        summary: 'List tracked keyword rankings for the authenticated workspace',
        security: [{ apiKey: [] }],
      },
    },
    async (request) => {
      // Set by the preHandler above, which runs before every handler in this plugin and throws if unresolved.
      const workspaceId = request.workspaceId!
      return getKeywordRankings(workspaceId)
    },
  )

  app.get(
    '/api/public/v1/reports/weekly',
    {
      schema: {
        tags: ['Public API'],
        summary: "The authenticated workspace's current weekly intelligence report",
        security: [{ apiKey: [] }],
      },
    },
    async (request) => {
      // Set by the preHandler above, which runs before every handler in this plugin and throws if unresolved.
      const workspaceId = request.workspaceId!
      return getWeeklyReport(workspaceId)
    },
  )
}
