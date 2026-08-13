import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';
import { createRetryingFetch } from './retry.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — cannot create the Neon client.');
}

// The Neon HTTP driver makes exactly one fetch per query and never retries, so a momentary blip
// between here and Neon surfaces as a hard `NeonDbError: Error connecting to database: fetch
// failed`. `fetchFunction` is the driver's own hook for replacing that transport, and it is global
// by design — set once, here, so nothing downstream has to remember to opt in.
//
// Retries are bounded and asymmetric between reads and writes; retry.ts explains why. Set
// DB_MAX_RETRIES=0 to turn it off.
const maxRetries = Number(process.env.DB_MAX_RETRIES ?? 2);
if (Number.isFinite(maxRetries) && maxRetries > 0) {
  neonConfig.fetchFunction = createRetryingFetch(fetch, {
    maxRetries,
    onRetry: ({ attempt, delayMs, reason }) => {
      // console, not pino: packages/db is consumed by the API, the worker's tooling, and standalone
      // scripts, and it must not drag a logger dependency across all of them. A retry is also the
      // one thing here worth seeing unconditionally — silent retries turn a degrading database into
      // an invisible latency problem.
      console.warn(`[db] retry ${attempt}/${maxRetries} in ${delayMs}ms — ${reason}`);
    },
  });
}

// Neon HTTP client — one query per request, ideal for serverless / short-lived handlers.
const sql = neon(connectionString);

export const db = drizzle({ client: sql, schema });

export type DB = typeof db;
