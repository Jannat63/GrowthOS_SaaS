import type { FastifyInstance } from 'fastify'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { fromNodeHeaders } from 'better-auth/node'
import { db, schema } from '@growthos/db'
import type {
  AcceptInvitationResponse,
  CrawlSummary,
  InvitationPreview,
  JobStatusResponse,
  MeResponse,
  Membership,
  OnboardingStatusResponse,
  OnboardingStrategy,
  Role,
  WhiteLabelConfig,
  AutomationConfig,
  WorkspaceInvitation,
  WorkspaceMember,
} from '@growthos/types'
import { auth } from '../auth.js'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requireWorkspaceMember, rankOf } from '../guards.js'
import {
  acceptInvitation,
  createInvitation,
  getInvitationPreview,
  listInvitations,
  revokeInvitation,
} from '../invitations.js'
import { enqueue } from '../jobs/enqueue.js'
import { listRecommendations } from '../recommendations.js'
import { parsePage } from '../pagination.js'
import {
  ensurePaidToOrganic,
  getScoredSearchTerms,
  getContentBriefs,
  updateRecommendationStatus,
} from '../search-terms.js'
import { ensureOrganicToPaid, getTopOrganicPages } from '../organic-to-paid.js'
import { ensureFatigueAlerts, getFatigueResults } from '../fatigue.js'
import { ensureAdPerformanceSeed, getMerTrend } from '../analytics.js'
import { getKeywordClusters, getKeywordRankings, getOrganicTraffic } from '../seo.js'
import { generateSchemaMarkup } from '../schema-markup-lookup.js'
import { getInternalLinkRecommendations } from '../internal-links.js'
import { getCampaignInsights } from '../google-ads.js'
import { getMetaCampaignInsights } from '../meta-ads.js'
import { getAttribution } from '../attribution.js'
import { getGrowthHub } from '../growth-hub.js'
import { getWeeklyReport } from '../intelligence.js'
import { generateReportPdf } from '../pdf-report-generate.js'
import { listComments, addComment, assignRecommendation } from '../collaboration.js'
import { recordAudit, getAuditLogs } from '../audit.js'
import { startTrial } from '../billing.js'
import { assertFeatureEnabled, assertCanCreateWorkspace } from '../plan-limits.js'
import { createApiKey, listApiKeys, revokeApiKey } from '../api-keys.js'
import { listSchedulerRuns } from '../scheduler/queries.js'
import { listRules, upsertRule, deleteRule } from '../automation/rules.js'
import { listActions, approveAction, rejectAction } from '../automation/actions.js'

