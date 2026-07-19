/**
 * P1.2 verification: sign up a user, create a workspace (organization), and confirm rows land in
 * Neon (user, session, workspaces, workspace_members).
 * Run (env sourced from apps/api/.env by the caller): tsx scripts/verify-auth.ts
 */
import { db, schema } from '@growthos/db';
import { buildApp } from '../src/app.js';

function cookiesFrom(setCookie: string | string[] | undefined): string {
  if (!setCookie) return '';
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  return arr.map((c) => c.split(';')[0]).join('; ');
}

async function main() {
  const app = buildApp();
  await app.ready();

  // Better Auth enforces a CSRF Origin check on state-changing routes; it must match a trusted origin.
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const email = `verify_${Date.now()}@growthos.test`;
  const password = 'Sup3rSecret!pw';

  // 1. Sign up (email/password) → creates user + session
  const signup = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: { 'content-type': 'application/json', origin },
    payload: { name: 'Verify User', email, password },
  });
  console.log('sign-up status:', signup.statusCode);
  const cookie = cookiesFrom(signup.headers['set-cookie']);
  if (signup.statusCode !== 200) console.log('sign-up body:', signup.body);

  // 2. Create an organization (= workspace) → creates workspaces + workspace_members(owner)
  const org = await app.inject({
    method: 'POST',
    url: '/api/auth/organization/create',
    headers: { 'content-type': 'application/json', cookie, origin },
    payload: { name: 'Acme Growth', slug: `acme-${Date.now()}` },
  });
  console.log('org-create status:', org.statusCode);
  if (org.statusCode !== 200) console.log('org-create body:', org.body);

  // 3. Confirm rows in Neon
  const users = await db.select().from(schema.user);
  const sessions = await db.select().from(schema.session);
  const workspaces = await db.select().from(schema.workspaces);
  const members = await db.select().from(schema.workspace_members);

  console.log('\nRow counts in Neon:');
  console.log('  user:', users.length);
  console.log('  session:', sessions.length);
  console.log('  workspaces:', workspaces.length);
  console.log('  workspace_members:', members.length);
  console.log(
    '\nWorkspace:',
    workspaces.map((w) => ({ name: w.name, slug: w.slug, plan: w.plan })),
  );
  console.log(
    'Membership:',
    members.map((m) => ({ role: m.role })),
  );

  await app.close();

  const ok =
    signup.statusCode === 200 &&
    org.statusCode === 200 &&
    users.length >= 1 &&
    sessions.length >= 1 &&
    workspaces.length >= 1 &&
    members.length >= 1;
  console.log(ok ? '\nP1.2 verification PASSED ✅' : '\nP1.2 verification FAILED ❌');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('verify-auth failed:', err);
  process.exit(1);
});
