import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { signState, verifyState } from './state.js'

beforeAll(() => {
  process.env.OAUTH_STATE_SECRET = randomBytes(16).toString('hex')
})
afterEach(() => vi.useRealTimers())

describe('oauth state', () => {
  it('round-trips workspaceId + platform', () => {
    const s = signState({ workspaceId: 'ws1', platform: 'google_search_console' })
    expect(verifyState(s)).toEqual({ workspaceId: 'ws1', platform: 'google_search_console' })
  })

  it('rejects a tampered signature', () => {
    const s = signState({ workspaceId: 'ws1', platform: 'x' })
    const [body] = s.split('.')
    expect(() => verifyState(`${body}.deadbeef`)).toThrow()
  })

  it('rejects an expired state', () => {
    vi.useFakeTimers()
    const s = signState({ workspaceId: 'ws1', platform: 'x' })
    vi.setSystemTime(Date.now() + 11 * 60 * 1000)
    expect(() => verifyState(s)).toThrow()
  })
})
