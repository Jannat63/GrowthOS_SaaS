import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

// Load apps/api/.env so tests can reach Neon (DATABASE_URL); REDIS_URL falls back to localhost.
config({ path: '.env' })

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: { ...process.env },
    /**
     * KNOWN ISSUE — this suite is not reliable, and the cause is not this config.
     *
     * Most of it is integration tests against a remote Neon database over HTTP. Across five full
     * runs it failed differently every time — four different sets of files, every one of which
     * passed when run on its own. The real error is `Error connecting to database: fetch failed`,
     * never a wrong assertion; a cascade follows, because a setup step that fails silently leaves
     * the rest of that file asserting against the wrong state.
     *
     * `fileParallelism: false` was tried and REVERTED: it took the run from 75s to 256s and still
     * produced eight failures. So the bottleneck is not connection concurrency — it is latency and
     * intermittent unavailability of a free-tier serverless database being asked to serve ~150
     * integration tests. A single `resolveApiKey` call was measured at 17 seconds during one run.
     *
     * The real fix is to stop testing against a remote shared database: run Postgres locally in
     * docker-compose alongside ClickHouse and Redis, migrate it on setup, and point the suite at it.
     * That makes the tests hermetic and fast. Until then, treat a full-suite failure as unproven —
     * re-run the failing file on its own before believing it.
     */
  },
})
