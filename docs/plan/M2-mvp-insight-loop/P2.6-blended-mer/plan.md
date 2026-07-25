# P2.6 — Blended MER Dashboard

Milestone: M2 · Depends on: P2.1 · Prerequisites: Neon URL · local ClickHouse (P2.1) · worker

## Goal

Compute and visualize blended Marketing Efficiency Ratio (MER) from revenue + ad spend, with trends,
channel breakdowns, and anomaly alerts.

## Subphases

- [ ] Add revenue entry (`POST /analytics/revenue`) plus a Shopify pull.
- [ ] Implement the MER calculation (`apps/web/lib/logic/blended-mer.ts`).
- [ ] Add `GET /analytics/mer` (ClickHouse `ad_performance` + revenue).
- [ ] Build the Recharts 30 / 60 / 90-day trend + channel breakdown.
- [ ] Add anomaly detection > 15% WoW (WebSocket `analytics:mer_alert`).
- [ ] Add annotations.

## Frontend (vertical slice)

- **MER dashboard** module on shadcn + Recharts — 30/60/90-day trend, channel breakdown, revenue
  entry form, annotations, and the anomaly alert (`analytics:mer_alert`). Full loading/empty states.
- Runs on seeded ClickHouse `ad_performance` + seeded revenue in M2. The live **Shopify pull** is
  deferred to M3 (real integrations); M2 uses manual revenue entry + seeded revenue.

## Reuse

- `apps/web/lib/logic/blended-mer.ts` → canonical MER calculation.
- ClickHouse `ad_performance` (from P2.1) → data source.

## Surface

- Endpoints: `POST /analytics/revenue`, `GET /analytics/mer`.
- Calc: `apps/web/lib/logic/blended-mer.ts` (ClickHouse `ad_performance` + revenue).
- UI: Recharts 30/60/90 trend + channel breakdown; annotations.
- Alert: anomaly > 15% WoW → WebSocket `analytics:mer_alert`.

## Verification

- Revenue + spend → MER + trend render; the anomaly alert fires.
