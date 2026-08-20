import { randomUUID } from 'node:crypto'
import { and, desc, eq, gt } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { InvitationPreview, InvitationStatus, Role, WorkspaceInvitation } from '@growthos/types'
import { AppError } from './errors.js'
import { assertCanInviteMember } from './plan-limits.js'
import { sendTeamInviteEmail } from './emails.js'

/**
 * Team member invitations — deferred at M2 P2.8 ("Invites (Resend email) → M5"), never delivered
 * in M5 either. Built directly against `workspace_invitations` / `workspace_members` (Better
 * Auth's organization-plugin tables, see auth.ts's `modelName` mapping) rather than through the
 * plugin's own `createInvitation`/`acceptInvitation` API — same precedent as guards.ts's
 * `requireWorkspaceMember`, which already reads `workspace_members` directly.
 *
 * Using our own path (not Better Auth's) matters here specifically because of what guards.ts
 * documents: an invite must carry a real app `Role` (client/viewer/manager/admin/owner), never the
 * plugin's own "member" default, or every threshold check silently ranks the invitee at -1.
 *
 * Invitations don't get their own driver-generated id: `workspace_invitations.id` is `text`
 * with no default (it's a Better-Auth-generated table, normally populated by the plugin's own id
 * generator) — so a direct insert here must supply one. `randomUUID()` matches how every
 * non-Better-Auth table in this schema generates ids (`uuid().defaultRandom()`), and the column
 * has no format constraint.
 *
 * The Neon HTTP driver used in packages/db/src/client.ts has no multi-statement transaction
 * support (nothing in this codebase uses `db.transaction`), so multi-step flows here — accept, in
 * particular — are sequenced with explicit existence checks rather than wrapped in a transaction,
 * the same non-transactional style already used for the assignee-membership check in
 * routes/v1.ts's recommendation-assignment endpoint.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now()
}

/** Reports "expired" instead of the stored "pending" once `expiresAt` has passed — never stored as its own value. */
function deriveStatus(status: string, expiresAt: Date): InvitationStatus {
  if (status === 'pending' && isExpired(expiresAt)) return 'expired'
  return status as InvitationStatus
}

async function getWorkspaceNameAndSlug(workspaceId: string): Promise<{ name: string; slug: string } | null> {
  const [ws] = await db
    .select({ name: schema.workspaces.name, slug: schema.workspaces.slug })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1)
  return ws ?? null
}

/**
 * Creates a pending invitation, gated behind the `teamMembers` plan limit (counts current members
 * + unexpired pending invites — see plan-limits.ts). Throws VALIDATION_ERROR if the email already
 * belongs to a member or already has a live pending invite, so an admin's list of outstanding
 * invites never grows silent duplicates.
 */
export async function createInvitation(
  workspaceId: string,
  email: string,
  role: Role,
  inviterId: string,
  inviterName: string,
): Promise<WorkspaceInvitation> {
  const normalizedEmail = email.trim().toLowerCase()

  await assertCanInviteMember(workspaceId)

  const [existingMember] = await db
    .select({ userId: schema.workspace_members.userId })
    .from(schema.workspace_members)
    .innerJoin(schema.user, eq(schema.workspace_members.userId, schema.user.id))
    .where(and(eq(schema.workspace_members.organizationId, workspaceId), eq(schema.user.email, normalizedEmail)))
    .limit(1)
  if (existingMember) {
    throw new AppError('VALIDATION_ERROR', 'This person is already a member of the workspace.')
  }

  const [existingInvite] = await db
    .select({ id: schema.workspace_invitations.id })
    .from(schema.workspace_invitations)
    .where(
      and(
        eq(schema.workspace_invitations.organizationId, workspaceId),
        eq(schema.workspace_invitations.email, normalizedEmail),
        eq(schema.workspace_invitations.status, 'pending'),
        gt(schema.workspace_invitations.expiresAt, new Date()),
      ),
    )
    .limit(1)
  if (existingInvite) {
    throw new AppError('VALIDATION_ERROR', 'There is already a pending invitation for this email.')
  }

  const workspace = await getWorkspaceNameAndSlug(workspaceId)
  if (!workspace) throw new AppError('WORKSPACE_NOT_FOUND', 'Workspace not found.')

  const id = randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const [row] = await db
    .insert(schema.workspace_invitations)
    .values({
      id,
      organizationId: workspaceId,
      email: normalizedEmail,
      role,
      status: 'pending',
      expiresAt,
      inviterId,
    })
    .returning({ createdAt: schema.workspace_invitations.createdAt })

  // Best-effort: send() inside emails.ts already catches and logs, so a Resend outage never fails
  // invite creation — the invite still exists and is listable/re-sendable-by-recreating either way.
  await sendTeamInviteEmail(normalizedEmail, workspace.name, inviterName, id)

  return {
    id,
    email: normalizedEmail,
    role,
    status: 'pending',
    inviterId,
    inviterName,
    createdAt: (row?.createdAt ?? new Date()).toISOString(),
    expiresAt: expiresAt.toISOString(),
  }
}

/** All invitations ever sent for a workspace, most-recent-first — callers filter by status client-side (same pattern as ApiKeysSection filtering out revoked keys). */
export async function listInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  const rows = await db
    .select({
      id: schema.workspace_invitations.id,
      email: schema.workspace_invitations.email,
      role: schema.workspace_invitations.role,
      status: schema.workspace_invitations.status,
      inviterId: schema.workspace_invitations.inviterId,
      inviterName: schema.user.name,
      createdAt: schema.workspace_invitations.createdAt,
      expiresAt: schema.workspace_invitations.expiresAt,
    })
    .from(schema.workspace_invitations)
    .leftJoin(schema.user, eq(schema.workspace_invitations.inviterId, schema.user.id))
    .where(eq(schema.workspace_invitations.organizationId, workspaceId))
    .orderBy(desc(schema.workspace_invitations.createdAt))

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    // Role is nullable on the column only because Better Auth's generic schema allows it; every
    // invite created through createInvitation always sets one. "viewer" is a safe, low-privilege
    // fallback for the (should-be-impossible) case of a row that predates or bypassed that.
    role: (r.role as Role | null) ?? 'viewer',
    status: deriveStatus(r.status, r.expiresAt),
    inviterId: r.inviterId,
    inviterName: r.inviterName ?? null,
    createdAt: (r.createdAt ?? new Date()).toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }))
}

