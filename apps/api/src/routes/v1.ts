import type { FastifyInstance } from 'fastify'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { fromNodeHeaders } from 'better-auth/node'
import { db, schema } from '@growthos/db'
import type {
  CrawlSummary,
  JobStatusResponse,
  MeResponse,
  Membership,
  OnboardingStatusResponse,
  OnboardingStrategy,
  Role,
} from '@growthos/types'
import { auth } from '../auth.js'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requireWorkspaceMember } from '../guards.js'
import { enqueue } from '../jobs/enqueue.js'
import { ensureRecommendations } from '../recommendations.js'
import {
  ensurePaidToOrganic,
  getScoredSearchTerms,
  getContentBriefs,
  updateRecommendationStatus,
} from '../search-terms.js'
import { ensureOrganicToPaid, getTopOrganicPages } from '../organic-to-paid.js'
import { ensureFatigueAlerts, getFatigueResults } from '../fatigue.js'
import { ensureAdPerformanceSeed, getMerTrend } from '../analytics.js'

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required.')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens.'),
})

async function listMemberships(userId: string): Promise<Membership[]> {
  const rows = await db
    .select({
      workspaceId: schema.workspaces.id,
      role: schema.workspace_members.role,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      plan: schema.workspaces.plan,
      onboardingComplete: schema.workspaces.onboardingComplete,
    })
    .from(schema.workspace_members)
    .innerJoin(
      schema.workspaces,
      eq(schema.workspace_members.organizationId, schema.workspaces.id),
    )
    .where(eq(schema.workspace_members.userId, userId))

  return rows.map((r) => ({
    workspaceId: r.workspaceId,
    role: r.role as Role,
    workspace: {
      id: r.workspaceId,
      name: r.name,
      slug: r.slug,
      plan: r.plan ?? 'starter',
      onboardingComplete: r.onboardingComplete ?? false,
    },
  }))
}

