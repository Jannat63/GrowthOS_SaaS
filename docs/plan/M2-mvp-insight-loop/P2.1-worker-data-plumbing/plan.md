# P2.1 — Worker & data plumbing

Milestone: M2 · Depends on: P1.1, P1.3 · Prerequisites: Neon URL · Python 3.12 (current is 3.14) · Docker (local ClickHouse) · Upstash Redis (job broker)

## Goal

Stand up the async worker and the data plumbing every MVP feature relies on: a Python/Celery worker,
the enqueue→process→status job pattern, the background-jobs table, local ClickHouse, and OAuth
`platform_connections`.

## Subphases

- [ ] Create `apps/worker` — Python 3.12 venv, Celery + Redis broker, FastAPI health endpoint.
- [ ] Implement the job pattern: Fastify enqueues via BullMQ/Redis → Celery → writes Neon →
  responds `202 {jobId}`, with `GET /jobs/:jobId` for status.
- [ ] Add the `background_jobs` table.
- [ ] Run local ClickHouse (Docker) and load the `legacy/db/clickhouse` schema.
- [ ] Add `platform_connections` OAuth connect/disconnect for Google / Meta / GSC / Shopify with
  encrypted tokens.

## Reuse

- `legacy/services/intelligence-service/celery_app.py` → as-is / spec.
- `legacy/db/clickhouse` → as-is / spec (schema loaded into local ClickHouse).

## Surface

- `apps/worker/` — Python 3.12 venv, Celery app, Redis broker, FastAPI `/health`.
- Job flow: Fastify enqueue (BullMQ/Redis) → Celery → Neon; `202 {jobId}`; `GET /jobs/:jobId`.
- Tables: `background_jobs`; `platform_connections` (encrypted tokens).
- ClickHouse: local Docker instance with `legacy/db/clickhouse` schema.
- OAuth connect/disconnect: Google, Meta, GSC, Shopify.

## Verification

- A dummy job is enqueued → processed → status flips via `GET /jobs/:jobId`.

## Prerequisite notes

- Python: current is 3.14 — install 3.12 for the worker venv.
- Docker: not installed — required for local ClickHouse.
- Upstash Redis: account needed as the job broker.
