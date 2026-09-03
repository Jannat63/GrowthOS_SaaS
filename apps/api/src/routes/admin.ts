import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type {
  AdminActivityItem,
  AdminAuditLogEntry,
  AdminUserDetail,
  AdminUserSpend,
  AdminUserSummary,
  AdminWorkspaceDetail,
  AdminWorkspaceSummary,
  Plan,
  PlatformOverview,
  UsageSummary,
} from '@growthos/types'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requirePlatformRole } from '../guards.js'
import { logAdminAction } from '../admin-audit.js'
import { alertSuperAdmins } from '../admin-alerts.js'
import { requireStepUp } from '../admin-stepup.js'
import { parsePage } from '../pagination.js'
import { getUsageSummary } from '../plan-limits.js'
import {
  listWorkspaces,
  getWorkspaceDetail,
  getWorkspaceActivity,
  getWorkspaceAdminHistory,
  overrideWorkspacePlan,
  extendTrial,
  listUsers,
  getUserDetail,
  getUserSpend,
  setPlatformRole,
  revokeUserSessions,
  getPlatformOverview,
  listAuditLog,
} from '../admin.js'

const searchQuery = z.object({ search: z.string().trim().max(200).optional() })

/**
 * The two things every write in this console carries: why, and proof it is still you.
 *
 * The reason goes in the audit log and in the alert email. The password is re-checked at the moment
 * of the write (see admin-stepup.ts) because a live session says who opened the browser, not who is
 * sitting at it now.
 */
const stepUp = {
  reason: z.string().trim().min(10, 'A reason (10+ characters) is required.'),
  password: z.string().min(1, 'Confirm your password to make this change.'),
}

/**
 * Filter and sort are parsed leniently: an unrecognised value falls back to the default rather
 * than 400-ing. A directory is a place someone lands from a bookmark or a hand-edited URL, and
 * refusing to render the list because one query parameter is stale helps nobody.
 */
const workspaceListQuery = z.object({
  filter: z.enum(['past_due', 'trial_ending', 'no_connections', 'cancelling']).optional().catch(undefined),
  sort: z.enum(['created', 'name', 'members', 'activity']).optional().catch(undefined),
})

const userListQuery = z.object({
  filter: z.enum(['staff', 'no_workspace']).optional().catch(undefined),
  sort: z.enum(['created', 'name', 'last_seen']).optional().catch(undefined),
})

/**
 * Super Admin panel routes — everything under /api/v1/admin/*. Every route requires a platform
 * role (requirePlatformRole), NOT workspace membership — that's the entire point of this surface,
 * so there's deliberately no requireWorkspaceMember call anywhere in this file. Every route also
 * writes an audit-log entry, including plain reads: given the level of access this grants, "who
 * looked at this and why" needs to be answerable — see docs/growthos-modular-packages-and-admin.md
 * §3.3 for why that's treated as non-negotiable rather than a nice-to-have.
 */
