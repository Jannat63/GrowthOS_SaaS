/**
 * DANGER: drops and recreates the `public` schema (wipes ALL tables/data).
 * Only for early dev on a throwaway Neon DB. Run: pnpm --filter @growthos/db db:reset
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  const sql = neon(url);
  await sql('DROP SCHEMA public CASCADE');
  await sql('CREATE SCHEMA public');
  console.log('public schema dropped + recreated (all tables wiped) ✅');
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
