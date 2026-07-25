// End-to-end: TS enqueue() -> Redis -> Python worker -> Neon. Run with the worker (uvicorn) up.
// Usage: pnpm --filter @growthos/api exec tsx scripts/e2e-echo.ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { enqueue } from '../src/jobs/enqueue.js'
import { closeRedis } from '../src/jobs/client.js'

const { jobId } = await enqueue({ workspaceId: 'e2e-ws', type: 'echo', payload: { hello: 'e2e' } })
console.log('enqueued:', jobId)

let status = 'queued'
let result: unknown = null
for (let i = 0; i < 40; i++) {
  const [row] = await db.select().from(schema.backgroundJobs).where(eq(schema.backgroundJobs.id, jobId))
  status = row!.status
  result = row!.result
  if (status === 'complete' || status === 'failed') break
  await new Promise((r) => setTimeout(r, 500))
}
console.log('final status:', status, '| result:', JSON.stringify(result))

await db.delete(schema.backgroundJobs).where(eq(schema.backgroundJobs.id, jobId))
await closeRedis()

if (status !== 'complete' || JSON.stringify(result) !== JSON.stringify({ echoed: { hello: 'e2e' } })) {
  console.error('FAIL: expected complete with echoed payload')
  process.exit(1)
}
console.log('OK: end-to-end echo pipeline (enqueue -> redis -> worker -> neon)')
