import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getProvider } from './providers.js'

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'cid'
  process.env.GOOGLE_CLIENT_SECRET = 'sec'
})
afterEach(() => vi.restoreAllMocks())

const g = () => getProvider('google_search_console')

describe('googleProvider', () => {
  it('builds an authorize URL with the right params', () => {
    const url = new URL(g().authorizeUrl('STATE', 'http://localhost:3001/cb'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('state')).toBe('STATE')
    expect(url.searchParams.get('scope')).toContain('webmasters.readonly')
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3001/cb')
  })

  it('exchanges a code for tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            access_token: 'AT',
            refresh_token: 'RT',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/webmasters.readonly',
          }),
          { status: 200 },
        ),
      ),
    )
    const t = await g().exchangeCode('code', 'http://cb')
    expect(t.accessToken).toBe('AT')
    expect(t.refreshToken).toBe('RT')
    expect(t.expiresAt).toBeInstanceOf(Date)
    expect(t.scopes).toContain('https://www.googleapis.com/auth/webmasters.readonly')
  })

  it('keeps the existing refresh token when refreshing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ access_token: 'AT2', expires_in: 3600 }), { status: 200 })),
    )
    const t = await g().refreshAccessToken('RT')
    expect(t.accessToken).toBe('AT2')
    expect(t.refreshToken).toBe('RT')
  })

  it('lists GSC sites as accounts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ siteEntry: [{ siteUrl: 'https://x.com/', permissionLevel: 'siteOwner' }] }),
          { status: 200 },
        ),
      ),
    )
    const a = await g().listAccounts('AT')
    expect(a[0]!.accountId).toBe('https://x.com/')
    expect(a[0]!.metadata).toMatchObject({ siteUrl: 'https://x.com/' })
  })

  it('throws for an unsupported platform', () => {
    expect(() => getProvider('nope')).toThrow()
  })
})
