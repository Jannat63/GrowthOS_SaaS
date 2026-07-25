import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../src/index.js';

// Stub connections so the UI shows "connected" channels without live OAuth (M2 rule).
// Real OAuth + encrypted tokens land in M3 P3.0.
// Usage: tsx scripts/seed-connections.ts [workspaceId]  (defaults to the demo workspace)
const DEMO_WORKSPACE = '00000000-0000-0000-0000-0000000000aa';
const workspaceId = process.argv[2] ?? DEMO_WORKSPACE;

const stubs = [
  { platform: 'google_ads', accountId: 'stub-g-ads', accountName: 'Demo Google Ads' },
  { platform: 'meta', accountId: 'stub-meta', accountName: 'Demo Meta Ads' },
  { platform: 'google_search_console', accountId: 'stub-gsc', accountName: 'Demo GSC' },
];

async function main() {
  for (const s of stubs) {
    const [existing] = await db
      .select({ id: schema.platformConnections.id })
      .from(schema.platformConnections)
      .where(
        and(
          eq(schema.platformConnections.workspaceId, workspaceId),
          eq(schema.platformConnections.platform, s.platform),
          eq(schema.platformConnections.accountId, s.accountId),
        ),
      );
    if (existing) continue;
    await db.insert(schema.platformConnections).values({
      workspaceId,
      platform: s.platform,
      accountId: s.accountId,
      accountName: s.accountName,
      accessToken: 'STUB_NOT_A_REAL_TOKEN',
      isActive: true,
    });
  }

  const rows = await db
    .select()
    .from(schema.platformConnections)
    .where(eq(schema.platformConnections.workspaceId, workspaceId));
  console.log(`OK: ${rows.length} platform_connections for workspace ${workspaceId}`);
}

// Let the process exit naturally (Neon HTTP client is stateless); force-exit only on failure.
main().catch((e) => { console.error(e); process.exit(1); });
