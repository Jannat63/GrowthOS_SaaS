import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/index.js';

async function main() {
  const ws = 'smoke-recs-ws';
  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws));

  const [row] = await db
    .insert(schema.recommendations)
    .values({
      workspaceId: ws,
      type: 'cross_channel',
      sourceChannel: 'seo',
      targetChannel: 'google_ads',
      title: 'Test',
      body: 'Body',
      impactScore: 90,
      effortScore: 40,
      urgencyScore: 75,
      compositeScore: 77,
    })
    .returning();
  if (!row?.id || row.status !== 'pending') throw new Error('insert failed');

  const rows = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws));
  if (rows.length !== 1) throw new Error(`expected 1 row, got ${rows.length}`);

  await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws));
  console.log('OK: recommendations insert/read/delete');
}
main().catch((e) => { console.error(e); process.exit(1); });
