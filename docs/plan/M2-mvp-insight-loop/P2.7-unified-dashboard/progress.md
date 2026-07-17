# P2.7 — Progress

Status: [x]  ·  Updated: 2026-07-17  ·  **Done (M2 scope; real-time WS → M3).**

Ties the modules together: `GET /recommendations` now composes **all** generators
(`ensureAllRecommendations`), so the impact-sorted queue + notification center are complete regardless
of which pages were visited. **Real-time WebSocket transport → M3** (seeded M2 has no live events to
push); the action center polls via TanStack Query instead.

| Item | Status | Notes |
|------|--------|-------|
| Growth-hub KPI cards | [x] | Shipped M1; live-backed. |
| Impact-sorted recommendation queue | [x] | `GET /recommendations` (composite desc) — now **unified across all types**. |
| Notification / action center | [x] | TopBar bell dropdown over pending recs, each links to its module. |
| Real-time WebSocket transport | [–] | → M3 (`recommendation:new`, `job:complete`, `meta:fatigue_alert`, `analytics:mer_alert`). |

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — **P2.7 complete (M2 scope).** `ensureAllRecommendations` composes every generator so the
  queue/notification center are complete; TopBar action center over pending recs (links to owning
  modules). Unified test verifies all four types generate, idempotent, ordered. Real-time WS deferred to
  M3. Next: **P2.8 Hardening & polish**.
