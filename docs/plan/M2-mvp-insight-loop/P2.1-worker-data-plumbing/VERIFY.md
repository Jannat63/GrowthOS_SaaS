# P2.1 — Verification Log

Date: 2026-07-17

## End-to-end job pipeline (enqueue → Redis → Python worker → Neon)

**Stack:** `docker compose up -d` (ClickHouse + Redis) · worker via
`.venv/Scripts/python -m uvicorn app.main:app --port 8100`.

Worker startup log:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8100
INFO:worker.consumer:consumer started; draining jobs:queue
```
Health: `GET http://localhost:8100/health` → `{"status":"ok","service":"worker"}`

**E2E run** (`pnpm --filter @growthos/api exec tsx scripts/e2e-echo.ts`):
```
enqueued: bde1e095-a310-4480-8bfd-6c3b9e7976fc
final status: complete | result: {"echoed":{"hello":"e2e"}}
OK: end-to-end echo pipeline (enqueue -> redis -> worker -> neon)
```

The TS `enqueue()` wrote a `queued` row + LPUSHed the JSON envelope; the Python worker BLPOPed
it, ran the `echo` handler, and wrote the result back to `background_jobs` in Neon; the row flipped
`queued → complete`. ✅

## Automated tests

- `apps/api` (vitest): `enqueue` inserts a queued row + pushes a matching envelope — PASS.
- `apps/worker` (pytest, 8 tests): envelope validation, jobs repo lifecycle (complete/failed),
  dispatch (echo + unknown), consumer `process_one` (complete + unknown-type-fails) — all PASS.

## Notes

- The authed HTTP status route `GET /workspaces/:id/jobs/:jobId` compiles + typechecks; a full
  authed check needs a logged-in session cookie (`scripts/smoke-jobs-route.ts`) — run manually with
  a real session. The route's guard (`requireWorkspaceMember`) is the same one verified in P1.3.
