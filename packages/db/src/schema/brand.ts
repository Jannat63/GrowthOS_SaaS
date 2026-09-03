import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './auth.js';

/**
 * Brand guidelines (M4 · P4.2a-1) — the record that turns the deterministic copy generators from
 * templates into brand-constrained templates.
 *
 * `generateAdCopyVariants` / `generateUGCScript` (meta-ads-advisor) and `generateRsaHeadlines` /
 * `generateRsaDescriptions` (google-ads-advisor) all produce generic copy today because they know
 * nothing about the brand. This table is what they read from. It adds no external dependency and
 * no AI call — D4 stays intact.
 *
 * **One row per workspace**, enforced by a unique index rather than by convention, because every
 * read path assumes at most one and a duplicate would make "the brand's tone" ambiguous with no
 * principled tiebreak.
 *
 * `workspaceId` has no DB-level FK (same rationale as ./tenancy.ts — app-layer isolation).
 */
export const brandGuidelines = pgTable('brand_guidelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Unique: one guidelines record per workspace. See the table comment. */
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull().unique(),

  /**
   * `professional` | `friendly` | `bold` | `technical` | `playful`.
   *
   * Stored as text, validated with zod at the route — the convention across this schema (see
   * `automation_actions.status`). No `pgEnum` anywhere in this package, and adding the first one
   * here would mean a migration to add a tone rather than a deploy.
   */
  tone: text('tone').notNull().default('professional'),

  /**
   * Words the brand must never emit: competitor names, overclaims ("guaranteed", "#1"), regulated
   * language. Matched case-insensitively on word boundaries by the filter.
   *
   * A variant containing one is DROPPED, not rewritten — rewriting without a language model
   * produces mangled copy, and a smaller set of clean variants beats a larger set of broken ones.
   */
  bannedTerms: text('banned_terms').array().notNull().default([]),

  /** Appended to generated copy where the channel's length budget allows. */
  requiredDisclaimers: text('required_disclaimers').array().notNull().default([]),

  /** The claims copy should draw from. */
  valueProps: text('value_props').array().notNull().default([]),

  targetPersona: text('target_persona'),

  /**
   * Target US grade level for generated copy. Nullable = no reading-level constraint, which is
   * distinct from 0 and must stay distinct: a workspace that has not set one is not a workspace
   * demanding kindergarten-level copy.
   */
  readingLevel: integer('reading_level'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BrandGuidelinesRow = typeof brandGuidelines.$inferSelect;
