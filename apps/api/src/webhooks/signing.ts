import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

/**
 * Standard Webhooks signing (M4 · P4.4a-2).
 *
 * The spec is adopted verbatim rather than inventing a signature scheme:
 * https://github.com/standard-webhooks/standard-webhooks. It is what Stripe/GitHub-style signing
 * converged on, and it means a customer verifies with an off-the-shelf library instead of against
 * documentation we would have to write and they would have to trust.
 *
 *   webhook-id:        msg_2xK9...              (also the idempotency key)
 *   webhook-timestamp: 1787176628               (unix SECONDS, not milliseconds)
 *   webhook-signature: v1,K5oZfzN95Z9UVu1Es...  (base64 HMAC-SHA256)
 *
 * The signed content is `{id}.{timestamp}.{body}` and the HMAC is keyed on the RAW SECRET BYTES.
 *
 * THE TRAP, and the reason `sign` takes a Buffer rather than an object: the signature covers the
 * exact bytes on the wire. Serializing an object to sign it and serializing again to send it is the
 * most common implementation bug in this area — two `JSON.stringify` calls can differ by key order
 * or whitespace, and every signature then fails verification at the customer's end while looking
 * correct on ours. `buildSignedRequest` serializes ONCE and hands the same buffer to both.
 */

/** `v1` is the scheme version in the header, not our API version. Bump only if the scheme changes. */
const SCHEME = 'v1'

export interface SignedWebhookRequest {
  id: string
  timestamp: number
  body: Buffer
  headers: Record<string, string>
}

/** Signs the exact bytes that will be sent. Returns the base64 HMAC WITHOUT the `v1,` prefix. */
export function sign(secret: string, id: string, timestamp: number, body: Buffer): string {
  const signedContent = Buffer.concat([
    Buffer.from(`${id}.${timestamp}.`, 'utf8'),
    body,
  ])
  return createHmac('sha256', secret).update(signedContent).digest('base64')
}

/**
 * Serializes a payload once and returns the body plus the headers that authenticate it.
 *
 * `id` and `timestamp` are injectable so tests can pin a known vector; production always takes the
 * defaults. The timestamp is in SECONDS — the spec says so, and sending milliseconds puts every
 * delivery ~55,000 years outside a verifier's tolerance window, which presents as "every webhook
 * rejected" with a valid-looking signature.
 */
export function buildSignedRequest(
  secret: string,
  payload: unknown,
  id: string = `msg_${randomUUID().replace(/-/g, '')}`,
  timestamp: number = Math.floor(Date.now() / 1000),
): SignedWebhookRequest {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  const signature = sign(secret, id, timestamp, body)
  return {
    id,
    timestamp,
    body,
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(timestamp),
      'webhook-signature': `${SCHEME},${signature}`,
    },
  }
}

/**
 * Verifies a signature header the way a well-behaved consumer would.
 *
 * Not used to send anything — it exists so the test suite proves our own output verifies, rather
 * than only proving it matches itself. Compared in constant time: a webhook signature is a MAC, and
 * a `===` on it leaks its bytes to a timing attack one character at a time.
 *
 * A header may carry several space-separated signatures during a secret rotation; any one matching
 * is a pass, which is what makes rotation possible without dropping events.
 */
export function verify(secret: string, id: string, timestamp: number, body: Buffer, header: string): boolean {
  const expected = Buffer.from(sign(secret, id, timestamp, body), 'utf8')
  return header.split(' ').some((part) => {
    const [scheme, value] = part.split(',')
    if (scheme !== SCHEME || !value) return false
    const candidate = Buffer.from(value, 'utf8')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  })
}