/** Revokes a pending invitation (soft: sets status, doesn't delete the row — same shape as api-keys.ts's revoke). Throws NOT_FOUND if it's missing, already resolved, or belongs to a different workspace. */
export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  const result = await db
    .update(schema.workspace_invitations)
    .set({ status: 'revoked' })
    .where(
      and(
        eq(schema.workspace_invitations.id, invitationId),
        eq(schema.workspace_invitations.organizationId, workspaceId),
        eq(schema.workspace_invitations.status, 'pending'),
      ),
    )
    .returning({ id: schema.workspace_invitations.id })

  if (result.length === 0) {
    throw new AppError('NOT_FOUND', 'Invitation not found, already resolved, or belongs to a different workspace.')
  }
}

/**
 * Unauthenticated preview for the accept-invite page — deliberately thin. Anyone with the link
 * (typically the invitee, before they've signed in) can read this, so it carries only what's
 * needed to render "You've been invited to <workspace> as <role>", not the workspace id, the
 * inviter's identity, or anything else Better Auth's session would otherwise gate.
 */
export async function getInvitationPreview(invitationId: string): Promise<InvitationPreview> {
  const [row] = await db
    .select({
      id: schema.workspace_invitations.id,
      email: schema.workspace_invitations.email,
      role: schema.workspace_invitations.role,
      status: schema.workspace_invitations.status,
      expiresAt: schema.workspace_invitations.expiresAt,
      workspaceName: schema.workspaces.name,
      workspaceSlug: schema.workspaces.slug,
    })
    .from(schema.workspace_invitations)
    .innerJoin(schema.workspaces, eq(schema.workspace_invitations.organizationId, schema.workspaces.id))
    .where(eq(schema.workspace_invitations.id, invitationId))
    .limit(1)

  if (!row) throw new AppError('NOT_FOUND', 'Invitation not found.')

  return {
    id: row.id,
    email: row.email,
    role: (row.role as Role | null) ?? 'viewer',
    status: deriveStatus(row.status, row.expiresAt),
    workspaceName: row.workspaceName,
    workspaceSlug: row.workspaceSlug,
  }
}

export interface AcceptedInvitation {
  workspaceId: string
  workspaceSlug: string
  role: Role
}

/**
 * Accepts a pending, unexpired invitation for the signed-in user, seating them into the
 * workspace. Requires the invitation's email to match the caller's own (case-insensitively) —
 * without that check, anyone who discovers an invitation id could seat *themselves* into someone
 * else's workspace using an invite meant for a different person.
 *
 * Idempotent against a second submission only in the narrow sense that matters: if the user is
 * already a member (e.g. a double-click that raced), the membership insert is skipped rather than
 * erroring, but the invitation itself is only ever marked "accepted" once — a genuine second
 * request afterward hits the `status !== 'pending'` check and fails outright instead of silently
 * no-op'ing, since there's no transaction here to make a race between those two steps airtight
 * (see the module doc comment on the Neon HTTP driver).
 */
export async function acceptInvitation(
  invitationId: string,
  userId: string,
  userEmail: string,
): Promise<AcceptedInvitation> {
  const [invitation] = await db
    .select({
      id: schema.workspace_invitations.id,
      organizationId: schema.workspace_invitations.organizationId,
      email: schema.workspace_invitations.email,
      role: schema.workspace_invitations.role,
      status: schema.workspace_invitations.status,
      expiresAt: schema.workspace_invitations.expiresAt,
      workspaceSlug: schema.workspaces.slug,
    })
    .from(schema.workspace_invitations)
    .innerJoin(schema.workspaces, eq(schema.workspace_invitations.organizationId, schema.workspaces.id))
    .where(eq(schema.workspace_invitations.id, invitationId))
    .limit(1)

  if (!invitation) throw new AppError('NOT_FOUND', 'Invitation not found.')
  if (invitation.status !== 'pending') {
    throw new AppError('VALIDATION_ERROR', 'This invitation has already been used or revoked.')
  }
  if (isExpired(invitation.expiresAt)) {
    throw new AppError('VALIDATION_ERROR', 'This invitation has expired.')
  }
  if (invitation.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    throw new AppError('FORBIDDEN', 'This invitation was sent to a different email address.')
  }

  const role = (invitation.role as Role | null) ?? 'viewer'

  const [existingMember] = await db
    .select({ userId: schema.workspace_members.userId })
    .from(schema.workspace_members)
    .where(
      and(
        eq(schema.workspace_members.organizationId, invitation.organizationId),
        eq(schema.workspace_members.userId, userId),
      ),
    )
    .limit(1)

  if (!existingMember) {
    await db.insert(schema.workspace_members).values({
      id: randomUUID(),
      organizationId: invitation.organizationId,
      userId,
      role,
      createdAt: new Date(),
    })
  }

  await db
    .update(schema.workspace_invitations)
    .set({ status: 'accepted' })
    .where(eq(schema.workspace_invitations.id, invitationId))

  return { workspaceId: invitation.organizationId, workspaceSlug: invitation.workspaceSlug, role }
}
