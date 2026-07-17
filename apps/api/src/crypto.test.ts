import { beforeAll, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { encryptToken, decryptToken } from './crypto.js'

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('token crypto (AES-256-GCM)', () => {
  it('round-trips a token', () => {
    const s = 'ya29.a-real-looking-access-token'
    expect(decryptToken(encryptToken(s))).toBe(s)
  })

  it('uses a random IV (ciphertext differs each call)', () => {
    expect(encryptToken('x')).not.toBe(encryptToken('x'))
  })

  it('rejects a tampered ciphertext (auth tag fails)', () => {
    const enc = encryptToken('secret')
    const [iv, tag, ct] = enc.split('.')
    const buf = Buffer.from(ct!, 'base64')
    buf[0] ^= 0xff
    const tampered = [iv, tag, buf.toString('base64')].join('.')
    expect(() => decryptToken(tampered)).toThrow()
  })

  it('rejects malformed input', () => {
    expect(() => decryptToken('not-valid')).toThrow()
  })
})
