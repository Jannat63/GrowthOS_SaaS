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
  WhiteLabelConfig,
  WorkspaceMember,
} from '@growthos/types'
import { auth } from '../auth.js'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requireWorkspaceMember } from '../guards.js'
import { enqueue } from '../jobs/enqueue.js'
import { ensureAllRecommendations } from '../recommendations.js'
import {
  ensurePaidToOrganic,
  getScoredSearchTerms,
  getContentBriefs,
  updateRecommendationStatus,
} from '../search-terms.js'
import { ensureOrganicToPaid, getTopOrganicPages } from '../organic-to-paid.js'
import { ensureFatigueAlerts, getFatigueResults } from '../fatigue.js'
import { ensureAdPerformanceSeed, getMerTrend } from '../analytics.js'
import { getKeywordRankings, getOrganicTraffic } from '../seo.js'
import { getCampaignInsights } from '../google-ads.js'
import { getMetaCampaignInsights } from '../meta-ads.js'
import { getAttribution } from '../attribution.js'
import { getWeeklyReport } from '../intelligence.js'
import { listComments, addComment, assignRecommendation } from '../collaboration.js'
import { recordAudit, getAuditLogs } from '../audit.js'
import { startTrial } from '../billing.js'

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
      // Start the 14-day Growth trial (PRD 4.1). Best-effort — never blocks workspace creation.
      if (workspace) void startTrial(workspace.id)
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
        lastSyncedAt: schema.platformConnections.lastSyncedAt,
        syncError: schema.platformConnections.syncError,
      })
      .from(schema.platformConnections)
      .where(eq(schema.platformConnections.workspaceId, id))

    return {
      data: connections.map((c) => ({
        ...c,
        lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
      })),
      total: connections.length,
    }
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
    const data = await ensureAllRecommendations(id)
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
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'recommendation.status_changed',
        entityType: 'recommendation',
        entityId: recId,
        metadata: { status: body.data.status },
      },
      request,
    )
    return { id: recId, status: body.data.status }
  })

  // Recommendation collaboration — comment thread (M3 P3.5). Any member may read/comment.
  app.get('/api/v1/workspaces/:id/recommendations/:recId/comments', async (request) => {
    const user = await requireUser(request)
    const { id, recId } = request.params as { id: string; recId: string }
    await requireWorkspaceMember(user.id, id)
    const data = await listComments(id, recId)
    if (data === null) {
      throw new AppError('WORKSPACE_NOT_FOUND', 'Recommendation not found in this workspace.')
    }
    return { data, total: data.length }
  })

  app.post('/api/v1/workspaces/:id/recommendations/:recId/comments', async (request, reply) => {
    const user = await requireUser(request)
    const { id, recId } = request.params as { id: string; recId: string }
    await requireWorkspaceMember(user.id, id)
    const body = z
      .object({ body: z.string().min(1, 'Comment cannot be empty.').max(2000) })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    const comment = await addComment(id, recId, user.id, body.data.body)
    if (comment === null) {
      throw new AppError('WORKSPACE_NOT_FOUND', 'Recommendation not found in this workspace.')
    }
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'recommendation.commented',
        entityType: 'recommendation',
        entityId: recId,
      },
      request,
    )
    reply.status(201)
    return comment
  })

  // Assign / unassign a recommendation (+ optional due date). Manager+ only.
  app.patch('/api/v1/workspaces/:id/recommendations/:recId/assignment', async (request) => {
    const user = await requireUser(request)
    const { id, recId } = request.params as { id: string; recId: string }
    await requireWorkspaceMember(user.id, id, 'manager')
    const body = z
      .object({
        assignedTo: z.string().min(1).nullable(),
        dueDate: z.string().datetime().nullable().optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    // The assignee must actually belong to this workspace — don't allow a dangling/foreign userId.
    if (body.data.assignedTo) {
      const [member] = await db
        .select({ userId: schema.workspace_members.userId })
        .from(schema.workspace_members)
        .where(
          and(
            eq(schema.workspace_members.organizationId, id),
            eq(schema.workspace_members.userId, body.data.assignedTo),
          ),
        )
      if (!member) {
        throw new AppError('VALIDATION_ERROR', 'Assignee must be a member of this workspace.')
      }
    }
    const ok = await assignRecommendation(
      id,
      recId,
      body.data.assignedTo,
      body.data.dueDate ? new Date(body.data.dueDate) : null,
    )
    if (!ok) throw new AppError('WORKSPACE_NOT_FOUND', 'Recommendation not found in this workspace.')
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: body.data.assignedTo ? 'recommendation.assigned' : 'recommendation.unassigned',
        entityType: 'recommendation',
        entityId: recId,
        metadata: { assignedTo: body.data.assignedTo },
      },
      request,
    )
    return { id: recId, assignedTo: body.data.assignedTo, dueDate: body.data.dueDate ?? null }
  })

  // Workspace audit log — most-recent-first, paginated. Admin+ only: it exposes operational
  // history (integration connect/disconnect/sync) that viewers/clients shouldn't see.
  app.get('/api/v1/workspaces/:id/audit-logs', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const q = z
      .object({
        limit: z.coerce.number().int().positive().max(100).optional(),
        offset: z.coerce.number().int().nonnegative().optional(),
      })
      .safeParse(request.query)
    const limit = q.success ? (q.data.limit ?? 20) : 20
    const offset = q.success ? (q.data.offset ?? 0) : 0
    return getAuditLogs(id, limit, offset)
  })

  // Google Ads campaign insights (M3 P3.2 slice) — advisor over ClickHouse ad_performance
  // (seeded until a real Google Ads connection syncs; live API push is gated on the dev token).
  app.get('/api/v1/workspaces/:id/google-ads/campaigns', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getCampaignInsights(id)
  })

  // Meta Ads campaign insights (M3 P3.3 slice) — advisor over ClickHouse ad_performance (meta_ads;
  // seeded until a real Meta connection syncs; live push gated on Meta App Review).
  app.get('/api/v1/workspaces/:id/meta-ads/campaigns', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getMetaCampaignInsights(id)
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

  // SEO rank tracking (M3 P3.1) — keyword positions from ClickHouse keyword_rankings (GSC-fed;
  // seeded until a real Search Console connection syncs).
  app.get('/api/v1/workspaces/:id/seo/rankings', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getKeywordRankings(id)
  })

  // SEO organic traffic (M3 P3.1) — per-page clicks/impressions/CTR/position from ClickHouse
  // organic_traffic (GSC page dimension; seeded until a real connection syncs).
  app.get('/api/v1/workspaces/:id/seo/traffic', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getOrganicTraffic(id)
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

  // Weekly Growth Intelligence Report (M3 P3.4) — generate + persist, return latest.
  app.get('/api/v1/workspaces/:id/intelligence/report', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getWeeklyReport(id)
  })

  // Cross-channel attribution (M4 P4.1) — every model's per-channel credit over conversion paths.
  app.get('/api/v1/workspaces/:id/analytics/attribution', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getAttribution(id)
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

  // Workspace members + roles (P2.8 settings) — guarded by membership.
  app.get('/api/v1/workspaces/:id/members', async (request): Promise<{ data: WorkspaceMember[]; total: number }> => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const rows = await db
      .select({
        userId: schema.workspace_members.userId,
        role: schema.workspace_members.role,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.workspace_members)
      .innerJoin(schema.user, eq(schema.workspace_members.userId, schema.user.id))
      .where(eq(schema.workspace_members.organizationId, id))
    const data = rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      role: r.role as Role,
    }))
    return { data, total: data.length }
  })

  // White-label branding (M3 P3.5 Slice C). GET is any member (branding applies for everyone);
  // PATCH is admin+.
  app.get('/api/v1/workspaces/:id/branding', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    // Branding is the white-label brand every member sees — including `client` (rank below viewer),
    // who is the exact audience for white-labeling. Read is open to any member down to `client`.
    await requireWorkspaceMember(user.id, id, 'client')
    const [ws] = await db
      .select({ config: schema.workspaces.whiteLabelConfig })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, id))
    if (!ws) throw new AppError('WORKSPACE_NOT_FOUND', 'Workspace not found.')
    return { config: (ws.config as Record<string, unknown> | null) ?? {} }
  })

  app.patch('/api/v1/workspaces/:id/branding', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const body = z
      .object({
        agencyName: z.string().max(60).nullable().optional(),
        logoUrl: z.string().url().max(2000).nullable().optional().or(z.literal('')),
        primaryColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color, e.g. #4f46e5.')
          .nullable()
          .optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    // Normalize empty strings to null so the UI falls back to defaults cleanly.
    const config: WhiteLabelConfig = {
      agencyName: body.data.agencyName || null,
      logoUrl: body.data.logoUrl || null,
      primaryColor: body.data.primaryColor || null,
    }
    await db.update(schema.workspaces).set({ whiteLabelConfig: config }).where(eq(schema.workspaces.id, id))
    void recordAudit(
      { workspaceId: id, actorId: user.id, action: 'branding.updated', entityType: 'workspace', entityId: id },
      request,
    )
    return { config }
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
