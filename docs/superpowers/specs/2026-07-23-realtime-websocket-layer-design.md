# Real-time WebSocket Layer — Design

Date: 2026-07-23 · Status: approved · Owner: restructure branch

## Problem

The app is entirely poll-based (TanStack Query). Long async work (onboarding pipeline,
OAuth sync) and generated recommendations only surface on the next poll, and the
`TopBar` action center has no live push. A `WebSocketEvent` union exists in
`@growthos/types` but nothing produces or consumes it. This closes deferred slices from
M2 (P2.5/P2.7) and M3 (P3.4 scheduled/WS notes).

## Decision

Three processes — Node API (`:3001`), Python worker, browser (`:3000`) — already share
one Redis. Use **Redis pub/sub** as the cross-language event bus, a **Fastify raw
WebSocket** endpoint as the browser fan-out, and a **frontend hook** that turns events
into query invalidations + toasts. The layer is **additive**: polling stays as the
fallback, so a dropped socket degrades gracefully to today's behavior.

Rejected alternatives: Socket.IO (heavier, the stub already speaks raw JSON events);
per-client Redis subscriber (one subscriber per API process fans out to in-memory rooms
instead — far fewer Redis connections).

## Data flow

```
worker / API  ──PUBLISH ws:events {workspaceId, event}──▶  Redis
Redis  ──(1 subscriber per API process)──▶  workspace room  ──▶  browser socket(s)
browser  ──▶  useRealtime hook  ──▶  queryClient.invalidateQueries + toast
```

## Components (isolated, independently testable)

| Unit | File | Responsibility |
|------|------|----------------|
| Event bus (Node) | `apps/api/src/ws/events.ts` | `WS_CHANNEL` const, `publishEvent(workspaceId, event)` — fire-and-forget, swallows errors like `recordAudit` |
| Room registry | `apps/api/src/ws/rooms.ts` | Pure `Map<workspaceId, Set<socket>>`: `join`/`leave`/`broadcast`/`size`. **Unit-tested in isolation.** |
| WS server | `apps/api/src/ws/server.ts` | Registers `@fastify/websocket` at `GET /api/v1/ws`; auth on connect; one Redis subscriber → room broadcast |
| Event bus (Python) | `apps/worker/app/events.py` | `publish_event(redis, workspace_id, event)` |
| WS client | `apps/web/lib/realtime/client.ts` | Singleton socket, exponential-backoff reconnect, re-subscribe on workspace switch |
| React hook | `apps/web/lib/hooks/useRealtime.ts` | Event → query keys to invalidate + toast; mounted once in the dashboard layout |

## Auth & rooms

- WS connect authenticated via the **Better Auth session cookie**, reusing
  `getSessionUser(request)` (the WS handler receives the FastifyRequest). No session →
  close with code 4401.
- Client sends `{ "subscribe": "<workspaceId>" }`. Server verifies membership via
  `requireWorkspaceMember` before `rooms.join`. Not a member → close 4403.
- A socket belongs to exactly one workspace room at a time; switching workspaces
  re-subscribes (server moves it between rooms).

## Emit points (all four event types)

| Event | Site | Trigger |
|-------|------|---------|
| `job:complete` | worker `consumer.process_one` after `mark_complete` | every job (has `env.workspace_id`) |
| `recommendation:new` | API insert sites (`recommendations.ts`, `fatigue.ts`) — guarded to fire only when rows were actually inserted | first generation per workspace (idempotent) |
| `meta:fatigue_alert` | API `ensureFatigueAlerts` when it inserts alerts | first fatigue generation |
| `analytics:mer_alert` | API `getMerTrend` when `anomaly.detected` | MER anomaly present (client toast keyed `mer-<workspaceId>` to de-dupe) |

## Error handling

- `publishEvent` / `publish_event` are best-effort and swallow their own errors — a
  logging/bus failure can never break the mutation it accompanies.
- Client reconnects with exponential backoff (1s→30s cap) and re-subscribes on reconnect
  and on workspace change; malformed frames are dropped and logged.
- If the socket never connects, existing polling still refreshes all data.

## Testing

- `rooms.ts`: pure unit tests (join/leave/broadcast/size, multi-socket rooms).
- `events.ts`: publish serializes the envelope and never throws when Redis is down.
- `useRealtime` event→invalidation map: pure-function test over the mapping table.
- worker `events.py`: `publish_event` via a monkeypatched redis (asserts channel +
  payload); best-effort swallow on error.
- Live handshake is kept thin (auth + subscribe + close codes) so the untested surface
  is minimal.

## Dependencies

`@fastify/websocket` (v11, Fastify 5) in `apps/api`. Worker uses existing
`redis.asyncio`. Web uses the native `WebSocket`. No new web dependency.
