# P2.1 — Progress

Status: [x]  ·  Updated: 2026-07-17

Prerequisites: **all met.** ✅ Neon URL (live since M1); ✅ Python 3.12.10 (installed alongside 3.14);
✅ Docker Desktop 29.6.1 (WSL2 backend); ✅ ClickHouse (local Docker, healthy); ✅ Redis (local Docker,
`redis://localhost:6379`). Redis is **local Docker in dev** (Upstash cloud deferred to production).

| Item | Status | Notes |
|------|--------|-------|
| `apps/worker` (Python 3.12 venv, **plain Redis consumer**, FastAPI health) | [x] | Not Celery — design decision. 8 pytest tests pass. |
| Job pattern (enqueue → worker → Neon → `202 {jobId}` + `/jobs/:jobId`) | [x] | Redis list `jobs:queue`; versioned JSON envelope. Status route guarded. |
| `background_jobs` table | [x] | Drizzle migration `0001` applied to Neon; smoke-tested. |
| ClickHouse local Docker + load schema | [x] | `docker-compose.yml` + `infra/clickhouse/schema/`; 5 tables auto-loaded, healthy. |
| ClickHouse **seed** fixture `ad_performance` rows (for P2.6) | [x] | 60 rows seeded via `seeds/clickhouse_seed.py`. |
| `platform_connections` seeded stub rows (no live OAuth in M2) | [x] | 3 stub rows, idempotent seed script. Real OAuth → M3 P3.0. |

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — Environment stood up: WSL2 + Ubuntu 26.04, Docker Desktop; local ClickHouse (schema
  auto-loaded, 5 tables) + local Redis via root `docker-compose.yml`. All prereqs met.
- 2026-07-17 — **P2.1 complete.** Built via TDD (spec + 11-task plan under `docs/superpowers/`):
  `background_jobs` table, shared job types, API `enqueue()` + status route, plain Python worker
  (envelope/repo/dispatch/consumer), seeded ClickHouse + `platform_connections`. E2E pipeline verified
  (enqueue → Redis → worker → Neon; `queued → complete`). API vitest + 8 worker pytest tests green.
  See `VERIFY.md`. **Changes are staged in the working tree, not yet committed** (per request).
