import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { startTrial } from './billing.js'
import {
  acceptInvitation,
  createInvitation,
  getInvitationPreview,
  listInvitations,
  revokeInvitation,
} from './invitations.js'

// Integration: requires Neon (dev stack up) — same as api-keys.test.ts / plan-limits.test.ts.
describe('invitations', () => {
  const starterWs = 'test-invites-starter-ws'
  const growthWs = 'test-invites-growth-ws'
  const ownerId = 'test-invites-owner'
  const inviteeId = 'test-invites-invitee'
  const outsiderId = 'test-invites-outsider'
  const inviteeEmail = 'invitee@invites-test.dev'
  const outsiderEmail = 'outsider@invites-test.dev'

  afterAll(async () => {
    // workspace_members / workspace_invitations cascade from workspaces (see auth.ts) —
    // deleting the workspace is enough for those two; subscriptions and users are app-layer
    // enforced (no FK), so those still need explicit cleanup, same as plan-limits.test.ts.
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, starterWs))
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, growthWs))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.workspaceId, growthWs))
    for (const id of [ownerId, inviteeId, outsiderId]) {
      await db.delete(schema.user).where(eq(schema.user.id, id))
    }
  })

  async function seedWorkspace(workspaceId: string, plan: 'starter' | 'growth') {
    await db
      .insert(schema.workspaces)
      .values({ id: workspaceId, name: workspaceId, slug: workspaceId, createdAt: new Date() })
      .onConflictDoNothing()
    if (plan === 'growth') await startTrial(workspaceId)
    await db
      .insert(schema.workspace_members)
      .values({ id: `${workspaceId}-owner-member`, organizationId: workspaceId, userId: ownerId, role: 'owner', createdAt: new Date() })
      .onConflictDoNothing()
  }

  it('sets up the owner and invitee users, and both workspaces', async () => {
    await db
      .insert(schema.user)
      .values([
        { id: ownerId, name: 'Owner', email: 'owner@invites-test.dev', createdAt: new Date(), updatedAt: new Date() },
        { id: inviteeId, name: 'Invitee', email: inviteeEmail, createdAt: new Date(), updatedAt: new Date() },
        { id: outsiderId, name: 'Outsider', email: outsiderEmail, createdAt: new Date(), updatedAt: new Date() },
      ])
      .onConflictDoNothing()
    await seedWorkspace(starterWs, 'starter')
    await seedWorkspace(growthWs, 'growth')
  })

  describe('createInvitation', () => {
    it('rejects on a starter-plan workspace already at its 1-seat cap (the owner fills it)', async () => {
      await expect(createInvitation(starterWs, inviteeEmail, 'viewer', ownerId, 'Owner')).rejects.toThrow(
        /starter plan includes 1 team member/,
      )
    })

    it('succeeds on a growth-plan workspace (5-seat cap, only the owner occupies one)', async () => {
      const invitation = await createInvitation(growthWs, inviteeEmail, 'viewer', ownerId, 'Owner')
      expect(invitation.email).toBe(inviteeEmail)
      expect(invitation.role).toBe('viewer')
      expect(invitation.status).toBe('pending')
      expect(invitation.inviterId).toBe(ownerId)
    })

    it('rejects a second invite to the same email while one is already pending', async () => {
      await expect(createInvitation(growthWs, inviteeEmail, 'admin', ownerId, 'Owner')).rejects.toThrow(
        /already a pending invitation/,
      )
    })

    it('rejects inviting an email that already belongs to a member', async () => {
      await expect(createInvitation(growthWs, 'owner@invites-test.dev', 'viewer', ownerId, 'Owner')).rejects.toThrow(
        /already a member/,
      )
    })

    it('lowercases the email so casing can\'t bypass the duplicate-pending-invite check', async () => {
      await expect(
        createInvitation(growthWs, inviteeEmail.toUpperCase(), 'admin', ownerId, 'Owner'),
      ).rejects.toThrow(/already a pending invitation/)
    })
  })

  describe('listInvitations', () => {
    it('lists the pending invite, most-recent-first, with the inviter name joined', async () => {
      const { data } = { data: await listInvitations(growthWs) }
      expect(data).toHaveLength(1)
      expect(data[0]!.email).toBe(inviteeEmail)
      expect(data[0]!.status).toBe('pending')
      expect(data[0]!.inviterName).toBe('Owner')
    })

    it('derives "expired" instead of the stored "pending" once expiresAt has passed', async () => {
      const [invite] = await listInvitations(growthWs)
      await db
        .update(schema.workspace_invitations)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(schema.workspace_invitations.id, invite!.id))

      const after = await listInvitations(growthWs)
      expect(after[0]!.status).toBe('expired')

      // Restore for the later accept-flow tests below.
      await db
        .update(schema.workspace_invitations)
        .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
        .where(eq(schema.workspace_invitations.id, invite!.id))
    })
  })

  describe('getInvitationPreview', () => {
    it('returns the thin preview — email, role, status, workspace name/slug, nothing else', async () => {
      const [invite] = await listInvitations(growthWs)
      const preview = await getInvitationPreview(invite!.id)
      expect(preview).toEqual({
        id: invite!.id,
        email: inviteeEmail,
        role: 'viewer',
        status: 'pending',
        workspaceName: growthWs,
        workspaceSlug: growthWs,
      })
    })

    it('throws NOT_FOUND for a bogus id', async () => {
      await expect(getInvitationPreview('does-not-exist')).rejects.toThrow(/not found/i)
    })
  })

  describe('acceptInvitation', () => {
    it("rejects when the caller's email doesn't match the invitation's", async () => {
      const [invite] = await listInvitations(growthWs)
      await expect(acceptInvitation(invite!.id, outsiderId, outsiderEmail)).rejects.toThrow(
        /different email address/,
      )
    })

    it('rejects an expired invitation', async () => {
      const [invite] = await listInvitations(growthWs)
      await db
        .update(schema.workspace_invitations)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(schema.workspace_invitations.id, invite!.id))

      await expect(acceptInvitation(invite!.id, inviteeId, inviteeEmail)).rejects.toThrow(/expired/)

      await db
        .update(schema.workspace_invitations)
        .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
        .where(eq(schema.workspace_invitations.id, invite!.id))
    })

    it('seats the invitee as the invited role, and flips the invitation to accepted', async () => {
      const [invite] = await listInvitations(growthWs)
      const result = await acceptInvitation(invite!.id, inviteeId, inviteeEmail)
      expect(result).toEqual({ workspaceId: growthWs, workspaceSlug: growthWs, role: 'viewer' })

      const [member] = await db
        .select({ role: schema.workspace_members.role })
        .from(schema.workspace_members)
        .where(eq(schema.workspace_members.userId, inviteeId))
      expect(member?.role).toBe('viewer')

      const [after] = await listInvitations(growthWs)
      expect(after!.status).toBe('accepted')
    })

    it('rejects re-accepting an already-accepted invitation', async () => {
      const [invite] = await listInvitations(growthWs)
      await expect(acceptInvitation(invite!.id, inviteeId, inviteeEmail)).rejects.toThrow(
        /already been used or revoked/,
      )
    })

    it('is idempotent about the membership row itself: accepting twice never creates a duplicate member', async () => {
      const members = await db
        .select()
        .from(schema.workspace_members)
        .where(eq(schema.workspace_members.userId, inviteeId))
      expect(members).toHaveLength(1)
    })
  })

  describe('revokeInvitation', () => {
    it('revokes a pending invitation', async () => {
      const invitation = await createInvitation(growthWs, outsiderEmail, 'client', ownerId, 'Owner')
      await revokeInvitation(growthWs, invitation.id)
      const revoked = (await listInvitations(growthWs)).find((i) => i.id === invitation.id)
      expect(revoked?.status).toBe('revoked')
    })

    it('throws NOT_FOUND revoking an already-revoked invitation', async () => {
      const invitation = await createInvitation(growthWs, 'another@invites-test.dev', 'client', ownerId, 'Owner')
      await revokeInvitation(growthWs, invitation.id)
      await expect(revokeInvitation(growthWs, invitation.id)).rejects.toThrow(/not found/i)
    })

    it('throws NOT_FOUND revoking an invitation that belongs to a different workspace', async () => {
      const invitation = await createInvitation(growthWs, 'yet-another@invites-test.dev', 'client', ownerId, 'Owner')
      await expect(revokeInvitation(starterWs, invitation.id)).rejects.toThrow(/not found/i)
    })
  })
})
