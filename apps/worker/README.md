# @growthos/worker

Python job worker (M2 P2.1). Consumes jobs from Redis (pushed by `apps/api`), runs handlers, and
writes results to `background_jobs` in Neon. Plain worker — no Celery (see the design spec).

## Setup

```bash
cd apps/worker
py -3.12 -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # POSIX: .venv/bin/python
cp .env.example .env    # fill DATABASE_URL with the Neon URL (same as packages/db/.env)
```

Requires the local dev stack (`docker compose up -d` at the repo root) for Redis + ClickHouse.

## Run

```bash
.venv/Scripts/python -m uvicorn app.main:app --port 8100
# GET http://localhost:8100/health  -> {"status":"ok","service":"worker"}
```

The consumer loop starts automatically on app startup and drains `jobs:queue`.

## Test

```bash
.venv/Scripts/python -m pytest -v
```
