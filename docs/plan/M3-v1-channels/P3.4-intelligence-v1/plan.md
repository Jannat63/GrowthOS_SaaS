# P3.4 — Intelligence Engine V1  (outline — mostly buildable now)

Milestone: M3 · Depends on: M2 recommendation stack (extends it)

## Goal
Grow the M2 recommendation engine into the full V1 intelligence layer: the **47-rule cross-channel
engine**, a scheduled evaluation loop, human-readable explanations, the Weekly Growth Intelligence
Report, budget reallocation, and first-party-data orchestration. **Template-first (D4).**

## Scope — a strong NON-blocked phase (no new external API)
- **Grow, don't rebuild:** extend `packages/logic/src/engines/cross-channel-engine.ts` (already tested)
  from its current bridges to the full **47-rule** set (port logic from
  `legacy/services/intelligence-service/app/cross_channel_engine.py`).
- **Scheduled loop:** 4-hourly evaluation. **Decision to make in this phase:** implement via the Python
  worker + a scheduler (APScheduler/Celery-beat) or a Node cron — the M2 worker is a plain consumer, so
  scheduling is the new piece deferred out of P2.1.
- **Explanations + Weekly Report:** deterministic templates now, Claude optional behind `ANTHROPIC_API_KEY`
  (D4). `intelligence_reports` (JSONB) table; report PDF via Puppeteer (shared with P3.5).
- **Budget reallocation engine** (cross-channel shifts) + **first-party-data orchestrator** (Google
  converters → Meta Custom Audience seed → Google Customer Match) — the latter needs P3.2/P3.3 live.

## Tables / endpoints
- Neon: `recommendations` (exists), `intelligence_reports` (new). Reads all channel + ClickHouse tables.
- API: `GET /intelligence/report`, `GET /recommendations` (exists), `PATCH /recommendations/:id` (exists),
  `POST /reports` (PDF). WS: `recommendation:new`, `intelligence:report_ready`, `analytics:mer_alert`.

## Legacy refs
`legacy/services/intelligence-service/app/`: `cross_channel_engine.py`, `budget_and_reports.py`.

## Recommendation
Prime candidate to build **right after P3.0** — it deepens the M2 loop with no external approvals, and the
scheduled-loop + WebSocket work also unblocks the notification center deferred from P2.7.
