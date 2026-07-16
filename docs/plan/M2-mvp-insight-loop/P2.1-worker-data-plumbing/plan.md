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

> **Implemented as a plain Python worker, not Celery** (design decision — see
> `docs/superpowers/specs/2026-07-17-p2.1-worker-job-bridge-design.md`). Celery's retries/scheduling
> aren't needed on M2's seeded, on-demand jobs; handlers are plain functions so a Celery swap in M3
> is contained. Contract: Fastify writes an authoritative `background_jobs` row then LPUSHes a
> versioned JSON envelope to Redis list `jobs:queue`; the worker BLPOPs it.

- [x] Create `apps/worker` — Python 3.12 venv, **plain Redis consumer** + FastAPI health endpoint.
- [x] **Job-bridge contract defined** — versioned JSON envelope on a plain Redis list (not BullMQ→Celery),
  documented in the design spec + implementation plan.
- [x] Job pattern end-to-end: Fastify `enqueue()` → worker processes → writes Neon; `202 {jobId, statusUrl}`
  shape + `GET /workspaces/:id/jobs/:jobId` status route. E2E verified (see `VERIFY.md`).
- [x] Add the `background_jobs` table (Drizzle migration applied to Neon).
- [x] Run local ClickHouse (Docker) + load schema; **seeded** with 60 fixture `ad_performance` rows.
- [x] Add **seeded** stub `platform_connections` rows (stub tokens) — idempotent seed script.

Deferred by design: WebSocket `job:complete` push → **P2.7**; real OAuth → **M3 P3.0**.

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
