# P3.4 — Verification

## Automated (CI-safe)

```bash
# Logic engine (pure, no infra)
pnpm --filter @growthos/logic exec vitest run src/intelligence.test.ts     # 5 pass

# API report builder (needs dev stack: Neon + ClickHouse up)
docker compose up -d                                                        # ClickHouse:8123, Redis:6379
pnpm --filter @growthos/api exec vitest run src/intelligence.test.ts        # 1 pass (builds + persists + idempotent)

# Types + web build
pnpm typecheck
pnpm --filter @growthos/web build                                          # /intelligence route emitted (~3.3 kB)
```

Expected: logic asserts blended-ROAS math, the ≥2-channel / >1.2× gap guard on
`recommendBudgetReallocation`, and the 3-opportunity cap. API test asserts a persisted
`intelligence_reports` row with a channel breakdown and that a second call updates the same row
(idempotent per week).

## Manual E2E (dev stack)

1. `docker compose up -d` then `pnpm dev` (web:3000, api:3001).
2. Sign in → sidebar → **Intelligence**.
3. Expect: headline cards (blended ROAS / revenue / spend), a narrative summary containing
   "blended ROAS", a channel-breakdown table (spend / revenue / ROAS per channel), a budget-reallocation
   card when one channel meaningfully out-performs another, and up to 3 top opportunities.
4. `DataSourceBadge` shows **live** when the API + ClickHouse seed respond; **mock** if the API is down
   (the `useReport` liveOrMock fallback renders `generateWeeklyReport` over a fixed channel set).

## Notes / limits
- Report reflects **seeded** `ad_performance` until real channel data (P3.0 GSC / P3.2 Ads) flows.
- No scheduled refresh yet — the report regenerates on each page load (generate-on-read, idempotent
  per ISO week).
