// Local Demo Mode seed — `pnpm setup:local` / `pnpm local` run this automatically
// (scripts/local/setup.mjs). Direct use: pnpm --filter @growthos/api exec tsx scripts/seed-demo.ts
//
// Creates one demo account and pre-warms its dashboards. Safe to re-run any time: the user/
// workspace lookups are idempotent, and every domain call below is one of this codebase's own
// existing "seed if empty" functions (ensureAdPerformanceSeed, ensureKeywordRankingsSeed, etc. —
// the same ones the real dashboard routes call lazily on first view). This script exists only to
// call them once up front, so the very first page load is already populated instead of showing a
// brief empty state while the lazy seed runs. Nothing here is demo-only fixture logic of its own.
//
// Deliberately NOT seeded: automation rules. automation/rules.ts's own doc comment explains why —
// "automation is something you turn on deliberately, not something you discover is already
// running" — and that reasoning applies just as much to a demo workspace as a real one. Also not
// seeded: notifications — there's no such table in this schema yet.
import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { db, closeDb, schema } from '@growthos/db'
import { buildApp } from '../src/app.js'
import { getGrowthHub } from '../src/growth-hub.js'
import { getKeywordRankings, getOrganicTraffic } from '../src/seo.js'
import { ensurePaidToOrganic } from '../src/search-terms.js'
import { ensureOrganicToPaid } from '../src/organic-to-paid.js'
import { ensureFatigueAlerts } from '../src/fatigue.js'
import { getWeeklyReport } from '../src/intelligence.js'

const DEMO_EMAIL = 'demo@growthos.local'
const DEMO_PASSWORD = 'DemoPass123!'
const DEMO_NAME = 'Demo User'
const DEMO_WORKSPACE_SLUG = 'demo'
const DEMO_WORKSPACE_NAME = 'Demo Workspace'

const STUB_CONNECTIONS = [
  { platform: 'google_ads', accountId: 'demo-g-ads', accountName: 'Demo Google Ads' },
  { platform: 'meta', accountId: 'demo-meta', accountName: 'Demo Meta Ads' },
  { platform: 'google_search_console', accountId: 'demo-gsc', accountName: 'Demo Search Console' },
]

function extractCookie(setCookie: string | string[] | undefined): string {
  const cookie = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : setCookie
  if (!cookie) throw new Error('sign-up/sign-in did not return a session cookie')
  return cookie
}

async function main() {
  const app = buildApp()

  console.log(`[seed-demo] ensuring ${DEMO_EMAIL} exists...`)
  const [existingUser] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, DEMO_EMAIL))

  let cookie: string
  if (existingUser) {
    const signIn = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      headers: { 'content-type': 'application/json' },
    })
    if (signIn.statusCode !== 200) {
      throw new Error(
        `demo user exists but sign-in failed (HTTP ${signIn.statusCode}) — delete the user row and re-run, or the seed password no longer matches what's stored.`,
      )
    }
    cookie = extractCookie(signIn.headers['set-cookie'])
    console.log('[seed-demo] demo user already existed — signed in.')
  } else {
    const signUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME },
      headers: { 'content-type': 'application/json' },
    })
    if (signUp.statusCode !== 200) {
      throw new Error(`could not create the demo user (HTTP ${signUp.statusCode}): ${signUp.body}`)
    }
    cookie = extractCookie(signUp.headers['set-cookie'])
    console.log('[seed-demo] demo user created.')
  }

  console.log(`[seed-demo] ensuring workspace "${DEMO_WORKSPACE_SLUG}" exists...`)
  const [existingWorkspace] = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.slug, DEMO_WORKSPACE_SLUG))

  let workspaceId: string
  if (existingWorkspace) {
    workspaceId = existingWorkspace.id
    console.log('[seed-demo] demo workspace already existed.')
  } else {
    const createWs = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: DEMO_WORKSPACE_NAME, slug: DEMO_WORKSPACE_SLUG },
      headers: { cookie, 'content-type': 'application/json' },
    })
    if (createWs.statusCode !== 201) {
      throw new Error(`could not create the demo workspace (HTTP ${createWs.statusCode}): ${createWs.body}`)
    }
    workspaceId = JSON.parse(createWs.body).workspace.id
    console.log('[seed-demo] demo workspace created.')
  }

  // Skip onboarding and put the workspace on the Growth plan directly, rather than racing
  // POST /workspaces's fire-and-forget startTrial() call (see routes/invitations.test.ts for the
  // same race, handled there by polling instead — a direct update is simpler and deterministic
  // for a one-shot seed script).
  await db
    .update(schema.workspaces)
    .set({ onboardingComplete: true, onboardingStep: 'complete', plan: 'growth' })
    .where(eq(schema.workspaces.id, workspaceId))
  console.log('[seed-demo] onboarding marked complete, plan set to growth.')

  console.log('[seed-demo] seeding platform connections...')
  for (const s of STUB_CONNECTIONS) {
    const [existing] = await db
      .select({ id: schema.platformConnections.id })
      .from(schema.platformConnections)
      .where(
        and(
          eq(schema.platformConnections.workspaceId, workspaceId),
          eq(schema.platformConnections.platform, s.platform),
          eq(schema.platformConnections.accountId, s.accountId),
        ),
      )
    if (existing) continue
    await db.insert(schema.platformConnections).values({
      workspaceId,
      platform: s.platform,
      accountId: s.accountId,
      accountName: s.accountName,
      accessToken: 'DEMO_NOT_A_REAL_TOKEN',
      isActive: true,
    })
  }

  // Every call below is one of this codebase's own existing "seed if empty" functions — see the
  // file doc comment above. Order matters a little: growth-hub / SEO / cross-channel seeds go
  // first since intelligence.ts's weekly report and the recommendation generators read from them.
  console.log('[seed-demo] warming Growth Hub (ad performance + organic traffic)...')
  await getGrowthHub(workspaceId)

  console.log('[seed-demo] warming SEO (keyword rankings + organic traffic)...')
  await getKeywordRankings(workspaceId)
  await getOrganicTraffic(workspaceId)

  console.log('[seed-demo] warming cross-channel views (paid↔organic)...')
  await ensurePaidToOrganic(workspaceId)
  await ensureOrganicToPaid(workspaceId)

  console.log('[seed-demo] warming creative fatigue + alerts...')
  await ensureFatigueAlerts(workspaceId)

  console.log('[seed-demo] warming the weekly intelligence report + recommendations...')
  await getWeeklyReport(workspaceId)

  await app.close()

  console.log('\n[seed-demo] done.')
  console.log(`  Workspace: ${DEMO_WORKSPACE_NAME} (${DEMO_WORKSPACE_SLUG}) — plan: growth`)
  console.log(`  Login:     ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error('[seed-demo] FAILED:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    // Under DATABASE_DRIVER=node-postgres, `db` holds a real connection pool with idle sockets
    // that keep Node's event loop alive — app.close() tears down Fastify, not this pool, since
    // @growthos/db's `db` is a module-level singleton the API imports directly, not something
    // registered with Fastify's own lifecycle. No-ops under the default Neon driver. Without this,
    // this script (and pnpm local, which runs it) hangs forever after printing its final summary.
    await closeDb()
    process.exit(process.exitCode ?? 0)
  })
