# P2.1 — Progress

Status: [ ]  ·  Updated: 2026-07-05

Prerequisites outstanding: Neon URL; Python 3.12 (current is 3.14); Docker (not installed — local ClickHouse); Upstash Redis (job broker).

| Item | Status | Notes |
|------|--------|-------|
| `apps/worker` (Python 3.12 venv, Celery + Redis, FastAPI health) | [ ] | Needs Python 3.12 + Upstash Redis. |
| Job pattern (enqueue → Celery → Neon → `202 {jobId}` + `/jobs/:jobId`) | [ ] | BullMQ/Redis. |
| `background_jobs` table | [ ] | |
| ClickHouse local Docker + load `legacy/db/clickhouse` schema | [ ] | Needs Docker (not installed). |
| `platform_connections` + OAuth connect/disconnect (Google/Meta/GSC/Shopify) | [ ] | Encrypted tokens. |

## Log

- 2026-07-05 — Plan created.
