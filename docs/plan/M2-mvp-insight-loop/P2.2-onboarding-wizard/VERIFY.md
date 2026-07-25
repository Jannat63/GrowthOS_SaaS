# P2.2 — Verification Log

Date: 2026-07-17

## End-to-end onboarding pipeline (enqueue → Redis → worker → Neon)

Worker up via `.venv/Scripts/python -m uvicorn app.main:app --port 8100`; stack via `docker compose up -d`.

`pnpm --filter @growthos/api exec tsx scripts/e2e-onboarding.ts`:
```
enqueued onboarding_analyze: 73cc8c0f-5f7d-4c00-af4d-21b3b84f9063
strategy present: true | onboarding_step: review
OK: onboarding pipeline (enqueue -> redis -> worker -> strategy in Neon, step=review)
```

The `onboarding_analyze` job ran through the real Redis→worker loop: stub crawl → deterministic
strategy → `onboarding_analyses` row written + `workspaces.onboarding_step` advanced to `review`. ✅

## Automated tests

- **Worker (pytest, 15 total):** +7 for P2.2 — onboarding repo (upsert idempotency, mark_progress,
  set_onboarding_step), strategy generator (allocations sum to 100, category fallback), stub crawl
  determinism, and the `onboarding_analyze` handler integration (writes strategy + step, job complete).
- **API (vitest):** enqueue test still green; onboarding routes typecheck; idempotency + persist +
  status covered by `scripts/smoke-onboarding-route.ts` (run manually with a session cookie).
- **Web:** `pnpm --filter @growthos/web build` compiles (onboarding-complete wrapped in Suspense for
  `useSearchParams`).

## Flow wired

business-info → connect-accounts → **create-workspace** (creates org, persists profile, enqueues
`onboarding_analyze`) → **onboarding-complete** (polls job via `useJob`; analyzing → review of the
generated strategy → "Looks good" flips `onboardingComplete`) → `/growth-hub`.

## Notes / deferred

- Authed HTTP route check needs a session cookie (same as P2.1) — data-layer E2E used instead.
- `category` is free text; the worker maps known categories and falls back to the `other` template.
- **Recommendations table + `/recommendations` endpoint + frontend `Recommendation` unification are
  deferred to P2.3** (avoids a second rec producer). Dashboard recs remain mock-backed one more slice.
