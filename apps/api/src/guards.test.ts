import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { requirePlatformRole } from './guards.js'
import { AppError } from './errors.js'

// Integration: requires Neon (dev stack up) — same as plan-limits.test.ts.
describe('requirePlatformRole', () => {
  const supportUserId = 'test-guard-support-agent'
  const superUserId = 'test-guard-super-admin'
  const plainUserId = 'test-guard-plain-user'

  async function seedUser(id: string, platformRole: string | null) {
    await db
      .insert(schema.user)
      .values({ id, name: id, email: `${id}@example.com`, emailVerified: true, platformRole })
      .onConflictDoUpdate({ target: schema.user.id, set: { platformRole } })
  }

  afterAll(async () => {
    for (const id of [supportUserId, superUserId, plainUserId]) {
      await db.delete(schema.user).where(eq(schema.user.id, id))
    }
  })

  it('rejects a user with no platform role at all', async () => {
    await seedUser(plainUserId, null)
    await expect(requirePlatformRole(plainUserId, 'support_agent')).rejects.toThrow(AppError)
  })

  it('rejects an unrecognized/nonexistent user id the same way as no role', async () => {
    await expect(requirePlatformRole('user-that-does-not-exist', 'support_agent')).rejects.toThrow(AppError)
  })

  it('allows a support_agent to pass a support_agent check', async () => {
    await seedUser(supportUserId, 'support_agent')
    await expect(requirePlatformRole(supportUserId, 'support_agent')).resolves.toBe('support_agent')
  })

  it('rejects a support_agent from a super_admin-only check (rank matters, not just "is an admin")', async () => {
    await seedUser(supportUserId, 'support_agent')
    await expect(requirePlatformRole(supportUserId, 'super_admin')).rejects.toThrow(AppError)
  })

  it('allows a super_admin to pass both a support_agent check and a super_admin check', async () => {
    await seedUser(superUserId, 'super_admin')
    await expect(requirePlatformRole(superUserId, 'support_agent')).resolves.toBe('super_admin')
    await expect(requirePlatformRole(superUserId, 'super_admin')).resolves.toBe('super_admin')
  })

  it('throws FORBIDDEN specifically, not some other error code', async () => {
    await seedUser(plainUserId, null)
    try {
      await requirePlatformRole(plainUserId, 'support_agent')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect((err as AppError).code).toBe('FORBIDDEN')
    }
  })
})
