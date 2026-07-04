# P2.5 — Creative Fatigue Monitor

Milestone: M2 · Depends on: P2.1 · Prerequisites: Neon URL · worker (P2.1) · Resend

## Goal

Detect fatiguing Meta ad sets on a 4-hourly cadence and alert the user via email + WebSocket, with an
alert card and brief suggestions.

## Subphases

- [ ] Add the `meta_ad_sets` table.
- [ ] Build the 4-hourly fatigue worker (canonical `apps/web/lib/logic/creative-fatigue.ts`).
- [ ] Add the alert rule (frequency > 3 AND CTR down 20% week-over-week).
- [ ] Send Resend email + WebSocket event `meta:fatigue_alert`.
- [ ] Build the alert-card UI + brief suggestions.
- [ ] Track acted / ignored.

## Reuse

- `apps/web/lib/logic/creative-fatigue.ts` → canonical fatigue logic.
- `legacy/services/notification-service` (WebSocket) → as-is / spec.

## Surface

- Table: `meta_ad_sets`.
- Worker: 4-hourly fatigue (`apps/web/lib/logic/creative-fatigue.ts`).
- Alert rule: freq > 3 & CTR −20% WoW.
- Notifications: Resend email + WebSocket `meta:fatigue_alert`.
- UI: alert card + brief suggestions; acted/ignored tracking.

## Verification

- A seeded fatigued ad set → the alert fires → the card shows.
