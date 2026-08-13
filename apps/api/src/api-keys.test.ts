import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { startTrial } from './billing.js'
import { createApiKey, listApiKeys, resolveApiKey, revokeApiKey } from './api-keys.js'

// Integration: requires Neon (dev stack up) — same as billing.test.ts.
describe('api-keys', () => {
  const starterWs = 'test-apikeys-starter-ws'
  const scaleWs = 'test-apikeys-scale-ws'

  afterAll(async () => {
    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.workspaceId, starterWs))
    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.workspaceId, scaleWs))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.workspaceId, scaleWs))
  })

  it('rejects creating a key on a plan without apiAccess (starter)', async () => {
    await expect(createApiKey(starterWs, 'My integration', 'user-1')).rejects.toThrow(
      /included in the starter plan/,
    )
  })

  it('creates a key on a Scale-plan workspace, returning the plaintext exactly once', async () => {
    await db
      .insert(schema.workspaces)
      .values({ id: scaleWs, name: 'Scale Test', slug: scaleWs, createdAt: new Date() })
      .onConflictDoNothing()
    await startTrial(scaleWs) // Growth trial — bump to scale directly for the apiAccess feature.
    await db.update(schema.subscriptions).set({ plan: 'scale' }).where(eq(schema.subscriptions.workspaceId, scaleWs))
    await db.update(schema.workspaces).set({ plan: 'scale' }).where(eq(schema.workspaces.id, scaleWs))

    const key = await createApiKey(scaleWs, 'My integration', 'user-1')
    expect(key.plaintext).toMatch(/^gos_live_[0-9a-f]{48}$/)
    expect(key.keyPrefix).toBe(key.plaintext.slice(0, 16))
    expect(key.name).toBe('My integration')
  })

  it('lists keys with metadata only — never the plaintext or hash', async () => {
    const keys = await listApiKeys(scaleWs)
    expect(keys).toHaveLength(1)
    expect(keys[0]!.name).toBe('My integration')
    expect(keys[0] as unknown as Record<string, unknown>).not.toHaveProperty('keyHash')
    expect(keys[0] as unknown as Record<string, unknown>).not.toHaveProperty('plaintext')
  })

  it('resolves a valid, active key back to its workspace', async () => {
    const key = await createApiKey(scaleWs, 'Second key', 'user-1')
    const resolved = await resolveApiKey(key.plaintext)
    expect(resolved).toEqual({ workspaceId: scaleWs, keyId: key.id })
  })

  it('rejects a well-formed but unrecognized key', async () => {
    const resolved = await resolveApiKey('gos_live_' + '0'.repeat(48))
    expect(resolved).toBeNull()
  })

  it('rejects a key missing the expected prefix entirely (no DB round-trip needed)', async () => {
    const resolved = await resolveApiKey('not-a-real-key-format')
    expect(resolved).toBeNull()
  })

  it('stops resolving a key once revoked', async () => {
    const key = await createApiKey(scaleWs, 'To be revoked', 'user-1')
    expect(await resolveApiKey(key.plaintext)).not.toBeNull()

    await revokeApiKey(scaleWs, key.id)
    expect(await resolveApiKey(key.plaintext)).toBeNull()
  })

  it('throws revoking a key that does not belong to the workspace', async () => {
    const key = await createApiKey(scaleWs, 'Belongs to scaleWs', 'user-1')
    await expect(revokeApiKey('some-other-workspace', key.id)).rejects.toThrow(/not found/i)
  })

  it('throws revoking an already-revoked key (no double revoke)', async () => {
    const key = await createApiKey(scaleWs, 'Revoke twice', 'user-1')
    await revokeApiKey(scaleWs, key.id)
    await expect(revokeApiKey(scaleWs, key.id)).rejects.toThrow(/not found/i)
  })
})
