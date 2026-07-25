/**
 * Apply generated Drizzle migrations to Neon (non-interactive).
 * Run: pnpm --filter @growthos/db db:migrate
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  const sql = neon(url);
  const db = drizzle({ client: sql });

  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied ✅');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
