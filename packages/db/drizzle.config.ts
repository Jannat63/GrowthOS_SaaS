import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  // Point at the table files directly (not the `index.ts` barrel): drizzle-kit's loader resolves
  // `.ts` sources and cannot follow the NodeNext `.js` re-exports that tsc requires.
  //
  // ADD EVERY NEW SCHEMA FILE HERE. A file missing from this list is not "ignored" — drizzle-kit
  // reads the list as the complete schema, so any table defined elsewhere looks like a table that
  // should no longer exist, and `generate` emits DROP TABLE for it. That happened: the 2026-08-13
  // merge took main's copy of this file, which predated `automation.ts`, and the next `generate`
  // produced a migration that dropped `automation_alerts` and `scheduler_runs`. Silent, and
  // destructive if applied. See docs/AUDIT-2026-08-13-post-merge.md.
  schema: [
    './src/schema/auth.ts',
    './src/schema/tenancy.ts',
    './src/schema/jobs.ts',
    './src/schema/onboarding.ts',
    './src/schema/recommendations.ts',
    './src/schema/content-briefs.ts',
    './src/schema/intelligence.ts',
    './src/schema/collaboration.ts',
    './src/schema/audit.ts',
    './src/schema/billing.ts',
    './src/schema/api-keys.ts',
    './src/schema/automation.ts',
    './src/schema/webhooks.ts',
    './src/schema/brand.ts',
    './src/schema/experiments.ts',
    './src/schema/admin.ts',
    './src/schema/blog.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
