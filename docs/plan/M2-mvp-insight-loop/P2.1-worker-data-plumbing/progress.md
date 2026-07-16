# P2.1 — Progress

Status: [~]  ·  Updated: 2026-07-17

Prerequisites: **all met.** ✅ Neon URL (live since M1); ✅ Python 3.12.10 (installed alongside 3.14);
✅ Docker Desktop 29.6.1 (WSL2 backend); ✅ ClickHouse (local Docker, healthy); ✅ Redis (local Docker,
`redis://localhost:6379`). Redis is **local Docker in dev** (Upstash cloud deferred to production).

| Item | Status | Notes |
|------|--------|-------|
| `apps/worker` (Python 3.12 venv, Celery + Redis, FastAPI health) | [ ] | Prereqs ready; not built yet. |
| Job pattern (enqueue → Celery → Neon → `202 {jobId}` + `/jobs/:jobId`) | [ ] | Redis broker; define Node↔Python JSON contract. |
| `background_jobs` table | [ ] | |
| ClickHouse local Docker + load schema | [x] | `docker-compose.yml` + `infra/clickhouse/schema/`; 5 tables auto-loaded, healthy. Still needs fixture seeding. |
| ClickHouse **seed** fixture `ad_performance` rows (for P2.6) | [ ] | |
| `platform_connections` seeded stub rows (no live OAuth in M2) | [ ] | Real OAuth → M3 P3.0. |

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — Environment stood up: WSL2 + Ubuntu 26.04, Docker Desktop; local ClickHouse (schema
  auto-loaded, 5 tables) + local Redis via root `docker-compose.yml`. All prereqs met. Phase moved to in-progress.
