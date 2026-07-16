import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  // Point at the table files directly (not the `index.ts` barrel): drizzle-kit's loader resolves
  // `.ts` sources and cannot follow the NodeNext `.js` re-exports that tsc requires. Add new
  // schema files to this array as they land (e.g. Better Auth tables in P1.2).
  schema: ['./src/schema/auth.ts', './src/schema/tenancy.ts', './src/schema/jobs.ts', './src/schema/onboarding.ts'],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
