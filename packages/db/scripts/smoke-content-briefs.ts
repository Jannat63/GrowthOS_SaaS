import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/index.js';

async function main() {
  const ws = 'smoke-briefs-ws';
  await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws));

  const [row] = await db
    .insert(schema.contentBriefs)
    .values({
      workspaceId: ws,
      keyword: 'office chair',
      source: 'google_ads_search_term',
      brief: { recommendedH1: 'Office Chair Guide' },
    })
    .returning();
  if (!row?.id || row.status !== 'draft') throw new Error('insert failed');

  const rows = await db.select().from(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws));
  if (rows.length !== 1) throw new Error(`expected 1 row, got ${rows.length}`);

  await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws));
  console.log('OK: content_briefs insert/read/delete');
}
main().catch((e) => { console.error(e); process.exit(1); });
