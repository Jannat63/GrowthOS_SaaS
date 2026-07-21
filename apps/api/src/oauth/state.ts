import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Signed OAuth `state` param (CSRF). Carries workspaceId + platform across the provider redirect.
// Format: base64url(payload).base64url(hmac). Secret = OAUTH_STATE_SECRET. Short TTL.
export interface OAuthState {
  workspaceId: string
  platform: string
}

const TTL_MS = 10 * 60 * 1000 // 10 minutes

function getSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET
  if (!s) throw new Error('OAUTH_STATE_SECRET is not set')
  return s
}

export function signState(data: OAuthState): string {
  const payload = { ...data, nonce: randomBytes(8).toString('hex'), exp: Date.now() + TTL_MS }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyState(state: string): OAuthState {
  const [body, sig] = state.split('.')
  if (!body || !sig) throw new Error('Malformed state')
  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid state signature')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
    workspaceId?: unknown
    platform?: unknown
    exp?: unknown
  }
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) throw new Error('Expired state')
  if (typeof payload.workspaceId !== 'string' || typeof payload.platform !== 'string') {
    throw new Error('Invalid state payload')
  }
  return { workspaceId: payload.workspaceId, platform: payload.platform }
}
