import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/index.js';

async function main() {
  const [row] = await db
    .insert(schema.backgroundJobs)
    .values({ workspaceId: 'smoke-ws', type: 'echo' })
    .returning();
  if (!row?.id || row.status !== 'queued') throw new Error('insert failed');

  const [read] = await db
    .select()
    .from(schema.backgroundJobs)
    .where(eq(schema.backgroundJobs.id, row.id));
  if (read.type !== 'echo') throw new Error('read failed');

  await db.delete(schema.backgroundJobs).where(eq(schema.backgroundJobs.id, row.id));
  console.log('OK: background_jobs insert/read/delete');
}
// Let the process exit naturally on success (Neon HTTP client is stateless — no socket to close).
// A forced process.exit(0) crashes libuv on Windows; only force-exit on failure.
main().catch((e) => { console.error(e); process.exit(1); });
