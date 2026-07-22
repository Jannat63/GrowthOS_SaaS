import type { WebSocket } from '@fastify/websocket'

/**
 * In-memory registry of connected WebSocket clients grouped by workspace. Pure and
 * synchronous — the Fastify WS server owns the sockets, this only tracks membership and
 * fans out serialized messages. A socket lives in at most one room at a time; joining a
 * new workspace moves it. Unit-tested in isolation (no Fastify, no Redis).
 */
export class RoomRegistry {
  private rooms = new Map<string, Set<WebSocket>>()
  // Reverse index so we can move/remove a socket without scanning every room.
  private socketRoom = new Map<WebSocket, string>()

  /** Add a socket to a workspace room, removing it from any previous room first. */
  join(workspaceId: string, socket: WebSocket): void {
    this.leave(socket)
    let room = this.rooms.get(workspaceId)
    if (!room) {
      room = new Set()
      this.rooms.set(workspaceId, room)
    }
    room.add(socket)
    this.socketRoom.set(socket, workspaceId)
  }

  /** Remove a socket from whatever room it's in (no-op if untracked). */
  leave(socket: WebSocket): void {
    const workspaceId = this.socketRoom.get(socket)
    if (workspaceId === undefined) return
    const room = this.rooms.get(workspaceId)
    if (room) {
      room.delete(socket)
      if (room.size === 0) this.rooms.delete(workspaceId)
    }
    this.socketRoom.delete(socket)
  }

  /** Send a pre-serialized message to every socket in a workspace room. Returns count sent. */
  broadcast(workspaceId: string, message: string): number {
    const room = this.rooms.get(workspaceId)
    if (!room) return 0
    let sent = 0
    for (const socket of room) {
      try {
        socket.send(message)
        sent++
      } catch {
        // A dead socket is dropped from the room; its own close handler also cleans up.
        this.leave(socket)
      }
    }
    return sent
  }

  /** Number of sockets in a room (0 if none) — for tests and diagnostics. */
  size(workspaceId: string): number {
    return this.rooms.get(workspaceId)?.size ?? 0
  }
}
