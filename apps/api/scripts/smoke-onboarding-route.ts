// Usage: pnpm --filter @growthos/api exec tsx scripts/smoke-onboarding-route.ts <sessionCookie> <workspaceId>
// Verifies: POST onboarding -> 202 + jobId; POST again -> SAME jobId (idempotent); GET onboarding -> profile set.
import { buildApp } from '../src/app.js'

const [cookie, workspaceId] = process.argv.slice(2)
if (!cookie || !workspaceId) throw new Error('args: <sessionCookie> <workspaceId>')

const app = buildApp()
const url = `/api/v1/workspaces/${workspaceId}/onboarding`
const payload = { websiteUrl: 'https://example.com', businessCategory: 'saas', monthlyAdBudget: 3000 }

const first = await app.inject({ method: 'POST', url, headers: { cookie }, payload })
console.log('POST #1:', first.statusCode, first.body)
if (first.statusCode !== 202) throw new Error('expected 202')
const jobId1 = JSON.parse(first.body).jobId

const second = await app.inject({ method: 'POST', url, headers: { cookie }, payload })
console.log('POST #2:', second.statusCode, second.body)
if (JSON.parse(second.body).jobId !== jobId1) throw new Error('expected idempotent (same jobId)')

const get = await app.inject({ method: 'GET', url, headers: { cookie } })
console.log('GET onboarding:', get.statusCode, get.body)
if (get.statusCode !== 200 || JSON.parse(get.body).profile.businessCategory !== 'saas') {
  throw new Error('expected profile.businessCategory=saas')
}

await app.close()
console.log('OK: onboarding routes (persist + idempotent enqueue + status)')
