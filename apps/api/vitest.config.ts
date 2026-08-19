import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

// Load apps/api/.env so tests can reach Neon (DATABASE_URL); REDIS_URL falls back to localhost.
config({ path: '.env' })

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Retry harder here than in production. The suite drives far more concurrent load at Neon than
    // a real user ever does, and the failure it provokes (UND_ERR_CONNECT_TIMEOUT — free-tier
    // compute refusing new connections) is transient by definition. Four retries back off
    // 100/300/900/2700ms, so the worst case adds ~4s and only to a query that was going to fail
    // outright. process.env is spread last so an explicit DB_MAX_RETRIES still wins.
    env: { DB_MAX_RETRIES: '4', ...process.env },

    /**
     * Cap concurrency instead of letting vitest use every core.
     *
     * Unbounded, this suite compresses ~300s of test work into ~50s of wall clock — six-plus workers
     * each running long chains of queries against one free-tier Neon instance, which is what pushes
     * it into refusing connections. The opposite extreme was measured too: `fileParallelism: false`
     * took the run from 75s to 256s. Four workers keeps most of the parallel speedup while staying
     * under what the database will actually serve.
     */
    maxWorkers: 4,
    minWorkers: 1,

    /**
     * Most of this suite is integration tests against a remote Neon database over HTTP, so these
     * timeouts are set against measured latency rather than left at vitest's defaults.
     *
     * The default `testTimeout` is 5s. This project has measured a single `resolveApiKey` query at
     * 17s and a trivial `listActiveWorkspaceIds` at 5.7s against free-tier Neon. A 5s budget for a
     * test that makes several such round trips is below the floor — the test aborts mid-setup, and
     * because setup state is shared within a file, everything after it fails on the wreckage
     * instead of on its own merits. That is the same mistake as the 4s web-client timeout in
     * docs/AUDIT-2026-08-13-codebase.md #3, in a different place.
     *
     * This was one of two causes of the long-standing flakiness in this suite. The other was that
     * the Neon HTTP driver issues exactly one fetch per query and never retries, so any transient
     * blip surfaced as a hard `Error connecting to database: fetch failed` — fixed in
     * packages/db/src/retry.ts, which is where the real diagnosis is written up.
     *
     * `fileParallelism: false` was tried for this and REVERTED: it took the run from 75s to 256s
     * and still produced eight failures, which is what ruled out connection concurrency as the
     * cause and pointed at the two above.
     *
     * 60s is set against the measured worst case, not guessed. The heaviest files here
     * (recommendations-all, ws) run ~15s alone and drift past 30s when three other workers are
     * competing for the same free-tier instance. The cost of the higher ceiling is that a genuinely
     * hung test takes a minute to report; the cost of the lower one was a green suite reporting
     * failures that weren't real, which is far worse.
     */
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
