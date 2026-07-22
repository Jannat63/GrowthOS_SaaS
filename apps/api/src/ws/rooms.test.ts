import { describe, it, expect, vi } from 'vitest'
import type { WebSocket } from '@fastify/websocket'
import { RoomRegistry } from './rooms.js'

// Minimal stand-in — RoomRegistry only ever calls `.send()`.
function fakeSocket() {
  return { send: vi.fn() } as unknown as WebSocket & { send: ReturnType<typeof vi.fn> }
}

describe('RoomRegistry', () => {
  it('broadcasts only to sockets in the target workspace', () => {
    const rooms = new RoomRegistry()
    const a1 = fakeSocket()
    const a2 = fakeSocket()
    const b1 = fakeSocket()
    rooms.join('ws-a', a1)
    rooms.join('ws-a', a2)
    rooms.join('ws-b', b1)

    const sent = rooms.broadcast('ws-a', 'hello')

    expect(sent).toBe(2)
    expect(a1.send).toHaveBeenCalledWith('hello')
    expect(a2.send).toHaveBeenCalledWith('hello')
    expect(b1.send).not.toHaveBeenCalled()
  })

  it('moves a socket when it joins a different workspace', () => {
    const rooms = new RoomRegistry()
    const s = fakeSocket()
    rooms.join('ws-a', s)
    rooms.join('ws-b', s)

    expect(rooms.size('ws-a')).toBe(0)
    expect(rooms.size('ws-b')).toBe(1)
  })

  it('leave removes the socket and cleans up the empty room', () => {
    const rooms = new RoomRegistry()
    const s = fakeSocket()
    rooms.join('ws-a', s)
    rooms.leave(s)

    expect(rooms.size('ws-a')).toBe(0)
    expect(rooms.broadcast('ws-a', 'x')).toBe(0)
  })

  it('leave is a no-op for an untracked socket', () => {
    const rooms = new RoomRegistry()
    expect(() => rooms.leave(fakeSocket())).not.toThrow()
  })

  it('drops a socket whose send throws and does not count it', () => {
    const rooms = new RoomRegistry()
    const good = fakeSocket()
    const bad = fakeSocket()
    bad.send.mockImplementation(() => {
      throw new Error('dead socket')
    })
    rooms.join('ws-a', good)
    rooms.join('ws-a', bad)

    const sent = rooms.broadcast('ws-a', 'ping')

    expect(sent).toBe(1)
    expect(rooms.size('ws-a')).toBe(1) // bad socket evicted
  })

  it('broadcast to an unknown workspace sends nothing', () => {
    const rooms = new RoomRegistry()
    expect(rooms.broadcast('nope', 'x')).toBe(0)
  })
})
