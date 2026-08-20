import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Role } from '@growthos/types'
import { AppError } from './errors.js'

// Exported (not just used by requireWorkspaceMember below) so invitations.ts / routes/v1.ts can
// stop an admin from inviting someone at a higher rank than their own — the same "fail closed on
// the unexpected" reasoning as rankOf below applies to invite creation too.
export const ROLE_RANK: Record<Role, number> = {
  client: 0,
  viewer: 1,
  manager: 2,
  admin: 3,
  owner: 4,
}

// Rank a stored role, failing CLOSED for anything unmapped. Better Auth's organization plugin defaults
// an invited member's role to the string "member" (and the column default is "member"), which is NOT one
// of our app roles — without this an unmapped role would rank `undefined`, and `undefined < n` is false,
// silently passing every threshold. Unknown roles get -1 so they clear no threshold (>= client). The
// invite flow (invitations.ts) assigns a real app role (client/viewer/manager/admin/owner), so this
// case should only ever apply to rows Better Auth's own plugin created directly.
export function rankOf(role: string): number {
  return ROLE_RANK[role as Role] ?? -1
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
  if (rankOf(member.role) < ROLE_RANK[minRole]) {
    throw new AppError('FORBIDDEN', `This action requires the ${minRole} role.`)
  }
  return member
}
