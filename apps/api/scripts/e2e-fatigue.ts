// E2E (data layer): fatiguing creatives -> fatigue_alert recs, then act.
// Usage: pnpm --filter @growthos/api exec tsx scripts/e2e-fatigue.ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureFatigueAlerts, getFatigueResults } from '../src/fatigue.js'
import { updateRecommendationStatus } from '../src/search-terms.js'

const ws = 'e2e-fatigue-ws'

async function main() {
  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  const nonHealthy = getFatigueResults().filter((r) => r.status !== 'healthy').length
  console.log('non-healthy creatives:', nonHealthy)

  await ensureFatigueAlerts(ws)
  const recs = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  console.log('fatigue_alert recs:', recs.length)

  await ensureFatigueAlerts(ws) // idempotent
  const recs2 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  await updateRecommendationStatus(ws, recs[0]!.id, 'acted')
  const [acted] = await db.select().from(schema.recommendations).where(eq(schema.recommendations.id, recs[0]!.id))

  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  if (recs.length !== nonHealthy || recs.length < 1 || recs2.length !== recs.length || acted!.status !== 'acted') {
    console.error('FAIL')
    process.exit(1)
  }
  console.log('OK: creative fatigue (alerts for non-healthy, idempotent, act persists)')
}
main().catch((e) => { console.error(e); process.exit(1) })
