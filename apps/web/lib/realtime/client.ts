import type { WebSocketEvent } from "@growthos/types";

// Better Auth close codes the server sends for auth failures — no point reconnecting on these.
const CLOSE_UNAUTHENTICATED = 4401;
const CLOSE_FORBIDDEN = 4403;

const MAX_BACKOFF_MS = 30_000;

function wsUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  return base.replace(/^http/, "ws") + "/api/v1/ws";
}

/**
 * Framework-agnostic WebSocket client for the real-time layer. Owns one socket, subscribes
 * to a single workspace room, and reconnects with exponential backoff — except on auth
 * closes (4401/4403), which won't succeed on retry. The React glue lives in useRealtime.
 */
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private workspaceId: string | null = null;
  private closed = false;
  private backoff = 1_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly onEvent: (event: WebSocketEvent) => void) {}

  connect(workspaceId: string): void {
    this.workspaceId = workspaceId;
    this.closed = false;
    this.open();
  }

  private open(): void {
    if (this.closed) return;
    const socket = new WebSocket(wsUrl());
    this.socket = socket;

    socket.onopen = () => {
      this.backoff = 1_000;
      this.subscribe();
    };
    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.event?.type) this.onEvent(data.event as WebSocketEvent);
      } catch {
        // ignore server frames we don't understand (e.g. the {type:"subscribed"} ack)
      }
    };
    socket.onclose = (ev) => {
      this.socket = null;
      const authFailure = ev.code === CLOSE_UNAUTHENTICATED || ev.code === CLOSE_FORBIDDEN;
      if (!this.closed && !authFailure) this.scheduleReconnect();
    };
    socket.onerror = () => socket.close();
  }

  private subscribe(): void {
    if (this.socket?.readyState === WebSocket.OPEN && this.workspaceId) {
      this.socket.send(JSON.stringify({ subscribe: this.workspaceId }));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
      this.open();
    }, this.backoff);
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
  }
}
