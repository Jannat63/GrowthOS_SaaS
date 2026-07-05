import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Tenancy schema (M1 · P1.1).
 *
 * Reconciliation with Better Auth (D1): `workspaces` and `workspace_members` are modeled to be
 * adopted by Better Auth's organization plugin in P1.2 (text ids, string role). User references
 * (`ownerId`, `userId`, `invitedBy`) point at Better Auth's `user.id` — that table is created when
 * Better Auth is wired in P1.2, so the FK constraints to it are added then, not here. The internal
 * FKs (members → workspaces, connections → workspaces) are enforced now.
 *
 * Authoritative column set: docs/blueprint/DATA_MODELS.md → "Users & Auth", "Platform Connections".
 */

// One workspace per business or client. Becomes Better Auth's `organization` model in P1.2.
export const workspaces = pgTable('workspaces', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: text('owner_id'), // → user.id (FK added in P1.2 with Better Auth)
  plan: text('plan').notNull().default('starter'),
  websiteUrl: text('website_url'),
  businessCategory: text('business_category'),
  monthlyAdBudget: integer('monthly_ad_budget'),
  brandVoice: jsonb('brand_voice'), // { tone, keywords, avoid }
  whiteLabelConfig: jsonb('white_label_config'), // { logo_url, primary_color, domain }
  onboardingStep: text('onboarding_step').default('business_intake'),
  onboardingComplete: boolean('onboarding_complete').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Workspace membership. Becomes Better Auth's `member` model in P1.2.
// Roles: owner | admin | manager | viewer | client
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(), // → user.id (FK added in P1.2)
    role: text('role').notNull().default('viewer'),
    invitedBy: text('invited_by'), // → user.id (FK added in P1.2)
    invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })],
);

// Connected ad / analytics / commerce platforms per workspace.
// platform: google_ads | google_search_console | google_analytics | meta | shopify
//         | woocommerce | hubspot | klaviyo
export const platformConnections = pgTable(
  'platform_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    accountId: text('account_id').notNull(),
    accountName: text('account_name'),
    accessToken: text('access_token').notNull(), // AES-256 encrypted at the app layer
    refreshToken: text('refresh_token'), // AES-256 encrypted at the app layer
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: text('scopes').array(),
    metadata: jsonb('metadata'), // platform-specific (e.g. GA4 property_id, Shopify store_url)
    isActive: boolean('is_active').default(true),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    syncError: text('sync_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique().on(t.workspaceId, t.platform, t.accountId),
    index('idx_connections_workspace').on(t.workspaceId, t.platform),
  ],
);
