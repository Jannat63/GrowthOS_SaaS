/**
 * P1.3 verification: /api/v1 auth/me, workspace create, and the workspace-member guard.
 * Run (env sourced from apps/api/.env by the caller): tsx scripts/verify-v1.ts
 */
import { buildApp } from '../src/app.js'

function cookiesFrom(setCookie: string | string[] | undefined): string {
  if (!setCookie) return ''
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie]
  return arr.map((c) => c.split(';')[0]).join('; ')
}

async function main() {
  const app = buildApp()
  await app.ready()
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000'
  const stamp = Date.now()

  async function signup(tag: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json', origin },
      payload: { name: `V1 ${tag}`, email: `v1_${tag}_${stamp}@growthos.test`, password: 'Sup3rSecret!pw' },
    })
    return cookiesFrom(res.headers['set-cookie'])
  }

  const results: Record<string, boolean> = {}

  // User A signs up and creates a workspace.
  const cookieA = await signup('a')
  const org = await app.inject({
    method: 'POST',
    url: '/api/auth/organization/create',
    headers: { 'content-type': 'application/json', cookie: cookieA, origin },
    payload: { name: 'V1 Workspace', slug: `v1-ws-${stamp}` },
  })
  const workspaceId = org.json().id as string

  // /auth/me returns profile + membership.
  const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: cookieA } })
  const meBody = me.json()
  results['GET /auth/me → 200 + membership(owner)'] =
    me.statusCode === 200 && meBody.memberships?.[0]?.role === 'owner'
  console.log('auth/me:', me.statusCode, JSON.stringify(meBody.memberships?.[0]?.workspace?.slug))

  // Member can read connections.
  const connA = await app.inject({
    method: 'GET',
    url: `/api/v1/workspaces/${workspaceId}/connections`,
    headers: { cookie: cookieA },
  })
  results['member GET connections → 200'] = connA.statusCode === 200
  console.log('member connections:', connA.statusCode, connA.body)

  // Non-member (User B) is forbidden.
  const cookieB = await signup('b')
  const connB = await app.inject({
    method: 'GET',
    url: `/api/v1/workspaces/${workspaceId}/connections`,
    headers: { cookie: cookieB },
  })
  results['non-member GET connections → 403 FORBIDDEN'] =
    connB.statusCode === 403 && connB.json().error?.code === 'FORBIDDEN'
  console.log('non-member connections:', connB.statusCode, connB.body)

  // Unauthenticated is rejected.
  const anon = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
  results['unauth GET /auth/me → 401 UNAUTHORIZED'] =
    anon.statusCode === 401 && anon.json().error?.code === 'UNAUTHORIZED'
  console.log('anon auth/me:', anon.statusCode, anon.body)

  await app.close()

  console.log('\nResults:')
  let ok = true
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${v ? '✅' : '❌'} ${k}`)
    ok = ok && v
  }
  console.log(ok ? '\nP1.3 verification PASSED ✅' : '\nP1.3 verification FAILED ❌')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error('verify-v1 failed:', err)
  process.exit(1)
})
