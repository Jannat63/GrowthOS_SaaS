// End-to-end onboarding pipeline: enqueue onboarding_analyze -> Redis -> worker -> Neon.
// Run with the worker (uvicorn) up. Usage: pnpm --filter @growthos/api exec tsx scripts/e2e-onboarding.ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { enqueue } from '../src/jobs/enqueue.js'
import { closeRedis } from '../src/jobs/client.js'

const ws = 'e2e-onb-ws'

async function main() {
  // Fresh workspace row so the handler's onboarding_step update is observable.
  await db.delete(schema.onboardingAnalyses).where(eq(schema.onboardingAnalyses.workspaceId, ws))
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws))
  await db.insert(schema.workspaces).values({ id: ws, name: 'E2E', slug: ws, createdAt: new Date() })

  const { jobId } = await enqueue({
    workspaceId: ws,
    type: 'onboarding_analyze',
    payload: { websiteUrl: 'https://example.com', businessCategory: 'saas', monthlyAdBudget: 3000 },
  })
  console.log('enqueued onboarding_analyze:', jobId)

  let strategy: unknown = null
  let step: string | null = null
  for (let i = 0; i < 40; i++) {
    const [an] = await db.select().from(schema.onboardingAnalyses).where(eq(schema.onboardingAnalyses.workspaceId, ws))
    const [row] = await db.select({ step: schema.workspaces.onboardingStep }).from(schema.workspaces).where(eq(schema.workspaces.id, ws))
    strategy = an?.strategy ?? null
    step = row?.step ?? null
    if (strategy) break
    await new Promise((r) => setTimeout(r, 500))
  }
  console.log('strategy present:', Boolean(strategy), '| onboarding_step:', step)

  await db.delete(schema.onboardingAnalyses).where(eq(schema.onboardingAnalyses.workspaceId, ws))
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws))
  await closeRedis()

  if (!strategy || step !== 'review') {
    console.error('FAIL: expected strategy persisted and onboarding_step=review')
    process.exit(1)
  }
  console.log('OK: onboarding pipeline (enqueue -> redis -> worker -> strategy in Neon, step=review)')
}
main().catch((e) => { console.error(e); process.exit(1) })
