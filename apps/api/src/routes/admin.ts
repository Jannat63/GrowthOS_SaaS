import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type {
  AdminAuditLogEntry,
  AdminUserDetail,
  AdminUserSummary,
  AdminWorkspaceDetail,
  AdminWorkspaceSummary,
  Plan,
  PlatformOverview,
} from '@growthos/types'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requirePlatformRole } from '../guards.js'
import { logAdminAction } from '../admin-audit.js'
import { parsePage } from '../pagination.js'
import {
  listWorkspaces,
  getWorkspaceDetail,
  overrideWorkspacePlan,
  extendTrial,
  listUsers,
  getUserDetail,
  setPlatformRole,
  revokeUserSessions,
  getPlatformOverview,
  listAuditLog,
} from '../admin.js'

const searchQuery = z.object({ search: z.string().trim().max(200).optional() })

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

  const planOverrideBody = z.object({
    plan: z.enum(['starter', 'growth', 'scale']),
    reason: z.string().trim().min(10, 'A reason (10+ characters) is required for a manual plan override.'),
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

    const before = await getWorkspaceDetail(id)
    await overrideWorkspacePlan(id, body.data.plan as Plan)
    await logAdminAction(user.id, 'workspace.plan_override', 'workspace', id, {
      reason: body.data.reason,
      before: before?.subscription.plan ?? null,
      after: body.data.plan,
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

  const platformRoleBody = z.object({
    // null removes the role entirely; the two strings grant one.
    role: z.enum(['support_agent', 'super_admin']).nullable(),
    reason: z.string().trim().min(10, 'A reason (10+ characters) is required to change platform access.'),
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

    const before = await getUserDetail(id)
    if (!before) throw new AppError('NOT_FOUND', 'No account with that ID.')

    await setPlatformRole(id, body.data.role)
    await logAdminAction(actor.id, 'user.platform_role', 'user', id, {
      reason: body.data.reason,
      before: before.platformRole,
      after: body.data.role,
      subjectEmail: before.email,
    })
    return { success: true }
  })

  const reasonBody = z.object({
    reason: z.string().trim().min(10, 'A reason (10+ characters) is required.'),
  })
  app.post('/api/v1/admin/users/:id/revoke-sessions', async (request) => {
    const actor = await requireUser(request)
    await requirePlatformRole(actor.id, 'super_admin')
    const { id } = request.params as { id: string }
    const body = reasonBody.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    const subject = await getUserDetail(id)
    if (!subject) throw new AppError('NOT_FOUND', 'No account with that ID.')

    const revoked = await revokeUserSessions(id)
    await logAdminAction(actor.id, 'user.revoke_sessions', 'user', id, {
      reason: body.data.reason,
      revoked,
      subjectEmail: subject.email,
    })
    return { success: true, revoked }
  })

  const extendTrialBody = z.object({
    // Capped at 90: past that it is not an extension, it is a comp, and a comp is a plan override.
    days: z.number().int().min(1).max(90),
    reason: z.string().trim().min(10, 'A reason (10+ characters) is required to extend a trial.'),
  })
  app.post('/api/v1/admin/workspaces/:id/extend-trial', async (request) => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'super_admin')
    const { id } = request.params as { id: string }
    const body = extendTrialBody.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    const before = await getWorkspaceDetail(id)
    if (!before) throw new AppError('WORKSPACE_NOT_FOUND', 'No workspace with that ID.')

    const trialEndsAt = await extendTrial(id, body.data.days)
    await logAdminAction(user.id, 'workspace.extend_trial', 'workspace', id, {
      reason: body.data.reason,
      days: body.data.days,
      before: before.subscription.trialEndsAt,
      after: trialEndsAt?.toISOString() ?? null,
    })
    return { success: true, trialEndsAt: trialEndsAt?.toISOString() ?? null }
  })

  app.get('/api/v1/admin/overview', async (request): Promise<PlatformOverview> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'support_agent')
    const overview = await getPlatformOverview()
    await logAdminAction(user.id, 'health.view', 'workspace', 'all')
    return overview
  })

  // The audit log itself requires super_admin — a support_agent shouldn't be able to review
  // (or, worse, notice gaps in) the record of what other admins have been doing.
  app.get('/api/v1/admin/audit-log', async (request): Promise<{ data: AdminAuditLogEntry[]; total: number }> => {
    const user = await requireUser(request)
    await requirePlatformRole(user.id, 'super_admin')
    const page = parsePage(request.query, 50)
    return listAuditLog(page)
  })
}
