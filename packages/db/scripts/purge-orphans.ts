/**
 * Deletes rows whose workspace no longer exists.
 *
 * Until the workspace_id foreign keys landed, every workspace-scoped table was a plain text column
 * with nothing enforcing that the workspace was real. Nothing in the product deletes a workspace —
 * but the API test suite does, in teardown, and `apps/api/vitest.config.ts` points it at the same
 * Neon database as development. Teardown removed the workspace row and a hand-maintained subset of
 * its children, so the rest were stranded: 747 rows across 9 tables against 15 live workspaces,
 * which the admin overview then counted as real customers.
 *
 * Run this once before applying the FK migration — Postgres validates a new constraint against
 * existing rows, so the migration fails outright while orphans remain. Afterwards the cascade
 * makes it unnecessary, and it should report zero. It is kept because it is also the diagnostic:
 * a non-zero count later means something is writing rows for workspaces that do not exist.
 *
 * Run: pnpm --filter @growthos/db purge-orphans          # report only
 *      pnpm --filter @growthos/db purge-orphans --apply  # actually delete
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../src/client.js';

type CountRow = { total: number; orphan: number };

async function main() {
  const apply = process.argv.includes('--apply');

  const tablesResult: any = await db.execute(sql`
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'workspace_id'
    order by table_name
  `);
  const tables: string[] = (tablesResult.rows ?? tablesResult).map(
    (r: { table_name: string }) => r.table_name,
  );

  if (tables.length === 0) {
    console.log('No workspace-scoped tables found. Nothing to do.');
    return;
  }

  console.log(apply ? 'Purging orphaned rows…\n' : 'Dry run — pass --apply to delete.\n');
  console.log('table'.padEnd(28) + 'rows'.padStart(8) + 'orphaned'.padStart(10));
  console.log('-'.repeat(46));

  let totalOrphans = 0;
  for (const table of tables) {
    // Table names come from information_schema, never from user input, and are quoted.
    const countResult: any = await db.execute(
      sql.raw(`
        select count(*)::int as total,
               count(*) filter (where w.id is null)::int as orphan
        from "${table}" x
        left join workspaces w on w.id = x.workspace_id
      `),
    );
    const { total, orphan } = ((countResult.rows ?? countResult)[0] ?? {
      total: 0,
      orphan: 0,
    }) as CountRow;

    if (orphan > 0 && apply) {
      await db.execute(
        sql.raw(
          `delete from "${table}" where workspace_id not in (select id from workspaces)`,
        ),
      );
    }

    totalOrphans += orphan;
    const flag = orphan > 0 ? (apply ? '  deleted' : '  <-- orphaned') : '';
    console.log(table.padEnd(28) + String(total).padStart(8) + String(orphan).padStart(10) + flag);
  }

  console.log('-'.repeat(46));
  if (totalOrphans === 0) {
    console.log('No orphaned rows. Nothing to purge.');
  } else if (apply) {
    console.log(`Deleted ${totalOrphans} orphaned rows.`);
  } else {
    console.log(`${totalOrphans} orphaned rows would be deleted. Re-run with --apply.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to purge orphaned rows:', err);
    process.exit(1);
  });
