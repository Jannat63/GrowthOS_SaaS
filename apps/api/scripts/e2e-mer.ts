// E2E (data layer): seed ClickHouse ad_performance -> aggregate -> blended MER trend.
// Requires ClickHouse (docker compose up -d). Usage: pnpm --filter @growthos/api exec tsx scripts/e2e-mer.ts
import 'dotenv/config'
import { ensureAdPerformanceSeed, getMerTrend, getClickhouse } from '../src/analytics.js'

const ws = 'e2e-mer-ws'

async function main() {
  await getClickhouse().command({
    query: 'ALTER TABLE ad_performance DELETE WHERE workspace_id = {ws:String}',
    query_params: { ws },
  })

  await ensureAdPerformanceSeed(ws)
  const a = await getMerTrend(ws, 30)
  console.log('trend points:', a.trend.length, '| blended MER:', a.summary.blendedMER, '| anomaly:', a.anomaly.detected)

  await ensureAdPerformanceSeed(ws) // idempotent
  const b = await getMerTrend(ws, 30)

  await getClickhouse().command({
    query: 'ALTER TABLE ad_performance DELETE WHERE workspace_id = {ws:String}',
    query_params: { ws },
  })

  if (a.trend.length === 0 || a.summary.blendedMER <= 0 || b.trend.length !== a.trend.length) {
    console.error('FAIL')
    process.exit(1)
  }
  console.log('OK: blended MER (ClickHouse seed-if-empty, aggregated trend, idempotent)')
}
main().catch((e) => { console.error(e); process.exit(1) })
