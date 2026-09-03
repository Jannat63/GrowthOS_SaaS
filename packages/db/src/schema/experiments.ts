import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './auth.js';

/**
 * Creative variant experiments (M4 · P4.2a-3).
 *
 * An experiment **log**, not an A/B testing engine. Nothing in this codebase publishes an ad or
 * reads per-variant delivery, so the test itself runs in the customer's own ad manager; this records
 * what was tested, why, how it would be judged, and what the human concluded.
 *
 * `workspaceId` has no DB-level FK (same rationale as ./tenancy.ts — app-layer isolation).
 */
export const creativeExperiments = pgTable(
  'creative_experiments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),

    /** What the user expects to happen and why — the reason this test is worth running. */
    hypothesis: text('hypothesis').notNull(),

    /**
     * The two variants, stored as a **snapshot** rather than a reference to a generator input.
     *
     * The generators are deterministic templates, so re-deriving a variant later would return
     * whatever today's template produces, not what was actually tested. An experiment record whose
     * variants can change underneath it is not a record. Shape varies by creative kind
     * (`AdCopyVariant`, `UGCScript`, or a plain RSA string), which is why it is jsonb.
     */
    variantA: jsonb('variant_a').notNull(),
    variantB: jsonb('variant_b').notNull(),

    /** Short human labels ("Hook A" / "Testimonial open") so a list is readable without unpacking jsonb. */
    variantALabel: text('variant_a_label').notNull().default('Variant A'),
    variantBLabel: text('variant_b_label').notNull().default('Variant B'),

    /**
     * How the user intends to judge it, as free text.
     *
     * Deliberately not an enum limited to what we can read (CTR is the only rate
     * `creative_performance` carries). That would constrain the user's stated *intent* to our
     * current *measurement* capability, which are different things — they may well be judging on
     * CPA in their own reporting. The honesty requirement lives on `result`, not here.
     */
    successMetric: text('success_metric').notNull(),

    /** `draft` | `running` | `concluded`. Transitions validated by the pure engine in `@growthos/logic`. */
    status: text('status').notNull().default('draft'),

    /**
     * The recorded outcome — `ExperimentResult`, always carrying `selfReported: true`.
     *
     * Every number in here was typed by a person reading their own ad manager; the product observed
     * none of it. The flag is what stops a later consumer treating it as measured data, which would
     * be `AUDIT-2026-08-13-codebase.md` #14 in a new place. Null until concluded.
     */
    result: jsonb('result'),

    createdBy: text('created_by'), // → user.id
    startedAt: timestamp('started_at', { withTimezone: true }),
    concludedAt: timestamp('concluded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('creative_experiments_ws_status_idx').on(t.workspaceId, t.status)],
);

export type CreativeExperimentRow = typeof creativeExperiments.$inferSelect;
