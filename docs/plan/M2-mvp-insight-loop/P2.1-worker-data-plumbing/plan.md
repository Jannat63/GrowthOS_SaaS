# P2.1 — Worker & data plumbing

Milestone: M2 · Depends on: P1.1, P1.3 · Prerequisites: Neon URL · Python 3.12 (current is 3.14) · Docker (local ClickHouse) · Upstash Redis (job broker)

## Goal

Stand up the async worker and the data plumbing every MVP feature relies on: a Python/Celery worker,
the enqueue→process→status job pattern, the background-jobs table, and local ClickHouse. This is the
one infra phase in M2 — it has **no user-facing UI** beyond a small job-status surface.

> **Seeded, not live (M2 rule).** M2 runs entirely on **seeded fixtures** — the `lib/mock-data`
> fixtures + the tested `lib/logic` engines are the data source. `platform_connections` rows exist but
> are **seeded stubs**; there is **no real OAuth in M2**. Real OAuth connect/disconnect for Google /
> Meta / GSC / Shopify is a dedicated phase in **M3 (P3.0)** — see the "Deferred" section. This keeps
> M2 off the critical path of external app-review timelines (Meta App Review, Google Ads dev token).

## Subphases

- [ ] Create `apps/worker` — Python 3.12 venv, Celery + Redis broker, FastAPI health endpoint.
- [ ] **Define the job-bridge contract explicitly.** Fastify (Node) and Celery (Python) do **not**
  share a queue format — BullMQ and Celery are not wire-compatible. Decide and document the bridge:
  Fastify writes jobs to a **plain Redis stream/list with a shared JSON contract** that the Python
  worker consumes (recommended), *not* "BullMQ → Celery." Capture the chosen contract in the plan.
- [ ] Implement the job pattern end-to-end: Fastify enqueues → worker processes → writes Neon →
  Fastify responds `202 {jobId, statusUrl}`, with `GET /workspaces/:id/jobs/:jobId` for status.
- [ ] Add the `background_jobs` table.
- [ ] Run local ClickHouse (Docker) and load the `legacy/db/clickhouse` schema; **seed** it with
  fixture `ad_performance` rows so P2.6 has data.
- [ ] Add **seeded** `platform_connections` rows (stub tokens) so the UI shows "connected" channels
  without live OAuth.

## Frontend

- Minimal: a job-status affordance the later phases reuse (poll `GET .../jobs/:jobId`; surface
  `job:complete`). No new module page — the product UI arrives with P2.2+.

## Reuse

- `legacy/services/intelligence-service/celery_app.py` → as-is / spec.
- `legacy/db/clickhouse` → as-is / spec (schema loaded + seeded into local ClickHouse).

## Deferred to a later milestone (do NOT build here)

- **Real OAuth** connect/disconnect for Google, Meta, GSC, Shopify with encrypted tokens →
  **M3 P3.0 (Real platform integrations)**. M2 uses seeded `platform_connections` only.

## Verification

- A dummy job is enqueued → processed → status flips via `GET /workspaces/:id/jobs/:jobId`.
- Seeded ClickHouse returns fixture `ad_performance` rows.

## Prerequisite notes

- Python: current is 3.14 — install 3.12 for the worker venv.
- Docker: not installed — required for local ClickHouse.
- Upstash Redis: account needed as the job broker.
