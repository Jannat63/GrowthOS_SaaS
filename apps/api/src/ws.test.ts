import { describe, expect, it, vi } from 'vitest'
import type { WebSocket } from 'ws'
import { connectionCount, publish, subscribeSocket, unsubscribeSocket } from './ws.js'

function fakeSocket(): WebSocket {
  const sent: string[] = []
  return {
    readyState: 1, // OPEN
    OPEN: 1,
    send: vi.fn((msg: string) => sent.push(msg)),
    _sent: sent,
  } as unknown as WebSocket
}

describe('ws — room management', () => {
  it('tracks connection count as sockets join and leave', () => {
    const ws1 = fakeSocket()
    const ws2 = fakeSocket()
    const workspaceId = 'test-ws-room-a'

    expect(connectionCount(workspaceId)).toBe(0)
    subscribeSocket(workspaceId, ws1)
    expect(connectionCount(workspaceId)).toBe(1)
    subscribeSocket(workspaceId, ws2)
    expect(connectionCount(workspaceId)).toBe(2)
    unsubscribeSocket(workspaceId, ws1)
    expect(connectionCount(workspaceId)).toBe(1)
    unsubscribeSocket(workspaceId, ws2)
    expect(connectionCount(workspaceId)).toBe(0)
  })

  it('keeps rooms for different workspaces independent', () => {
    const ws1 = fakeSocket()
    subscribeSocket('test-ws-room-b', ws1)
    expect(connectionCount('test-ws-room-b')).toBe(1)
    expect(connectionCount('test-ws-room-c')).toBe(0)
    unsubscribeSocket('test-ws-room-b', ws1)
  })

  it('is a no-op unsubscribing a socket that was never subscribed', () => {
    expect(() => unsubscribeSocket('test-ws-room-never', fakeSocket())).not.toThrow()
  })

  it('is a no-op unsubscribing from a workspace with no room at all', () => {
    expect(() => unsubscribeSocket('test-ws-room-nonexistent', fakeSocket())).not.toThrow()
  })
})

describe('ws — publish', () => {
  it('never throws, even when Redis is unreachable (falls back to local-only delivery)', async () => {
    // No live Redis in this dev sandbox — this exercises the real fallback path, not a stubbed one.
    const workspaceId = 'test-ws-publish-fallback'
    const socket = fakeSocket()
    subscribeSocket(workspaceId, socket)

    await expect(publish({ type: 'recommendation:new', workspaceId })).resolves.toBeUndefined()

    unsubscribeSocket(workspaceId, socket)
  })

  it('does not error when publishing to a workspace with no connected sockets', async () => {
    await expect(publish({ type: 'intelligence:report_ready', workspaceId: 'test-ws-nobody-listening' })).resolves.toBeUndefined()
  })
})
