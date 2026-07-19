// E2E (data layer): top organic pages -> organic_to_paid recs + Meta creative briefs, then act.
// Usage: pnpm --filter @growthos/api exec tsx scripts/e2e-organic-to-paid.ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureOrganicToPaid, getTopOrganicPages } from '../src/organic-to-paid.js'
import { updateRecommendationStatus } from '../src/search-terms.js'

const ws = 'e2e-o2p-ws'

async function main() {
  await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  console.log('top organic pages:', getTopOrganicPages().length)
  await ensureOrganicToPaid(ws)
  const recs = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  const briefs = await db.select().from(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
  console.log('organic_to_paid recs:', recs.length, '| creative briefs:', briefs.length)

  await ensureOrganicToPaid(ws) // idempotent
  const recs2 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  await updateRecommendationStatus(ws, recs[0]!.id, 'dismissed')
  const [dismissed] = await db.select().from(schema.recommendations).where(eq(schema.recommendations.id, recs[0]!.id))

  await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  if (recs.length < 1 || briefs.length !== recs.length || recs2.length !== recs.length || dismissed!.status !== 'dismissed') {
    console.error('FAIL')
    process.exit(1)
  }
  console.log('OK: organic-to-paid (recs+creative briefs, idempotent, dismiss persists)')
}
main().catch((e) => { console.error(e); process.exit(1) })
