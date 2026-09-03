/**
 * Grants (or revokes) a platform admin role for the Super Admin panel. This is the ONLY way to
 * set platformRole — it's deliberately excluded from Better Auth's additionalFields `input`
 * (see apps/api/src/auth.ts), so nobody can set it via a signup form, a profile edit, or any API
 * call. Someone with direct database access runs this once per admin they want to create.
 *
 * Run: pnpm --filter @growthos/db grant-admin <email> <support_agent|super_admin|none>
 * Example: pnpm --filter @growthos/db grant-admin ahsan@example.com super_admin
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/client.js';
import { user } from '../src/schema/auth.js';

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role) {
    console.error('Usage: pnpm --filter @growthos/db grant-admin <email> <support_agent|super_admin|none>');
    process.exit(1);
  }
  if (!['support_agent', 'super_admin', 'none'].includes(role)) {
    console.error(`Invalid role "${role}" — must be support_agent, super_admin, or none (to revoke).`);
    process.exit(1);
  }

  const platformRole = role === 'none' ? null : role;
  const [updated] = await db
    .update(user)
    .set({ platformRole })
    .where(eq(user.email, email))
    .returning({ id: user.id, email: user.email, platformRole: user.platformRole });

  if (!updated) {
    console.error(`No user found with email "${email}". They need to have signed up first.`);
    process.exit(1);
  }

  console.log(
    platformRole
      ? `✅ ${updated.email} is now a ${platformRole} — they can access /admin after their next sign-in.`
      : `✅ ${updated.email}'s platform admin access has been revoked.`,
  );
}

main().catch((err) => {
  console.error('Failed to update platform role:', err);
  process.exit(1);
});