// Default autonomous-loop config when a workspace has never customized it.
const DEFAULT_AUTOMATION: AutomationConfig = { enabled: true, cadenceMs: 7 * 24 * 60 * 60 * 1000 }

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
    const user = await requireUser(request)
    const parsed = createWorkspaceSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.')
    }
    // Plan gate (M5 P5.2). Deliberately outside the try below — that catch turns everything into
    // "the slug may already be taken", which would mask a 402 as a validation error.
    await assertCanCreateWorkspace(user.id)
    try {
      const workspace = await auth.api.createOrganization({
        body: { name: parsed.data.name, slug: parsed.data.slug },
        headers: fromNodeHeaders(request.headers),
      })
      // Start the 14-day Growth trial (PRD 4.1). Best-effort — never blocks workspace creation.
      if (workspace) void startTrial(workspace.id)
      reply.status(201)
      return { workspace }
    } catch (err) {
      // A duplicate slug is the overwhelmingly common cause, so that stays the user-facing message
      // — but log the real error rather than discarding it: an outage here used to be reported to
      // the user as a validation problem with no operator trace at all
      // (docs/AUDIT-2026-08-13-post-merge.md #12).
      request.log.error({ err }, 'createOrganization failed')
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
      .limit(1)

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
  // Paginated: this set grows without bound per workspace (see pagination.ts on the default).
  app.get('/api/v1/workspaces/:id/recommendations', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return listRecommendations(id, parsePage(request.query))
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
    const result = await listComments(id, recId, parsePage(request.query))
    if (result === null) {
      throw new AppError('WORKSPACE_NOT_FOUND', 'Recommendation not found in this workspace.')
    }
    return result
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
    // Default 20 rather than the shared default: this is a scrollback log, not a screen's worth of data.
    const { limit, offset } = parsePage(request.query, 20)
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

  // SEO keyword clusters (M3 P3.1 slice) — topical groups over the same tracked keyword set, via
  // the pure `clusterKeywords` engine. Lexical only: no SERP data, so no intent verification. The
  // response carries `intentVerified: false` on every cluster and the UI is expected to surface it.
  app.get('/api/v1/workspaces/:id/seo/clusters', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getKeywordClusters(id)
  })

  // SEO organic traffic (M3 P3.1) — per-page clicks/impressions/CTR/position from ClickHouse
  // organic_traffic (GSC page dimension; seeded until a real connection syncs).
  app.get('/api/v1/workspaces/:id/seo/traffic', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getOrganicTraffic(id)
  })

  // Schema markup generator (SEO extras) — no DataForSEO needed, works off the page URL +
  // workspace business info. `?page=` required; `?type=` optionally overrides the auto-detected
  // schema type.
  const schemaMarkupQuery = z.object({
    page: z.string().min(1, 'A page URL is required (?page=/blog/your-post).'),
    type: z.enum(['WebPage', 'Article', 'Product', 'CollectionPage', 'FAQPage', 'Organization']).optional(),
  })
  app.get('/api/v1/workspaces/:id/seo/schema-markup', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const query = schemaMarkupQuery.safeParse(request.query)
    if (!query.success) {
      throw new AppError('VALIDATION_ERROR', query.error.issues[0]?.message ?? 'Invalid input.')
    }
    return generateSchemaMarkup(id, query.data.page, query.data.type)
  })

  // Internal link optimizer (SEO extras) — no crawled link graph needed, works off already-tracked
  // keyword rankings + organic pages (see internal-links.ts for the "striking distance" heuristic).
  app.get('/api/v1/workspaces/:id/seo/internal-links', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getInternalLinkRecommendations(id)
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

  // Growth Hub headline metrics — revenue/spend/organic/conversions for the current window vs the
  // preceding one, plus the Goal Simulator's baseline. Windows are measured from the latest date in
  // the data, not today (see growth-hub.ts).
  app.get('/api/v1/workspaces/:id/analytics/growth-hub', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const q = z
      .object({ days: z.coerce.number().int().positive().max(90).optional() })
      .safeParse(request.query)
    return getGrowthHub(id, q.success ? (q.data.days ?? 30) : 30)
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
    const data = await getFatigueResults(id)
    return { data, total: data.length }
  })

  // Content briefs for a workspace (linked to paid_to_organic + organic_to_paid recommendations).
  app.get('/api/v1/workspaces/:id/content-briefs', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getContentBriefs(id, parsePage(request.query))
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

  // ── Team invitations (deferred at M2 P2.8 as "→ M5", never delivered there either) ─────────
  // Admin+ to create/list/revoke — the same sensitivity level as API keys, not a read. See
  // invitations.ts for why these go straight through Drizzle rather than Better Auth's
  // organization-plugin invitation API.
  const createInvitationSchema = z.object({
    email: z.string().email('Enter a valid email address.'),
    role: z.enum(['client', 'viewer', 'manager', 'admin', 'owner']),
  })

  app.post('/api/v1/workspaces/:id/invitations', async (request, reply): Promise<WorkspaceInvitation> => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    const member = await requireWorkspaceMember(user.id, id, 'admin')
    const body = createInvitationSchema.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    // An admin must not be able to hand out a role that outranks their own — owner is the one
    // role an admin specifically must not be able to grant.
    if (rankOf(body.data.role) > rankOf(member.role)) {
      throw new AppError(
        'FORBIDDEN',
        `You cannot invite someone as ${body.data.role} — that outranks your own role.`,
      )
    }
    const invitation = await createInvitation(id, body.data.email, body.data.role, user.id, user.name)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'invitation.created',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: { email: invitation.email, role: invitation.role },
      },
      request,
    )
    reply.status(201)
    return invitation
  })

  app.get(
    '/api/v1/workspaces/:id/invitations',
    async (request): Promise<{ data: WorkspaceInvitation[]; total: number }> => {
      const user = await requireUser(request)
      const { id } = request.params as { id: string }
      await requireWorkspaceMember(user.id, id, 'admin')
      const data = await listInvitations(id)
      return { data, total: data.length }
    },
  )

  app.delete('/api/v1/workspaces/:id/invitations/:invitationId', async (request) => {
    const user = await requireUser(request)
    const { id, invitationId } = request.params as { id: string; invitationId: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    await revokeInvitation(id, invitationId)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'invitation.revoked',
        entityType: 'invitation',
        entityId: invitationId,
      },
      request,
    )
    return { revoked: true }
  })

  // Public invite preview (no auth) — the accept-invite page reads this before, or without, a
  // session to render "You've been invited to <workspace> as <role>". Deliberately thin: see
  // invitations.ts's InvitationPreview doc comment for what's excluded and why.
  app.get('/api/v1/invitations/:id', async (request): Promise<InvitationPreview> => {
    const { id } = request.params as { id: string }
    return getInvitationPreview(id)
  })

  // Accepting requires a session — the invite is seated onto *this* signed-in user, and
  // acceptInvitation checks the invitation's email against theirs so a discovered invitation id
  // can't be used to join someone else's workspace under a different identity.
  app.post('/api/v1/invitations/:id/accept', async (request): Promise<AcceptInvitationResponse> => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    const result = await acceptInvitation(id, user.id, user.email)
    void recordAudit(
      {
        workspaceId: result.workspaceId,
        actorId: user.id,
        action: 'invitation.accepted',
        entityType: 'invitation',
        entityId: id,
        metadata: { role: result.role },
      },
      request,
    )
    return result
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
    await assertFeatureEnabled(id, 'whiteLabel')
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

  // White-labeled PDF report (M3 P3.5 Slice C2). Generated on demand and streamed straight back —
  // nothing is persisted (no R2 credentials exist in this codebase; see pdf-report-generate.ts).
  // Read access matches branding's: open down to `client`, the exact audience for a white-labeled
  // report.
  app.get('/api/v1/workspaces/:id/reports/pdf', async (request, reply) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'client')
    const { buffer, filename } = await generateReportPdf(id)
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    reply.type('application/pdf')
    return reply.send(buffer)
  })

  // Public API keys (M4 P4.4). Creating one requires the `apiAccess` plan feature (Scale
  // tier) — createApiKey itself throws PLAN_LIMIT_REACHED (402) for lower plans. Admin+ only,
  // same sensitivity level as billing actions.
  const createApiKeySchema = z.object({ name: z.string().min(1).max(100) })
  app.post('/api/v1/workspaces/:id/api-keys', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const body = createApiKeySchema.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    const key = await createApiKey(id, body.data.name, user.id)
    void recordAudit({ workspaceId: id, actorId: user.id, action: 'api_key.created', entityType: 'api_key', entityId: key.id }, request)
    return key
  })

  app.get('/api/v1/workspaces/:id/api-keys', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    // `{ data, total }` like every other list endpoint — this returned `{ keys }` alone.
    const data = await listApiKeys(id)
    return { data, total: data.length }
  })

  app.delete('/api/v1/workspaces/:id/api-keys/:keyId', async (request) => {
    const user = await requireUser(request)
    const { id, keyId } = request.params as { id: string; keyId: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    await revokeApiKey(id, keyId)
    void recordAudit({ workspaceId: id, actorId: user.id, action: 'api_key.revoked', entityType: 'api_key', entityId: keyId }, request)
    return { revoked: true }
  })

  // Autonomous automation loop config (scheduled intelligence). GET is any member; PATCH is admin+.
  // Restored after the 2026-08-13 main merge dropped it — see docs/AUDIT-2026-08-13-post-merge.md #1.
  app.get('/api/v1/workspaces/:id/automation', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'viewer')
    const [ws] = await db
      .select({ config: schema.workspaces.automationConfig })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, id))
    if (!ws) throw new AppError('WORKSPACE_NOT_FOUND', 'Workspace not found.')
    return { config: (ws.config as AutomationConfig | null) ?? DEFAULT_AUTOMATION }
  })

  app.patch('/api/v1/workspaces/:id/automation', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const body = z
      .object({
        enabled: z.boolean().optional(),
        // 1 hour .. 30 days — guards against a runaway (0) or absurd cadence.
        cadenceMs: z.number().int().min(3_600_000).max(2_592_000_000).optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    const [existing] = await db
      .select({ config: schema.workspaces.automationConfig })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, id))
    const current = (existing?.config as AutomationConfig | null) ?? DEFAULT_AUTOMATION
    const config: AutomationConfig = {
      enabled: body.data.enabled ?? current.enabled,
      cadenceMs: body.data.cadenceMs ?? current.cadenceMs,
    }
    await db.update(schema.workspaces).set({ automationConfig: config }).where(eq(schema.workspaces.id, id))
    void recordAudit(
      { workspaceId: id, actorId: user.id, action: 'automation.updated', entityType: 'workspace', entityId: id },
      request,
    )
    return { config }
  })

  // ── Automated campaign management (M4 · P4.3a) ─────────────────────────────────────────────
  // Rules are read by any member (seeing what's automated is not privileged) but written only by
  // admin+, and every write is audited: these decide whether the platform may spend money on its own.
  const ACTION_TYPES = ['pause_campaign', 'adjust_budget', 'refresh_creative', 'queue_content'] as const
  const ruleSchema = z.object({
    actionType: z.enum(ACTION_TYPES),
    enabled: z.boolean().optional(),
    mode: z.enum(['suggest', 'auto']).optional(),
    threshold: z
      .object({
        minWastedSpend: z.number().nonnegative().optional(),
        minRoas: z.number().nonnegative().optional(),
        budgetIncreasePercent: z.number().min(0).max(100).optional(),
        minConversions: z.number().int().nonnegative().optional(),
      })
      .nullable()
      .optional(),
    caps: z
      .object({
        // Hard ceiling on the ceiling: no rule may authorise more than a 50% single move, whatever
        // the operator types. A runaway budget change is the worst outcome this feature can produce.
        maxChangePercent: z.number().min(0).max(50).optional(),
        maxActionsPerDay: z.number().int().positive().max(100).optional(),
        minDailyBudget: z.number().nonnegative().optional(),
      })
      .nullable()
      .optional(),
  })

  app.get('/api/v1/workspaces/:id/automation/rules', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const data = await listRules(id)
    return { data, total: data.length }
  })

  // PATCH, not PUT: upsertRule overwrites only the fields supplied, so flipping `enabled` must not
  // wipe thresholds and caps someone tuned earlier. The verb matches the semantics.
  app.patch('/api/v1/workspaces/:id/automation/rules', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const body = ruleSchema.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    const rule = await upsertRule(id, body.data)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'automation.rule_updated',
        entityType: 'automation_rule',
        entityId: rule.id,
        metadata: { actionType: rule.actionType, mode: rule.mode, enabled: rule.enabled },
      },
      request,
    )
    return rule
  })

  app.delete('/api/v1/workspaces/:id/automation/rules/:actionType', async (request) => {
    const user = await requireUser(request)
    const { id, actionType } = request.params as { id: string; actionType: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    if (!(await deleteRule(id, actionType))) {
      throw new AppError('NOT_FOUND', 'No such automation rule in this workspace.')
    }
    void recordAudit(
      { workspaceId: id, actorId: user.id, action: 'automation.rule_deleted', entityType: 'automation_rule', metadata: { actionType } },
      request,
    )
    return { deleted: true }
  })

  // The approval queue. Readable by any member — an automated change to someone's campaigns should
  // be visible to everyone who can see the campaigns.
  app.get('/api/v1/workspaces/:id/automation/actions', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const q = z
      .object({ status: z.enum(['proposed', 'approved', 'executed', 'failed', 'rejected', 'expired']).optional() })
      .safeParse(request.query)
    return listActions(id, parsePage(request.query), q.success ? q.data.status : undefined)
  })

  // Approving runs the action. Admin+ — this is the human gate on real spend.
  app.post('/api/v1/workspaces/:id/automation/actions/:actionId/approve', async (request) => {
    const user = await requireUser(request)
    const { id, actionId } = request.params as { id: string; actionId: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const action = await approveAction(id, actionId, user.id)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'automation.action_approved',
        entityType: 'automation_action',
        entityId: actionId,
        metadata: { actionType: action.actionType, status: action.status },
      },
      request,
    )
    return action
  })

  app.post('/api/v1/workspaces/:id/automation/actions/:actionId/reject', async (request) => {
    const user = await requireUser(request)
    const { id, actionId } = request.params as { id: string; actionId: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const action = await rejectAction(id, actionId, user.id)
    void recordAudit(
      { workspaceId: id, actorId: user.id, action: 'automation.action_rejected', entityType: 'automation_action', entityId: actionId },
      request,
    )
    return action
  })

  // Observability: recent scheduler ticks. Admin+ (operational data). Runs are global ticks, but
  // membership-gating on the workspace keeps this behind the app's auth surface.
  app.get('/api/v1/workspaces/:id/scheduler/runs', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const q = z
      .object({ limit: z.coerce.number().int().positive().max(100).optional() })
      .safeParse(request.query)
    const runs = await listSchedulerRuns(q.success ? (q.data.limit ?? 20) : 20)
    return { runs, total: runs.length }
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
