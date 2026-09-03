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
 * Super Admin panel — platform-wide roles, entirely separate from the workspace-scoped Role above.
 * A platform admin isn't a member of every workspace; this bypasses workspace membership checks
 * by design (that's the point of the panel), so it's kept as its own small rank system rather than
 * folded into ROLE_RANK. See docs/growthos-modular-packages-and-admin.md §3 for the design.
 */
export type PlatformRole = 'support_agent' | 'super_admin'

const PLATFORM_ROLE_RANK: Record<PlatformRole, number> = {
  support_agent: 1,
  super_admin: 2,
}

/**
 * Assert the user holds at least `minRole` platform-wide. Throws FORBIDDEN (403) otherwise.
 * Does NOT check workspace membership — by design, a platform admin can act on any workspace.
 * Every call site should immediately follow a successful check with `logAdminAction` (see
 * apps/api/src/admin-audit.ts) — this function only gates access, it doesn't log on its own,
 * so the caller can record the actual target/action rather than a generic "checked access" row.
 */
export async function requirePlatformRole(userId: string, minRole: PlatformRole): Promise<PlatformRole> {
  const [row] = await db
    .select({ platformRole: schema.user.platformRole })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)

  const role = row?.platformRole as PlatformRole | null | undefined
  if (!role || PLATFORM_ROLE_RANK[role] < PLATFORM_ROLE_RANK[minRole]) {
    throw new AppError('FORBIDDEN', `This requires ${minRole === 'super_admin' ? 'Super Admin' : 'admin'} access.`)
  }
  return role
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
