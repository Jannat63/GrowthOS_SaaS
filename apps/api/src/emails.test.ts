import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { getWorkspaceOwnerEmail } from './emails.js'

// Integration: requires Neon (dev stack up) — same as billing.test.ts. No RESEND_API_KEY needed:
// getWorkspaceOwnerEmail is pure DB logic, and send() no-ops safely without a key (see emails.ts).
describe('emails', () => {
  const ws = 'test-emails-ws'
  const userId = 'test-emails-user'

  afterAll(async () => {
    await db.delete(schema.workspace_members).where(eq(schema.workspace_members.organizationId, ws))
    await db.delete(schema.user).where(eq(schema.user.id, userId))
  })

  describe('getWorkspaceOwnerEmail', () => {
    it('returns null when the workspace has no owner row', async () => {
      expect(await getWorkspaceOwnerEmail('no-such-workspace')).toBeNull()
    })

    it("returns the org owner's email, not just any member", async () => {
      await db
        .insert(schema.workspaces)
        .values({ id: ws, name: 'Emails Test', slug: ws, createdAt: new Date() })
        .onConflictDoNothing()
      await db
        .insert(schema.user)
        .values({ id: userId, name: 'Owner Test', email: 'owner-test@example.com' })
        .onConflictDoNothing()
      await db
        .insert(schema.workspace_members)
        .values({ id: `${ws}-member`, organizationId: ws, userId, role: 'owner', createdAt: new Date() })
        .onConflictDoNothing()

      expect(await getWorkspaceOwnerEmail(ws)).toBe('owner-test@example.com')
    })
  })
})
