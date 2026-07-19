/**
 * P1.1 verification: insert a workspace into Neon and read it back, then clean up.
 * Run: pnpm --filter @growthos/db exec tsx scripts/smoke.ts
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/client.js';
import { workspaces } from '../src/schema/tenancy.js';

async function main() {
  const slug = 'smoke-test-workspace';

  // clean any prior run
  await db.delete(workspaces).where(eq(workspaces.slug, slug));

  const [inserted] = await db
    .insert(workspaces)
    .values({ name: 'Smoke Test Workspace', slug })
    .returning();

  if (!inserted) throw new Error('Insert returned no row.');
  console.log('Inserted:', { id: inserted.id, name: inserted.name, plan: inserted.plan });

  const rows = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
  console.log('Read back count:', rows.length);

  await db.delete(workspaces).where(eq(workspaces.slug, slug));
  console.log('Cleaned up. Neon read/write OK ✅');
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
