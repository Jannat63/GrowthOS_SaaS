import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
import { createRetryingFetch } from './retry.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — cannot create the database client.');
}

/**
 * Two supported drivers, chosen by DATABASE_DRIVER — same `db`/`schema` export shape either way,
 * so nothing outside this file needs to know which one is active.
 *
 *  - 'neon' (default — unset behaves identically to before this file supported a second driver).
 *    drizzle-orm/neon-http, speaking Neon's SQL-over-HTTP protocol. This is what production,
 *    staging, and every pre-existing integration test use, completely unchanged below.
 *  - 'node-postgres'. A plain `pg` Pool, for Local Demo Mode's Docker Postgres (see
 *    docker-compose.local.yml / scripts/local/). Neon's HTTP driver cannot speak to an ordinary
 *    Postgres server — the wire protocol is different, not just the connection string — so Local
 *    Demo Mode genuinely needs a second driver, not just a different DATABASE_URL.
 *    docs/AUDIT-2026-08-13-codebase.md documents a prior attempt at exactly this that got reverted
 *    over a pnpm peer-resolution duplication of `drizzle-orm` — that duplication only occurred
 *    because `pg` ended up in `apps/api` too; scoped to this package alone (nothing outside
 *    `packages/db` imports `drizzle-orm` directly), install and build stay clean.
 *
 * The `DB` type is deliberately fixed to `NeonHttpDatabase`, not a union of both drivers' real
 * types: drizzle-orm's `PgDatabase<THKT, TSchema>` generic makes each driver's type nominally
 * distinct even for identical schemas (see the audit doc), so a union collapses overloaded builder
 * methods like `.returning()` to "expects 0 arguments" across the whole API package. Both drivers
 * implement the same query-builder surface for every operation this codebase runs — select,
 * insert, update, delete, joins, `.returning()`, `$count` — so asserting the pg-backed instance to
 * this one shape is safe, and it means every existing consumer's code is completely unchanged. The
 * one real behavioral difference is transactions (node-postgres supports `db.transaction()`;
 * neon-http doesn't) — moot today since nothing in this codebase calls it yet (see invitations.ts).
 */
const driver = process.env.DATABASE_DRIVER === 'node-postgres' ? 'node-postgres' : 'neon';

export type DB = NeonHttpDatabase<typeof schema>;

function createNeonDb(): DB {
  // The Neon HTTP driver makes exactly one fetch per query and never retries, so a momentary blip
  // between here and Neon surfaces as a hard `NeonDbError: Error connecting to database: fetch
  // failed`. `fetchFunction` is the driver's own hook for replacing that transport, and it is
  // global by design — set once, here, so nothing downstream has to remember to opt in.
  //
  // Retries are bounded and asymmetric between reads and writes; retry.ts explains why. Set
  // DB_MAX_RETRIES=0 to turn it off.
  const maxRetries = Number(process.env.DB_MAX_RETRIES ?? 2);
  if (Number.isFinite(maxRetries) && maxRetries > 0) {
    neonConfig.fetchFunction = createRetryingFetch(fetch, {
      maxRetries,
      onRetry: ({ attempt, delayMs, reason }) => {
        // console, not pino: packages/db is consumed by the API, the worker's tooling, and
        // standalone scripts, and it must not drag a logger dependency across all of them. A retry
        // is also the one thing here worth seeing unconditionally — silent retries turn a
        // degrading database into an invisible latency problem.
        console.warn(`[db] retry ${attempt}/${maxRetries} in ${delayMs}ms — ${reason}`);
      },
    });
  }

  // Neon HTTP client — one query per request, ideal for serverless / short-lived handlers.
  const sql = neon(connectionString!);
  return drizzleNeon({ client: sql, schema });
}

function createNodePostgresDb(): DB {
  // A real connection pool, not one-fetch-per-query — appropriate for a long-lived local
  // Postgres container rather than a serverless edge function talking to Neon.
  const pool = new Pool({ connectionString });
  activePool = pool;
  return drizzlePg({ client: pool, schema }) as unknown as DB;
}

// Set only for the node-postgres path — see closeDb() below.
let activePool: Pool | null = null;

export const db: DB = driver === 'node-postgres' ? createNodePostgresDb() : createNeonDb();

/**
 * Closes the underlying connection, if there is one to close. Required for any one-shot script
 * (a seed, a smoke test, a reset) to exit on its own under `DATABASE_DRIVER=node-postgres`: unlike
 * the Neon HTTP client (stateless — one fetch per query, nothing to hold open), a `pg.Pool` keeps
 * idle sockets open with their own keep-alive timers, which keeps Node's event loop alive
 * indefinitely. A long-running server (the API itself) should *not* call this — it wants the pool
 * to stay open for the process's whole lifetime — which is why this isn't wired into Fastify's
 * own shutdown hooks and has to be called explicitly by scripts that are meant to finish and exit.
 * No-ops for the Neon driver, so a script can call this unconditionally regardless of which driver
 * is active rather than branching on `DATABASE_DRIVER` itself.
 */
export async function closeDb(): Promise<void> {
  if (activePool) await activePool.end();
}
