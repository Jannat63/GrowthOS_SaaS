import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { fromNodeHeaders } from 'better-auth/node'
import { db, schema } from '@growthos/db'
import type { MeResponse, Membership, Role } from '@growthos/types'
import { auth } from '../auth.js'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requireWorkspaceMember } from '../guards.js'

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
}
