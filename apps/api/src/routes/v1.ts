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
import { getBrandGuidelinesForDisplay, upsertBrandGuidelines } from '../brand.js'
import { generateCreatives } from '../creatives.js'
import {
  concludeExperiment,
  createExperiment,
  deleteExperiment,
  listExperiments,
  setExperimentStatus,
} from '../experiments.js'
import { BRAND_TONES } from '@growthos/logic'
import { enqueue } from '../jobs/enqueue.js'
import { listRecommendations } from '../recommendations.js'
import { parsePage } from '../pagination.js'
import {
  ensurePaidToOrganic,
  getScoredSearchTerms,
  getContentBriefs,
  updateRecommendationStatus,
  updateContentBriefStatus,
} from '../search-terms.js'
import { ensureOrganicToPaid, getTopOrganicPages } from '../organic-to-paid.js'
import { ensureFatigueAlerts, getCreativeScorecard, getFatigueResults } from '../fatigue.js'
import { ensureAdPerformanceSeed, getMerTrend } from '../analytics.js'
import { getKeywordClusters, getKeywordRankings, getOrganicTraffic } from '../seo.js'
import { generateSchemaMarkup } from '../schema-markup-lookup.js'
import { getInternalLinkRecommendations } from '../internal-links.js'
import { getCampaignInsights } from '../campaign-insights.js'
import { getAttribution } from '../attribution.js'
import { getGrowthHub } from '../growth-hub.js'
import { getArchivedReport, getWeeklyReport, listReportPeriods } from '../intelligence.js'
import { generateReportPdf } from '../pdf-report-generate.js'
import { listComments, addComment, assignRecommendation } from '../collaboration.js'
import { recordAudit, getAuditLogs } from '../audit.js'
import { startTrial } from '../billing.js'
import { assertFeatureEnabled, assertCanCreateWorkspace } from '../plan-limits.js'
import { createApiKey, listApiKeys, revokeApiKey } from '../api-keys.js'
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  enableWebhookEndpoint,
  listWebhookEndpoints,
} from '../webhooks/endpoints.js'
import { listSchedulerRuns } from '../scheduler/queries.js'
import { listRules, upsertRule, deleteRule } from '../automation/rules.js'
import { listActions, approveAction, rejectAction, runAutomationForWorkspace } from '../automation/actions.js'

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

