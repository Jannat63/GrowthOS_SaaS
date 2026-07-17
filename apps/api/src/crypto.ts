import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM at-rest encryption for OAuth tokens stored in platform_connections (M3 P3.0).
// Format: base64(iv).base64(authTag).base64(ciphertext). Key = TOKEN_ENCRYPTION_KEY (32-byte base64).
const ALGO = 'aes-256-gcm'
const IV_BYTES = 12

function getKey(): Buffer {
  const b64 = process.env.TOKEN_ENCRYPTION_KEY
  if (!b64) throw new Error('TOKEN_ENCRYPTION_KEY is not set')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes (base64 of a 256-bit key)')
  }
  return key
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.')
}

export function decryptToken(enc: string): string {
  const [ivB64, tagB64, ctB64] = enc.split('.')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed ciphertext')
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()])
  return pt.toString('utf8')
}
