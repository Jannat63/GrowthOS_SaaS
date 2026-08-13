import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AppError } from '../errors.js'
import { resolveApiKey } from '../api-keys.js'
import { ensureAllRecommendations } from '../recommendations.js'
import { getKeywordRankings } from '../seo.js'
import { getWeeklyReport } from '../intelligence.js'

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by this plugin's preHandler after resolving the Authorization: Bearer <api key> header. */
    workspaceId?: string
  }
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

async function requireApiKey(request: FastifyRequest): Promise<string> {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null
  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Missing Authorization: Bearer <api key> header.')
  }
  const resolved = await resolveApiKey(token)
  if (!resolved) {
    throw new AppError('UNAUTHORIZED', 'Invalid, revoked, or plan-ineligible API key.')
  }
  return resolved.workspaceId
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
    request.workspaceId = await requireApiKey(request)
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
