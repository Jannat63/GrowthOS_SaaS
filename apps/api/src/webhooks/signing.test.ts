import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildSignedRequest, sign, verify } from './signing.js'

// Pure — no database, no network, no clock (id and timestamp are injected).
describe('Standard Webhooks signing', () => {
  const secret = 'whsec_test_secret_value'
  const id = 'msg_2xK9abcdef'
  const timestamp = 1787176628
  const payload = { type: 'recommendation:new', workspaceId: 'ws_1', data: { id: 'rec_1' } }

  it('signs exactly `{id}.{timestamp}.{body}` with HMAC-SHA256, base64', () => {
    // Recomputed independently here rather than pasted from the implementation, so this fails if
    // the signed content's SHAPE changes — a different separator, a missing field, hex instead of
    // base64. (Deliberately not labelled a "spec test vector": the Standard Webhooks published
    // vectors are not to hand offline, and inventing one and calling it official would be worse
    // than useless. This checks the construction the spec describes.)
    const body = Buffer.from(JSON.stringify(payload), 'utf8')
    const expected = createHmac('sha256', secret)
      .update(`${id}.${timestamp}.${body.toString('utf8')}`)
      .digest('base64')

    expect(sign(secret, id, timestamp, body)).toBe(expected)
  })

  it('emits the three spec headers, with the v1 scheme prefix on the signature', () => {
    const req = buildSignedRequest(secret, payload, id, timestamp)

    expect(req.headers['webhook-id']).toBe(id)
    expect(req.headers['webhook-timestamp']).toBe(String(timestamp))
    expect(req.headers['webhook-signature']).toMatch(/^v1,[A-Za-z0-9+/=]+$/)
    expect(req.headers['content-type']).toBe('application/json')
  })

  it('produces a signature that verifies against the exact bytes it sent', () => {
    const req = buildSignedRequest(secret, payload, id, timestamp)
    expect(verify(secret, req.id, req.timestamp, req.body, req.headers['webhook-signature']!)).toBe(
      true,
    )
  })

  // The trap this whole design exists to avoid: signing a re-serialized object rather than the
  // bytes on the wire. Two JSON.stringify calls can differ by key order or whitespace, and every
  // signature then fails at the customer's end while looking correct on ours.
  it('fails verification when the body is re-serialized differently', () => {
    const req = buildSignedRequest(secret, payload, id, timestamp)
    const reserialized = Buffer.from(
      JSON.stringify({ data: payload.data, workspaceId: payload.workspaceId, type: payload.type }),
      'utf8',
    )

    // Same content, different key order — and therefore different bytes.
    expect(reserialized.equals(req.body)).toBe(false)
    expect(
      verify(secret, req.id, req.timestamp, reserialized, req.headers['webhook-signature']!),
    ).toBe(false)
  })

  it('rejects a signature made with a different secret', () => {
    const req = buildSignedRequest(secret, payload, id, timestamp)
    expect(
      verify('whsec_the_wrong_secret', req.id, req.timestamp, req.body, req.headers['webhook-signature']!),
    ).toBe(false)
  })

  it('rejects a tampered id or timestamp even when the body is untouched', () => {
    const req = buildSignedRequest(secret, payload, id, timestamp)
    const header = req.headers['webhook-signature']!

    expect(verify(secret, 'msg_someone_elses_id', req.timestamp, req.body, header)).toBe(false)
    expect(verify(secret, req.id, req.timestamp + 1, req.body, header)).toBe(false)
  })

  it('accepts a matching signature among several, so a secret can be rotated without dropping events', () => {
    const req = buildSignedRequest(secret, payload, id, timestamp)
    const theirs = req.headers['webhook-signature']!
    const stale = 'v1,c3RhbGVzaWduYXR1cmV2YWx1ZXBhZGRpbmc='

    expect(verify(secret, req.id, req.timestamp, req.body, `${stale} ${theirs}`)).toBe(true)
  })

  it('ignores a signature carrying an unknown scheme version', () => {
    const req = buildSignedRequest(secret, payload, id, timestamp)
    const bumped = req.headers['webhook-signature']!.replace('v1,', 'v2,')
    expect(verify(secret, req.id, req.timestamp, req.body, bumped)).toBe(false)
  })

  it('defaults the timestamp to unix SECONDS, not milliseconds', () => {
    // Milliseconds would put every delivery ~55,000 years outside a verifier's tolerance window and
    // present as "every webhook rejected" with a signature that looks perfectly valid.
    const req = buildSignedRequest(secret, payload)
    const nowSeconds = Math.floor(Date.now() / 1000)

    expect(Math.abs(req.timestamp - nowSeconds)).toBeLessThanOrEqual(2)
    expect(String(req.timestamp)).toHaveLength(10)
  })

  it('generates a distinct id per call when one is not supplied', () => {
    const a = buildSignedRequest(secret, payload)
    const b = buildSignedRequest(secret, payload)
    expect(a.id).not.toBe(b.id)
    expect(a.id.startsWith('msg_')).toBe(true)
  })
})
