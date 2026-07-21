import { afterAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'

// Mock the Google provider (no real OAuth round-trip) and the ClickHouse sync (fire-and-forget).
vi.mock('../oauth/providers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../oauth/providers.js')>()
  return {
    ...actual,
    getProvider: () => ({
      platform: 'google_search_console',
      authorizeUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth?x=1',
      exchangeCode: async () => ({
        accessToken: 'AT',
        refreshToken: 'RT',
        expiresAt: new Date(Date.now() + 3600_000),
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      }),
      refreshAccessToken: async () => ({ accessToken: 'AT2', refreshToken: 'RT', expiresAt: null, scopes: [] }),
      listAccounts: async () => [
        { accountId: 'https://test-site.example/', accountName: 'https://test-site.example/', metadata: { siteUrl: 'https://test-site.example/' } },
      ],
    }),
  }
})
vi.mock('../gsc-sync.js', () => ({ syncGscConnection: async () => ({ keywords: 0, pages: 0 }) }))

const { buildApp } = await import('../app.js')
const { signState } = await import('../oauth/state.js')

const ws = 'test-oauth-ws'

describe('OAuth callback (mocked provider)', () => {
  afterAll(async () => {
    await db.delete(schema.platformConnections).where(eq(schema.platformConnections.workspaceId, ws))
  })

  it('exchanges the code, stores an encrypted connection, and redirects to connected', async () => {
    await db.delete(schema.platformConnections).where(eq(schema.platformConnections.workspaceId, ws))
    const app = buildApp()
    const state = signState({ workspaceId: ws, platform: 'google_search_console' })
    const res = await app.inject({ method: 'GET', url: `/api/v1/oauth/callback?code=abc&state=${encodeURIComponent(state)}` })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toContain('/settings?connected=google_search_console')

    const rows = await db.select().from(schema.platformConnections).where(eq(schema.platformConnections.workspaceId, ws))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.accountId).toBe('https://test-site.example/')
    expect(rows[0]!.accessToken).not.toBe('AT') // encrypted at rest, not plaintext
    await app.close()
  })

  it('rejects a tampered state', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/oauth/callback?code=abc&state=bad.sig' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toContain('connect_error')
    await app.close()
  })
})
