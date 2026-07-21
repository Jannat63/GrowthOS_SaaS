// Usage: pnpm --filter @growthos/api exec tsx scripts/smoke-jobs-route.ts <sessionCookie> <workspaceId>
// Verifies: enqueue -> GET jobs/:id returns 'queued'; unknown job -> WORKSPACE_NOT_FOUND (404).
import { buildApp } from '../src/app.js'
import { enqueue } from '../src/jobs/enqueue.js'

const [cookie, workspaceId] = process.argv.slice(2)
if (!cookie || !workspaceId) throw new Error('args: <sessionCookie> <workspaceId>')

const app = buildApp()
const { jobId, statusUrl } = await enqueue({ workspaceId, type: 'echo', payload: { hello: 'world' } })
console.log('enqueued job:', jobId)

const ok = await app.inject({ method: 'GET', url: statusUrl, headers: { cookie } })
console.log('status route:', ok.statusCode, ok.body)
if (ok.statusCode !== 200 || JSON.parse(ok.body).status !== 'queued') throw new Error('expected 200 queued')

const missing = await app.inject({
  method: 'GET',
  url: `/api/v1/workspaces/${workspaceId}/jobs/00000000-0000-0000-0000-000000000000`,
  headers: { cookie },
})
console.log('missing job:', missing.statusCode, missing.body)
if (missing.statusCode !== 404) throw new Error('expected 404')

await app.close()
console.log('OK: jobs route')
