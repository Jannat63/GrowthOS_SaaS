// E2E (data layer): generate-if-empty recommendations from the canonical engine, persisted to Neon.
// No worker needed — scoring is synchronous TS. Usage: pnpm --filter @growthos/api exec tsx scripts/e2e-recommendations.ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureRecommendations } from '../src/recommendations.js'

const ws = 'e2e-recs-ws'

async function main() {
  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  const first = await ensureRecommendations(ws)
  console.log('generated:', first.length, '| top composite:', first[0]?.compositeScore)

  const second = await ensureRecommendations(ws)
  const ordered = second.every((r, i) => i === 0 || second[i - 1]!.compositeScore >= r.compositeScore)
  console.log('second call count:', second.length, '| ordered desc:', ordered)

  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

  if (first.length === 0 || second.length !== first.length || !ordered) {
    console.error('FAIL: expected non-empty, idempotent, ordered recommendations')
    process.exit(1)
  }
  console.log('OK: recommendations generate-if-empty (persisted, idempotent, ordered by composite)')
}
main().catch((e) => { console.error(e); process.exit(1) })
