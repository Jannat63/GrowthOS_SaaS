// E2E (data layer): paid-proven search terms -> paid_to_organic recs + content briefs, then act.
// No worker needed — synchronous TS. Usage: pnpm --filter @growthos/api exec tsx scripts/e2e-paid-to-organic.ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensurePaidToOrganic, getContentBriefs, updateRecommendationStatus } from '../src/search-terms.js'

const ws = 'e2e-p2o-ws'

async function main() {
  await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  await ensurePaidToOrganic(ws)
  const recs = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  const briefs = await getContentBriefs(ws)
  console.log('paid_to_organic recs:', recs.length, '| briefs:', briefs.length)

  await ensurePaidToOrganic(ws) // idempotent
  const recs2 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  await updateRecommendationStatus(ws, recs[0]!.id, 'acted')
  const [acted] = await db.select().from(schema.recommendations).where(eq(schema.recommendations.id, recs[0]!.id))
  console.log('after act -> status:', acted!.status, '| actedAt set:', acted!.actedAt !== null)

  await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  if (recs.length < 1 || briefs.length !== recs.length || recs2.length !== recs.length || acted!.status !== 'acted') {
    console.error('FAIL')
    process.exit(1)
  }
  console.log('OK: paid-to-organic (recs+briefs generated, idempotent, act persists)')
}
main().catch((e) => { console.error(e); process.exit(1) })
