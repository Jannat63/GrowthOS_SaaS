import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/index.js';

async function main() {
  const ws = 'smoke-onb-ws';
  await db.delete(schema.onboardingAnalyses).where(eq(schema.onboardingAnalyses.workspaceId, ws));

  // Insert, then upsert the same workspace to prove the unique constraint + idempotency.
  await db.insert(schema.onboardingAnalyses).values({ workspaceId: ws, strategy: { summary: 'a' } });
  await db
    .insert(schema.onboardingAnalyses)
    .values({ workspaceId: ws, strategy: { summary: 'b' } })
    .onConflictDoUpdate({
      target: schema.onboardingAnalyses.workspaceId,
      set: { strategy: { summary: 'b' } },
    });

  const rows = await db
    .select()
    .from(schema.onboardingAnalyses)
    .where(eq(schema.onboardingAnalyses.workspaceId, ws));
  if (rows.length !== 1) throw new Error(`expected 1 row, got ${rows.length}`);
  if ((rows[0]!.strategy as { summary: string }).summary !== 'b') throw new Error('upsert did not overwrite');

  await db.delete(schema.onboardingAnalyses).where(eq(schema.onboardingAnalyses.workspaceId, ws));
  console.log('OK: onboarding_analyses upsert/read/delete');
}
main().catch((e) => { console.error(e); process.exit(1); });