export async function registerV1Routes(app: FastifyInstance) {
  // Current user + their workspace memberships.
  app.get('/api/v1/auth/me', async (request): Promise<MeResponse> => {
    const user = await requireUser(request)
    const memberships = await listMemberships(user.id)
    return { user, memberships }
  })

  // Workspaces the caller belongs to.
  app.get('/api/v1/workspaces', async (request) => {
    const user = await requireUser(request)
    const memberships = await listMemberships(user.id)
    return {
      data: memberships.map((m) => ({ ...m.workspace, role: m.role })),
      total: memberships.length,
    }
  })

  // Create a workspace (delegates to Better Auth's organization plugin — single source of truth).
  app.post('/api/v1/workspaces', async (request, reply) => {
    await requireUser(request)
    const parsed = createWorkspaceSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.')
    }
    try {
      const workspace = await auth.api.createOrganization({
        body: { name: parsed.data.name, slug: parsed.data.slug },
        headers: fromNodeHeaders(request.headers),
      })
      reply.status(201)
      return { workspace }
    } catch {
      throw new AppError(
        'VALIDATION_ERROR',
        'Could not create the workspace — the URL slug may already be taken.',
      )
    }
  })

  // Platform connections for a workspace — guarded by membership.
  app.get('/api/v1/workspaces/:id/connections', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)

    const connections = await db
      .select({
        id: schema.platformConnections.id,
        workspaceId: schema.platformConnections.workspaceId,
        platform: schema.platformConnections.platform,
        accountName: schema.platformConnections.accountName,
        isActive: schema.platformConnections.isActive,
      })
      .from(schema.platformConnections)
      .where(eq(schema.platformConnections.workspaceId, id))

    return { data: connections, total: connections.length }
  })

  // Poll async job status — guarded by workspace membership. A job outside the caller's
  // workspace returns WORKSPACE_NOT_FOUND (don't leak existence).
  app.get('/api/v1/workspaces/:id/jobs/:jobId', async (request): Promise<JobStatusResponse> => {
    const user = await requireUser(request)
    const { id, jobId } = request.params as { id: string; jobId: string }
    await requireWorkspaceMember(user.id, id)

    const [job] = await db
      .select()
      .from(schema.backgroundJobs)
      .where(eq(schema.backgroundJobs.id, jobId))

    if (!job || job.workspaceId !== id) {
      throw new AppError('WORKSPACE_NOT_FOUND', 'Job not found in this workspace.')
    }

    return {
      jobId: job.id,
      status: job.status as JobStatusResponse['status'],
      progress: job.progress,
      ...(job.result != null ? { result: job.result } : {}),
      ...(job.error != null ? { error: job.error } : {}),
    }
  })

  // Persist the onboarding profile + kick off analysis. Idempotent: an in-flight
  // onboarding_analyze job is returned rather than duplicated.
  app.post('/api/v1/workspaces/:id/onboarding', async (request, reply) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')

    const body = z
      .object({
        websiteUrl: z.string().url(),
        businessCategory: z.string().min(1),
        monthlyAdBudget: z.number().int().nonnegative(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    await db
      .update(schema.workspaces)
      .set({
        websiteUrl: body.data.websiteUrl,
        businessCategory: body.data.businessCategory,
        monthlyAdBudget: body.data.monthlyAdBudget,
        onboardingStep: 'analyzing',
      })
      .where(eq(schema.workspaces.id, id))

    const [inflight] = await db
      .select({ id: schema.backgroundJobs.id })
      .from(schema.backgroundJobs)
      .where(
        and(
          eq(schema.backgroundJobs.workspaceId, id),
          eq(schema.backgroundJobs.type, 'onboarding_analyze'),
          inArray(schema.backgroundJobs.status, ['queued', 'processing']),
        ),
      )

    reply.status(202)
    if (inflight) {
      return { jobId: inflight.id, statusUrl: `/api/v1/workspaces/${id}/jobs/${inflight.id}` }
    }
    return enqueue({ workspaceId: id, type: 'onboarding_analyze', payload: body.data })
  })

  // Profile + generated analysis — the review step reads the strategy here.
  app.get(
    '/api/v1/workspaces/:id/onboarding',
    async (request): Promise<OnboardingStatusResponse> => {
      const user = await requireUser(request)
      const { id } = request.params as { id: string }
      await requireWorkspaceMember(user.id, id)

      const [ws] = await db
        .select({
          websiteUrl: schema.workspaces.websiteUrl,
          businessCategory: schema.workspaces.businessCategory,
          monthlyAdBudget: schema.workspaces.monthlyAdBudget,
          onboardingStep: schema.workspaces.onboardingStep,
          onboardingComplete: schema.workspaces.onboardingComplete,
        })
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, id))
      if (!ws) throw new AppError('WORKSPACE_NOT_FOUND', 'Workspace not found.')

      const [an] = await db
        .select()
        .from(schema.onboardingAnalyses)
        .where(eq(schema.onboardingAnalyses.workspaceId, id))

      return {
        profile: {
          websiteUrl: ws.websiteUrl,
          businessCategory: ws.businessCategory,
          monthlyAdBudget: ws.monthlyAdBudget,
          onboardingStep: ws.onboardingStep ?? 'business_intake',
          onboardingComplete: ws.onboardingComplete ?? false,
        },
        analysis:
          an?.strategy != null
            ? {
                crawlSummary: an.crawlSummary as CrawlSummary,
                strategy: an.strategy as OnboardingStrategy,
              }
            : null,
      }
    },
  )

  // Backend-owned recommendations — generated once from the canonical engine, then persisted.
  app.get('/api/v1/workspaces/:id/recommendations', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const data = await ensureRecommendations(id)
    return { data, total: data.length }
  })

  // Act / dismiss / snooze a recommendation.
  app.patch('/api/v1/workspaces/:id/recommendations/:recId', async (request) => {
    const user = await requireUser(request)
    const { id, recId } = request.params as { id: string; recId: string }
    await requireWorkspaceMember(user.id, id, 'manager')
    const body = z
      .object({
        status: z.enum(['pending', 'acted', 'dismissed', 'snoozed']),
        snoozedUntil: z.string().datetime().optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    const ok = await updateRecommendationStatus(
      id,
      recId,
      body.data.status,
      body.data.snoozedUntil ? new Date(body.data.snoozedUntil) : undefined,
    )
    if (!ok) throw new AppError('WORKSPACE_NOT_FOUND', 'Recommendation not found in this workspace.')
    return { id: recId, status: body.data.status }
  })

  // Paid-to-organic search-terms surface — scores seeded terms + ensures recs/briefs exist.
  app.get('/api/v1/workspaces/:id/google-ads/search-terms', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    await ensurePaidToOrganic(id)
    const data = getScoredSearchTerms()
    return { searchTerms: data, total: data.length }
  })

  // Organic-to-paid — top organic pages worth amplifying with Meta (+ generate recs/creative briefs).
  app.get('/api/v1/workspaces/:id/seo/top-pages', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    await ensureOrganicToPaid(id)
    const data = getTopOrganicPages()
    return { data, total: data.length }
  })

  // Blended MER — trend + channel breakdown from ClickHouse ad_performance (seeded per workspace).
  app.get('/api/v1/workspaces/:id/analytics/mer', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const q = z.object({ days: z.coerce.number().int().positive().max(90).optional() }).safeParse(request.query)
    const days = q.success ? (q.data.days ?? 30) : 30
    await ensureAdPerformanceSeed(id)
    return getMerTrend(id, days)
  })

  // Creative fatigue — scored Meta creatives (+ generate fatigue_alert recs).
  app.get('/api/v1/workspaces/:id/meta-ads/fatigue', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    await ensureFatigueAlerts(id)
    const data = getFatigueResults()
    return { data, total: data.length }
  })

  // Content briefs for a workspace (linked to paid_to_organic + organic_to_paid recommendations).
  app.get('/api/v1/workspaces/:id/content-briefs', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const data = await getContentBriefs(id)
    return { data, total: data.length }
  })

  // Completion gate — the single source of truth for "onboarding done".
  app.post('/api/v1/workspaces/:id/onboarding/complete', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    await db
      .update(schema.workspaces)
      .set({ onboardingComplete: true, onboardingStep: 'complete' })
      .where(eq(schema.workspaces.id, id))
    return { onboardingComplete: true }
  })
}
