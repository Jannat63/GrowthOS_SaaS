# P2.7 — Unified Dashboard + notifications

Milestone: M2 · Depends on: P2.3, P2.4, P2.5, P2.6 · Prerequisites: Neon URL · WebSocket infra (P2.5)

## Goal

Bring the loop together in one growth hub: KPI cards, an impact-sorted recommendation queue, and a
live WebSocket notification center.

## Subphases

- [ ] Build the growth-hub KPI cards.
- [ ] Build the impact-sorted recommendation queue (`GET /recommendations` by `composite_score`).
- [ ] Build the WebSocket notification center (`recommendation:new`, `job:complete`, …).
- [ ] Wire the real-time client.

## Reuse

- Existing growth-hub page + mock-data → as-is (repointed to live data).
- `legacy/services/notification-service` → WebSocket notification center.

## Surface

- UI: growth-hub KPI cards; recommendation queue; notification center.
- Endpoint: `GET /recommendations` (sorted by `composite_score`).
- WebSocket events: `recommendation:new`, `job:complete`, and others.
- Real-time client wiring.

## Verification

- Recommendations render impact-sorted; a live WebSocket event updates the UI.