export async function registerAdminRoutes(app: FastifyInstance) {
  // Am I an admin, and which role? The frontend's (admin) route group calls this once to decide
  // whether to render at all — real enforcement is still every route below checking for itself.
  app.get('/api/v1/admin/me', async (request) => {
    const user = await requireUser(request)
    const role = await requirePlatformRole(user.id, 'support_agent')
    return { platformRole: role }
  })

  app.get('/api/v1/admin/workspaces', async (request): Promise<{ data: AdminWorkspaceSummary[]; total: number }> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const query = searchQuery.safeParse(request.query)
    const list = workspaceListQuery.safeParse(request.query)
    const page = parsePage(request.query, 50)
    const search = query.success ? query.data.search : undefined
    const options = list.success ? list.data : {}
    const result = await listWorkspaces(search, page, options)
    await logAdminAction(user.id, 'workspace.list', 'workspace', 'all', {
      search,
      filter: options.filter,
      sort: options.sort,
    })
    return result
  })

  app.get('/api/v1/admin/workspaces/:id', async (request, reply): Promise<AdminWorkspaceDetail | { error: unknown }> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const { id } = request.params as { id: string }
    const detail = await getWorkspaceDetail(id)
    if (!detail) {
      reply.status(404)
      return { error: { code: 'NOT_FOUND', message: 'No workspace with that ID.', statusCode: 404 } }
    }
    await logAdminAction(user.id, 'workspace.view', 'workspace', id)
    return detail
  })

  app.get('/api/v1/admin/workspaces/:id/usage', async (request): Promise<UsageSummary> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const { id } = request.params as { id: string }
    const summary = await getUsageSummary(id)
    await logAdminAction(user.id, 'workspace.usage.view', 'workspace', id)
    return summary
  })

  app.get('/api/v1/admin/workspaces/:id/activity', async (request): Promise<AdminActivityItem[]> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const { id } = request.params as { id: string }
    const activity = await getWorkspaceActivity(id)
    await logAdminAction(user.id, 'workspace.activity.view', 'workspace', id)
    return activity
  })

  /**
   * Who from our side has touched this account. Super admin only, for the same reason the full
   * audit log is: a support agent should not be able to review — or notice gaps in — the record of
   * what other admins have been doing.
   */
  app.get('/api/v1/admin/workspaces/:id/admin-history', async (request): Promise<AdminAuditLogEntry[]> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'super_admin')
    const { id } = request.params as { id: string }
    const history = await getWorkspaceAdminHistory(id)
    await logAdminAction(user.id, 'workspace.admin_history.view', 'workspace', id)
    return history
  })

  const planOverrideBody = z.object({
    plan: z.enum(['starter', 'growth', 'scale']),
    ...stepUp,
  })
  app.post('/api/v1/admin/workspaces/:id/plan-override', async (request) => {
    const user = await requireUser(request)
    // Deliberately super_admin only — support_agent can view everything but not change billing state.
    await requirePlatformRole(user.id, 'super_admin')
    const { id } = request.params as { id: string }
    const body = planOverrideBody.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    await requireStepUp(request, body.data.password)

    const before = await getWorkspaceDetail(id)
    await overrideWorkspacePlan(id, body.data.plan as Plan)
    await logAdminAction(user.id, 'workspace.plan_override', 'workspace', id, {
      reason: body.data.reason,
      before: before?.subscription.plan ?? null,
      after: body.data.plan,
    })
    alertSuperAdmins({
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'Changed a plan',
      target: before?.name ?? id,
      reason: body.data.reason,
      change: `${before?.subscription.plan ?? 'unknown'} to ${body.data.plan}`,
    })
    return { success: true }
  })

  app.get('/api/v1/admin/users', async (request): Promise<{ data: AdminUserSummary[]; total: number }> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const query = searchQuery.safeParse(request.query)
    const list = userListQuery.safeParse(request.query)
    const page = parsePage(request.query, 50)
    const search = query.success ? query.data.search : undefined
    const options = list.success ? list.data : {}
    const result = await listUsers(search, page, options)
    await logAdminAction(user.id, 'user.list', 'user', 'all', {
      search,
      filter: options.filter,
      sort: options.sort,
    })
    return result
  })

  app.get('/api/v1/admin/users/:id', async (request, reply): Promise<AdminUserDetail | { error: unknown }> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const { id } = request.params as { id: string }
    const detail = await getUserDetail(id)
    if (!detail) {
      reply.status(404)
      return { error: { code: 'NOT_FOUND', message: 'No account with that ID.', statusCode: 404 } }
    }
    await logAdminAction(user.id, 'user.view', 'user', id)
    return detail
  })

  app.get('/api/v1/admin/users/:id/spend', async (request): Promise<AdminUserSpend> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const { id } = request.params as { id: string }
    const spend = await getUserSpend(id)
    await logAdminAction(user.id, 'user.spend.view', 'user', id)
    return spend
  })

  const platformRoleBody = z.object({
    // null removes the role entirely; the two strings grant one.
    role: z.enum(['support_agent', 'super_admin']).nullable(),
    ...stepUp,
  })
  app.post('/api/v1/admin/users/:id/platform-role', async (request) => {
    const actor = await requireUser(request)
    await requirePlatformRole(actor.id, 'super_admin')
    const { id } = request.params as { id: string }
    const body = platformRoleBody.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    /**
     * Nobody edits their own platform access here.
     *
     * The console is the only interface to this field, so a super admin who removed their own role
     * would be locked out of the surface that could restore it — recoverable only by running
     * grant-admin against the database. Making it someone else's action to take also means the
     * audit log always names two different people, which is the property that makes the record
     * worth having.
     */
    if (id === actor.id) {
      throw new AppError(
        'FORBIDDEN',
        'You cannot change your own platform access. Ask another super admin to do it.',
      )
    }

    await requireStepUp(request, body.data.password)

    const before = await getUserDetail(id)
    if (!before) throw new AppError('NOT_FOUND', 'No account with that ID.')

    await setPlatformRole(id, body.data.role)
    await logAdminAction(actor.id, 'user.platform_role', 'user', id, {
      reason: body.data.reason,
      before: before.platformRole,
      after: body.data.role,
      subjectEmail: before.email,
    })
    alertSuperAdmins({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'Changed platform access',
      target: before.email,
      reason: body.data.reason,
      change: `${before.platformRole ?? 'customer'} to ${body.data.role ?? 'customer'}`,
    })
    return { success: true }
  })

  const reasonBody = z.object(stepUp)
  app.post('/api/v1/admin/users/:id/revoke-sessions', async (request) => {
    const actor = await requireUser(request)
    await requirePlatformRole(actor.id, 'super_admin')
    const { id } = request.params as { id: string }
    const body = reasonBody.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    await requireStepUp(request, body.data.password)

    const subject = await getUserDetail(id)
    if (!subject) throw new AppError('NOT_FOUND', 'No account with that ID.')

    const revoked = await revokeUserSessions(id)
    await logAdminAction(actor.id, 'user.revoke_sessions', 'user', id, {
      reason: body.data.reason,
      revoked,
      subjectEmail: subject.email,
    })
    alertSuperAdmins({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'Signed someone out everywhere',
      target: subject.email,
      reason: body.data.reason,
      change: `${revoked} session${revoked === 1 ? '' : 's'} ended`,
    })
    return { success: true, revoked }
  })

  const extendTrialBody = z.object({
    // Capped at 90: past that it is not an extension, it is a comp, and a comp is a plan override.
    days: z.number().int().min(1).max(90),
    ...stepUp,
  })
  app.post('/api/v1/admin/workspaces/:id/extend-trial', async (request) => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'super_admin')
    const { id } = request.params as { id: string }
    const body = extendTrialBody.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    await requireStepUp(request, body.data.password)

    const before = await getWorkspaceDetail(id)
    if (!before) throw new AppError('WORKSPACE_NOT_FOUND', 'No workspace with that ID.')

    const trialEndsAt = await extendTrial(id, body.data.days)
    await logAdminAction(user.id, 'workspace.extend_trial', 'workspace', id, {
      reason: body.data.reason,
      days: body.data.days,
      before: before.subscription.trialEndsAt,
      after: trialEndsAt?.toISOString() ?? null,
    })
    alertSuperAdmins({
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'Extended a trial',
      target: before.name,
      reason: body.data.reason,
      change: `+${body.data.days} day${body.data.days === 1 ? '' : 's'}`,
    })
    return { success: true, trialEndsAt: trialEndsAt?.toISOString() ?? null }
  })

  /**
   * `from`/`to` are parsed leniently and only honoured as a pair — half a range is no range, and
   * falling back to the default window is friendlier than refusing to render the page because a
   * bookmark carried one stale parameter.
   */
  const overviewQuery = z.object({
    from: z.coerce.date().optional().catch(undefined),
    to: z.coerce.date().optional().catch(undefined),
  })

  app.get('/api/v1/admin/overview', async (request): Promise<PlatformOverview> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const parsed = overviewQuery.safeParse(request.query)
    const q = parsed.success ? parsed.data : {}
    const range = q.from && q.to && q.from <= q.to ? { from: q.from, to: q.to } : {}
    const overview = await getPlatformOverview(range)
    await logAdminAction(user.id, 'health.view', 'workspace', 'all', {
      from: range.from?.toISOString().slice(0, 10),
      to: range.to?.toISOString().slice(0, 10),
    })
    return overview
  })

  // The audit log itself requires super_admin — a support_agent shouldn't be able to review
  // (or, worse, notice gaps in) the record of what other admins have been doing.
  const auditQuery = z.object({
    // Defaults to changes only. The reads are still recorded and still reachable; they are just not
    // what someone opening this page is looking for.
    mutatingOnly: z
      .enum(['true', 'false'])
      .optional()
      .catch(undefined)
      .transform((v) => v !== 'false'),
    actorUserId: z.string().trim().max(200).optional().catch(undefined),
    action: z.string().trim().max(100).optional().catch(undefined),
    targetType: z.enum(['workspace', 'user', 'subscription', 'audit_log']).optional().catch(undefined),
    from: z.coerce.date().optional().catch(undefined),
    to: z.coerce.date().optional().catch(undefined),
  })

  app.get('/api/v1/admin/audit-log', async (request): Promise<{ data: AdminAuditLogEntry[]; total: number }> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'super_admin')
    const page = parsePage(request.query, 50)
    const parsed = auditQuery.safeParse(request.query)
    const filters = parsed.success ? parsed.data : { mutatingOnly: true }
    const result = await listAuditLog(page, filters)
    // Reading the log is itself an admin action, and one worth recording — the point of the record
    // is that nothing about this console is unobserved, including the observing.
    await logAdminAction(user.id, 'audit_log.view', 'audit_log', 'all', {
      mutatingOnly: filters.mutatingOnly,
    })
    return result
  })
}
