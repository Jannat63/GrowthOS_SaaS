import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Role } from '@growthos/types'
import { AppError } from './errors.js'

const ROLE_RANK: Record<Role, number> = {
  client: 0,
  viewer: 1,
  manager: 2,
  admin: 3,
  owner: 4,
}

/**
 * App-layer workspace isolation (D1): assert the user is a member of the workspace, optionally with
 * at least `minRole`. Throws FORBIDDEN (403) otherwise. Returns the membership row.
 */
export async function requireWorkspaceMember(
  userId: string,
  workspaceId: string,
  minRole: Role = 'viewer',
) {
  const [member] = await db
    .select()
    .from(schema.workspace_members)
    .where(
      and(
        eq(schema.workspace_members.userId, userId),
        eq(schema.workspace_members.organizationId, workspaceId),
      ),
    )
    .limit(1)

  if (!member) {
    throw new AppError('FORBIDDEN', 'You are not a member of this workspace.')
  }
  if (ROLE_RANK[member.role as Role] < ROLE_RANK[minRole]) {
    throw new AppError('FORBIDDEN', `This action requires the ${minRole} role.`)
  }
  return member
}
