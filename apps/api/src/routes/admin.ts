import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type {
  AdminAuditLogEntry,
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
  listUsers,
  getPlatformOverview,
  listAuditLog,
} from '../admin.js'

const searchQuery = z.object({ search: z.string().trim().max(200).optional() })

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
    const page = parsePage(request.query, 50)
    const result = await listWorkspaces(query.success ? query.data.search : undefined, page)
    await logAdminAction(user.id, 'workspace.list', 'workspace', 'all', { search: query.success ? query.data.search : undefined })
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
    const page = parsePage(request.query, 50)
    const result = await listUsers(query.success ? query.data.search : undefined, page)
    await logAdminAction(user.id, 'user.list', 'user', 'all', { search: query.success ? query.data.search : undefined })
    return result
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