/**
 * The reporting window every analytics route accepts.
 *
 * `from`/`to` are what the dashboard's date picker sends; `days` is the older shorthand, kept so
 * existing callers and the public API keep working. When both are present the explicit range wins
 * (see `resolveWindow`). The `days` ceiling is generous rather than 90 because the window is really
 * bounded by the data a workspace has, which `getDataBounds` reports back to the client.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DATE_WINDOW_QUERY = {
  from: z.string().regex(ISO_DATE).optional(),
  to: z.string().regex(ISO_DATE).optional(),
  days: z.coerce.number().int().positive().max(400).optional(),
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
  //
  // Both campaign endpoints take the same date window as every other data route. They used to take
  // none at all and sum the whole table, so their totals were all-time figures rendered next to
  // windowed ones with nothing on screen to tell them apart.
  app.get('/api/v1/workspaces/:id/google-ads/campaigns', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const q = z.object(DATE_WINDOW_QUERY).safeParse(request.query)
    return getCampaignInsights(id, 'google_ads', q.success ? q.data : {})
  })

  // Meta Ads campaign insights (M3 P3.3 slice) — advisor over ClickHouse ad_performance (meta_ads;
  // seeded until a real Meta connection syncs; live push gated on Meta App Review).
  app.get('/api/v1/workspaces/:id/meta-ads/campaigns', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const q = z.object(DATE_WINDOW_QUERY).safeParse(request.query)
    return getCampaignInsights(id, 'meta_ads', q.success ? q.data : {})
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
  //
  // With `?week=` it serves that week straight out of the archive instead, unchanged from when it
  // was generated. That distinction matters: a past week must not be recomputed against today's
  // data, or the "report" for a week gone by would silently rewrite itself on every read.
  app.get('/api/v1/workspaces/:id/intelligence/report', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)

    const query = z.object({ week: z.string().date().optional() }).safeParse(request.query)
    if (!query.success) {
      throw new AppError('VALIDATION_ERROR', 'week must be a YYYY-MM-DD date.')
    }
    const week = query.data.week
    if (!week) return getWeeklyReport(id)

    const archived = await getArchivedReport(id, week)
    if (!archived) {
      throw new AppError('NOT_FOUND', `No report is stored for the week of ${week}.`)
    }
    return archived
  })

  // Which weeks this workspace has a stored report for — the report archive's index.
  app.get('/api/v1/workspaces/:id/intelligence/reports', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const data = await listReportPeriods(id)
    return { data, total: data.length }
  })

  // Cross-channel attribution (M4 P4.1) — every model's per-channel credit over conversion paths.
  app.get('/api/v1/workspaces/:id/analytics/attribution', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getAttribution(id)
  })

  // Growth Hub headline metrics — revenue/spend/organic/conversions for the selected window vs the
  // equal-length window before it, plus the Goal Simulator's baseline and the workspace's data
  // bounds. With no range given the window is anchored to the latest date in the data, not today
  // (see growth-hub.ts and date-window.ts).
  app.get('/api/v1/workspaces/:id/analytics/growth-hub', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const q = z.object(DATE_WINDOW_QUERY).safeParse(request.query)
    return getGrowthHub(id, q.success ? q.data : {})
  })

  // Blended MER — trend + channel breakdown from ClickHouse ad_performance (seeded per workspace).
  app.get('/api/v1/workspaces/:id/analytics/mer', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    const q = z.object(DATE_WINDOW_QUERY).safeParse(request.query)
    await ensureAdPerformanceSeed(id)
    return getMerTrend(id, q.success ? q.data : {})
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

  // Creative scorecard (M4 P4.2a-2) — grades creatives that have RUN against this account's own
  // trailing CTR median. Not a prediction: see creative-scorecard.ts for why prediction is not
  // built. Read-level guard, like fatigue — this is analysis of existing data, not an action.
  app.get('/api/v1/workspaces/:id/meta-ads/scorecard', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getCreativeScorecard(id)
  })

  // Content briefs for a workspace (linked to paid_to_organic + organic_to_paid recommendations).
  app.get('/api/v1/workspaces/:id/content-briefs', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getContentBriefs(id, parsePage(request.query))
  })

  // Advance a brief through the editorial pipeline. Manager+, matching the recommendation status
  // route — moving something to "published" is a claim about work that shipped, not a read.
  app.patch('/api/v1/workspaces/:id/content-briefs/:briefId', async (request) => {
    const user = await requireUser(request)
    const { id, briefId } = request.params as { id: string; briefId: string }
    await requireWorkspaceMember(user.id, id, 'manager')
    const body = z
      .object({
        status: z.enum(['draft', 'approved', 'in_progress', 'published']),
        publishedUrl: z.string().url('Enter a valid URL.').nullable().optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    const updated = await updateContentBriefStatus(
      id,
      briefId,
      body.data.status,
      body.data.publishedUrl,
    )
    if (!updated) throw new AppError('WORKSPACE_NOT_FOUND', 'Content brief not found in this workspace.')
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'content_brief.status_changed',
        entityType: 'content_brief',
        entityId: briefId,
        metadata: { status: body.data.status },
      },
      request,
    )
    return updated
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
          .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color, e.g. #ce4218.')
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

  // Creative generation (M4 P4.2a-4). `manager`+, matching recommendation act/assign — the other
  // day-to-day working actions. viewer/client must not consume a workspace's paid quota.
  //
  // This route existing at all IS the slice: generation used to run only in the browser, which made
  // `aiCreativesPerMonth` a limit that could not bind. See creatives.ts.
  app.post('/api/v1/workspaces/:id/creatives/generate', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'manager')

    const body = z
      .discriminatedUnion('kind', [
        z.object({
          kind: z.literal('ad-copy'),
          product: z.string().min(1).max(120),
          benefit: z.string().min(1).max(200),
          painPoint: z.string().min(1).max(200),
          count: z.number().int().min(1).max(25).optional(),
        }),
        z.object({
          kind: z.literal('ugc-script'),
          product: z.string().min(1).max(120),
          // 15 | 30 | 60 — the only durations generateUGCScript has scripts for. Anything else
          // would fall through its lookup and return undefined.
          duration: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
        }),
        z.object({
          kind: z.literal('rsa'),
          keyword: z.string().min(1).max(120),
          audience: z.string().max(120).optional(),
        }),
      ])
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    return generateCreatives(id, body.data)
  })

  // Creative variant experiments (M4 P4.2a-3) — an experiment LOG. Nothing here publishes an ad or
  // computes a winner; the test runs in the customer's own ad manager and the conclusion is an
  // explicitly human act, stored `selfReported`. See experiments.ts.
  //
  // Read is viewer+; every write is manager+, matching recommendation act/assign.
  app.get('/api/v1/workspaces/:id/creative-experiments', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'viewer')
    const data = await listExperiments(id)
    return { data, total: data.length }
  })

  app.post('/api/v1/workspaces/:id/creative-experiments', async (request, reply) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'manager')

    const body = z
      .object({
        hypothesis: z.string().min(1, 'A hypothesis is required.').max(2000),
        // `unknown` on purpose: a variant is a snapshot of whatever the generator produced —
        // AdCopyVariant, UGCScript, or a plain RSA string. Constraining the shape here would mean
        // updating this schema every time a generator is added.
        variantA: z.unknown().refine((v) => v != null, 'Variant A is required.'),
        variantB: z.unknown().refine((v) => v != null, 'Variant B is required.'),
        variantALabel: z.string().max(80).optional(),
        variantBLabel: z.string().max(80).optional(),
        successMetric: z.string().min(1, 'Say how this will be judged.').max(200),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    const experiment = await createExperiment(id, body.data, user.id)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'creative_experiment.created',
        entityType: 'creative_experiment',
        entityId: experiment.id,
      },
      request,
    )
    reply.status(201)
    return { experiment }
  })

  // Launch / un-launch. `concluded` is deliberately unreachable here — see the conclude route.
  app.patch('/api/v1/workspaces/:id/creative-experiments/:expId/status', async (request) => {
    const user = await requireUser(request)
    const { id, expId } = request.params as { id: string; expId: string }
    await requireWorkspaceMember(user.id, id, 'manager')

    const body = z
      .object({ status: z.enum(['draft', 'running', 'concluded']) })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    return { experiment: await setExperimentStatus(id, expId, body.data.status) }
  })

  app.post('/api/v1/workspaces/:id/creative-experiments/:expId/conclude', async (request) => {
    const user = await requireUser(request)
    const { id, expId } = request.params as { id: string; expId: string }
    await requireWorkspaceMember(user.id, id, 'manager')

    const body = z
      .object({
        winner: z.enum(['a', 'b', 'inconclusive']),
        notes: z.string().max(4000).optional(),
        // Whatever the user read in their own ad manager. Stored flagged `selfReported` and never
        // used to pick or second-guess the winner.
        metricA: z.number().nonnegative().optional(),
        metricB: z.number().nonnegative().optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    const experiment = await concludeExperiment(id, expId, body.data, user.id)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'creative_experiment.concluded',
        entityType: 'creative_experiment',
        entityId: expId,
      },
      request,
    )
    return { experiment }
  })

  app.delete('/api/v1/workspaces/:id/creative-experiments/:expId', async (request) => {
    const user = await requireUser(request)
    const { id, expId } = request.params as { id: string; expId: string }
    await requireWorkspaceMember(user.id, id, 'manager')
    await deleteExperiment(id, expId)
    return { ok: true }
  })

  // Brand guidelines (M4 P4.2a-1). Read is viewer+ (anyone who can see generated copy benefits from
  // knowing the constraints it was produced under); write is admin+, like branding. Not plan-gated —
  // see brand.ts for why the gate belongs at generation instead.
  app.get('/api/v1/workspaces/:id/brand-guidelines', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'viewer')
    return { guidelines: await getBrandGuidelinesForDisplay(id) }
  })

  app.put('/api/v1/workspaces/:id/brand-guidelines', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')

    const body = z
      .object({
        tone: z.enum(BRAND_TONES as unknown as [string, ...string[]]).optional(),
        bannedTerms: z.array(z.string()).max(100).optional(),
        requiredDisclaimers: z.array(z.string()).max(100).optional(),
        valueProps: z.array(z.string()).max(100).optional(),
        targetPersona: z.string().max(280).nullable().optional(),
        // Grade level. Bounded because the filter compares against it: an unbounded value makes the
        // reading-level rule either inert (huge) or a total block (negative).
        readingLevel: z.number().int().min(1).max(20).nullable().optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    const guidelines = await upsertBrandGuidelines(id, body.data)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'brand_guidelines.updated',
        entityType: 'workspace',
        entityId: id,
      },
      request,
    )
    return { guidelines }
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

  // Outbound webhooks (M4 P4.4a-2) — the push half of the public API. Same `apiAccess` gate and the
  // same admin+ sensitivity as API keys: an endpoint URL is where a workspace's data gets sent, and
  // the create response is the only time its signing secret is ever visible.
  const createWebhookSchema = z.object({
    url: z.string().min(1),
    eventTypes: z.array(z.string().min(1)).min(1),
  })
  app.post('/api/v1/workspaces/:id/webhooks', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const body = createWebhookSchema.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }
    const endpoint = await createWebhookEndpoint(id, body.data.url, body.data.eventTypes, user.id)
    // The URL is audited; the secret deliberately is not. An audit log is a read surface, and
    // writing a live signing credential into one hands it to anyone who can read the log.
    void recordAudit(
      { workspaceId: id, actorId: user.id, action: 'webhook.created', entityType: 'webhook', entityId: endpoint.id, metadata: { url: endpoint.url, eventTypes: endpoint.eventTypes } },
      request,
    )
    return endpoint
  })

  app.get('/api/v1/workspaces/:id/webhooks', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const data = await listWebhookEndpoints(id)
    return { data, total: data.length }
  })

  app.delete('/api/v1/workspaces/:id/webhooks/:webhookId', async (request) => {
    const user = await requireUser(request)
    const { id, webhookId } = request.params as { id: string; webhookId: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    await deleteWebhookEndpoint(id, webhookId)
    void recordAudit({ workspaceId: id, actorId: user.id, action: 'webhook.deleted', entityType: 'webhook', entityId: webhookId }, request)
    return { deleted: true }
  })

  // Re-enable an endpoint auto-disabled after repeated failures. Without this, a customer who fixes
  // their listener would have to recreate the endpoint — rotating the secret and forcing them to
  // redeploy their verifier for what is really just "it's working again".
  app.post('/api/v1/workspaces/:id/webhooks/:webhookId/enable', async (request) => {
    const user = await requireUser(request)
    const { id, webhookId } = request.params as { id: string; webhookId: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const endpoint = await enableWebhookEndpoint(id, webhookId)
    void recordAudit({ workspaceId: id, actorId: user.id, action: 'webhook.enabled', entityType: 'webhook', entityId: webhookId }, request)
    return endpoint
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

  /**
   * Run the planner now, instead of waiting for this workspace's next scheduled tick.
   *
   * Added because the queue had no other way to fill. The scheduler's cron fires hourly but only
   * plans a workspace whose report is older than its own `automation_config.cadenceMs`, which
   * defaults to a *week* — so switching a rule on and watching an empty queue was the expected
   * experience, with nothing on screen to say how long the wait would be. A subsystem you cannot
   * exercise is one nobody can tell is working.
   *
   * Safe to press twice: `planForWorkspace` excludes targets that already have an open action and
   * respects `maxActionsPerDay`, so a second run within the same window proposes nothing new rather
   * than duplicating the first. Admin+, and audited, because in `auto` mode this executes.
   */
  app.post('/api/v1/workspaces/:id/automation/plan', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')
    const outcome = await runAutomationForWorkspace(id)
    void recordAudit(
      {
        workspaceId: id,
        actorId: user.id,
        action: 'automation.plan_run',
        entityType: 'workspace',
        entityId: id,
        metadata: { ...outcome },
      },
      request,
    )
    return outcome
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
