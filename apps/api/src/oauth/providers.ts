// Provider-agnostic OAuth adapter. Google (Search Console) implemented first; Meta / Google Ads /
// Shopify plug into the same interface later (M3 P3.2/P3.3). Request shapes ported from legacy
// auth-service/app/google_oauth.py.

export interface ProviderTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
}

export interface ProviderAccount {
  accountId: string
  accountName: string
  metadata: Record<string, unknown>
}

export interface OAuthProvider {
  platform: string
  authorizeUrl(state: string, redirectUri: string): string
  exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens>
  refreshAccessToken(refreshToken: string): Promise<ProviderTokens>
  listAccounts(accessToken: string): Promise<ProviderAccount[]>
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GSC_SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites'
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set')
  }
  return { clientId, clientSecret }
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

function tokensFrom(j: TokenResponse, fallbackRefresh: string | null): ProviderTokens {
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? fallbackRefresh,
    expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null,
    scopes: j.scope ? j.scope.split(' ') : [GSC_SCOPE],
  }
}

export const googleProvider: OAuthProvider = {
  platform: 'google_search_console',

  authorizeUrl(state, redirectUri) {
    const { clientId } = googleConfig()
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GSC_SCOPE,
      access_type: 'offline', // yields a refresh_token
      prompt: 'consent', // re-issue refresh_token every time
      include_granted_scopes: 'true',
      state,
    })
    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  },

  async exchangeCode(code, redirectUri) {
    const { clientId, clientSecret } = googleConfig()
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`)
    return tokensFrom((await res.json()) as TokenResponse, null)
  },

  async refreshAccessToken(refreshToken) {
    const { clientId, clientSecret } = googleConfig()
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`)
    // Google usually does not return a new refresh_token on refresh — keep the existing one.
    return tokensFrom((await res.json()) as TokenResponse, refreshToken)
  },

  async listAccounts(accessToken) {
    const res = await fetch(GSC_SITES_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Google Search Console sites.list failed: ${res.status}`)
    const j = (await res.json()) as {
      siteEntry?: { siteUrl: string; permissionLevel: string }[]
    }
    return (j.siteEntry ?? []).map((s) => ({
      accountId: s.siteUrl,
      accountName: s.siteUrl,
      metadata: { siteUrl: s.siteUrl, permissionLevel: s.permissionLevel },
    }))
  },
}

export const PROVIDERS: Record<string, OAuthProvider> = {
  google_search_console: googleProvider,
}

export function getProvider(platform: string): OAuthProvider {
  const p = PROVIDERS[platform]
  if (!p) throw new Error(`Unsupported platform: ${platform}`)
  return p
}
