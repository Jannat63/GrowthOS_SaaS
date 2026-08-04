# P2.6 — Progress

Status: [x]  ·  Updated: 2026-07-17  ·  **Done (M2 seeded scope).**

The API queries the **seeded ClickHouse `ad_performance`** (validates the P2.1 seed end-to-end),
seed-if-empty per workspace. MER via canonical `@growthos/logic`. Revenue = seeded `conversion_value ×
2.2` stand-in; **real Shopify pull + manual revenue entry → M3**; **anomaly WebSocket → shipped 2026-07-27** (see P2.7 progress.md), via a new scheduled `runMerAnomalyCheck` task rather than the read path.

| Item | Status | Notes |
|------|--------|-------|
| MER calc (canonical `blended-mer`) | [x] | `@growthos/logic` `calculateBlendedMER`. |
| `GET /analytics/mer` (ClickHouse `ad_performance`) | [x] | Seed-if-empty; 30/60/90-day aggregate. |
| Recharts trend + channel breakdown | [x] | `/analytics` — area chart (healthy-3× ref line) + spend split. |
| Anomaly > 15% WoW | [x] | Computed + flagged in response; WS push (`analytics:mer_alert`) → **shipped 2026-07-27**, checked on a 4h schedule, not the read path (see P2.7 progress.md for why). |
| Revenue entry (`POST /analytics/revenue`) + Shopify | [–] | → M3 (real integrations). |
| Annotations | [–] | → later (not MVP-critical). |

## Log

- 2026-07-05 — Plan created.
- 2026-07-17 — **P2.6 complete (M2 seeded scope).** Added `@clickhouse/client` to the API; MER trend
  aggregates seeded `ad_performance` (seed-if-empty per workspace); Recharts MER dashboard (30/60/90 +
  channel breakdown + anomaly badge). **Fixed a real schema bug:** ClickHouse ID columns were `UUID` but
  Better Auth uses text IDs → changed to `String` (container reloaded). E2E verified. Deferred: revenue
  entry/Shopify → M3; annotations → later; anomaly WS → shipped 2026-07-27 (P2.7). Next: **P2.7 Unified Dashboard + notifications**.
