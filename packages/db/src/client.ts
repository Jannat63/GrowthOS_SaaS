import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — cannot create the Neon client.');
}

// Neon HTTP client — one query per request, ideal for serverless / short-lived handlers.
const sql = neon(connectionString);

export const db = drizzle({ client: sql, schema });

export type DB = typeof db;
