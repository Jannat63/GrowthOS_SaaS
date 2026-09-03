import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import {
  buildResult,
  transitionError,
  validateConclusion,
  type ConclusionInput,
  type ExperimentStatus,
} from '@growthos/logic'
import { AppError } from './errors.js'

/**
 * Creative variant experiments (M4 · P4.2a-3) — the storage edge. The rules live in
 * `@growthos/logic` (`creative-experiments.ts`) and are pure.
 *
 * This is an experiment **log**. Nothing here publishes an ad or reads per-variant delivery, and
 * nothing computes a winner — see the engine header for why gating the `result` is the honest
 * control, rather than gating the `running` status on a platform connection as the plan first said.
 */

const MAX_HYPOTHESIS = 2000
const MAX_NOTES = 4000

export interface CreateExperimentInput {
  hypothesis: string
  variantA: unknown
  variantB: unknown
  variantALabel?: string | undefined
  variantBLabel?: string | undefined
  successMetric: string
}

export interface ExperimentSummary {
  id: string
  hypothesis: string
  variantA: unknown
  variantB: unknown
  variantALabel: string
  variantBLabel: string
  successMetric: string
  status: ExperimentStatus
  result: unknown
  startedAt: Date | null
  concludedAt: Date | null
  createdAt: Date
}

function toSummary(row: schema.CreativeExperimentRow): ExperimentSummary {
  return {
    id: row.id,
    hypothesis: row.hypothesis,
    variantA: row.variantA,
    variantB: row.variantB,
    variantALabel: row.variantALabel,
    variantBLabel: row.variantBLabel,
    successMetric: row.successMetric,
    status: row.status as ExperimentStatus,
    result: row.result,
    startedAt: row.startedAt,
    concludedAt: row.concludedAt,
    createdAt: row.createdAt,
  }
}

export async function listExperiments(workspaceId: string): Promise<ExperimentSummary[]> {
  const rows = await db
    .select()
    .from(schema.creativeExperiments)
    .where(eq(schema.creativeExperiments.workspaceId, workspaceId))
    .orderBy(desc(schema.creativeExperiments.createdAt))
  return rows.map(toSummary)
}

export async function createExperiment(
  workspaceId: string,
  input: CreateExperimentInput,
  createdBy: string,
): Promise<ExperimentSummary> {
  const [row] = await db
    .insert(schema.creativeExperiments)
    .values({
      workspaceId,
      hypothesis: input.hypothesis.trim().slice(0, MAX_HYPOTHESIS),
      variantA: input.variantA,
      variantB: input.variantB,
      variantALabel: input.variantALabel?.trim() || 'Variant A',
      variantBLabel: input.variantBLabel?.trim() || 'Variant B',
      successMetric: input.successMetric.trim(),
      status: 'draft',
      createdBy,
    })
    .returning()

  return toSummary(row!)
}

/**
 * Loads one experiment, scoped to the workspace.
 *
 * The `workspaceId` is part of the WHERE, not checked after the fetch: an id belonging to another
 * workspace must be indistinguishable from one that does not exist, or the 404/403 difference leaks
 * which ids are real.
 */
async function loadExperiment(
  workspaceId: string,
  id: string,
): Promise<schema.CreativeExperimentRow> {
  const [row] = await db
    .select()
    .from(schema.creativeExperiments)
    .where(
      and(
        eq(schema.creativeExperiments.id, id),
        eq(schema.creativeExperiments.workspaceId, workspaceId),
      ),
    )
  if (!row) throw new AppError('NOT_FOUND', 'Experiment not found.')
  return row
}

/**
 * Moves an experiment between `draft` and `running`.
 *
 * Status is the USER's to set — they know whether they launched the test in their ad manager; we
 * cannot observe it. `concluded` is not reachable here: concluding requires an outcome, so it goes
 * through `concludeExperiment`.
 */
export async function setExperimentStatus(
  workspaceId: string,
  id: string,
  to: ExperimentStatus,
): Promise<ExperimentSummary> {
  const row = await loadExperiment(workspaceId, id)
  const from = row.status as ExperimentStatus

  if (to === 'concluded') {
    throw new AppError(
      'VALIDATION_ERROR',
      'Concluding an experiment needs an outcome — record the result instead.',
    )
  }

  const error = transitionError(from, to)
  if (error) throw new AppError('VALIDATION_ERROR', error)

  const [updated] = await db
    .update(schema.creativeExperiments)
    .set({
      status: to,
      // Stamped on the first launch and kept thereafter: un-launching a mistake and relaunching
      // should not rewrite when the test actually began.
      startedAt: to === 'running' ? (row.startedAt ?? new Date()) : row.startedAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.creativeExperiments.id, id))
    .returning()

  return toSummary(updated!)
}

/**
 * Records the human's conclusion and closes the experiment.
 *
 * The product asserts nothing here. `buildResult` stamps `selfReported: true` on every result, so a
 * later reader cannot mistake a hand-entered number for an observed one.
 */
export async function concludeExperiment(
  workspaceId: string,
  id: string,
  input: ConclusionInput,
  concludedBy: string,
): Promise<ExperimentSummary> {
  const row = await loadExperiment(workspaceId, id)
  const from = row.status as ExperimentStatus

  const transition = transitionError(from, 'concluded')
  if (transition) throw new AppError('VALIDATION_ERROR', transition)

  const validation = validateConclusion(input)
  if (!validation.ok) {
    throw new AppError('VALIDATION_ERROR', validation.error ?? 'Invalid conclusion.')
  }

  const now = new Date()
  const [updated] = await db
    .update(schema.creativeExperiments)
    .set({
      status: 'concluded',
      result: buildResult(
        { ...input, notes: input.notes?.slice(0, MAX_NOTES) },
        concludedBy,
        now,
      ),
      concludedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.creativeExperiments.id, id))
    .returning()

  return toSummary(updated!)
}

/**
 * Deletes an experiment.
 *
 * A concluded experiment cannot be deleted: its outcome is the record, and a log whose entries can
 * be removed after the fact is not a log. Abandoning before launch is expressed by concluding it,
 * not by erasing it.
 */
export async function deleteExperiment(workspaceId: string, id: string): Promise<void> {
  const row = await loadExperiment(workspaceId, id)
  if (row.status === 'concluded') {
    throw new AppError(
      'VALIDATION_ERROR',
      'A concluded experiment is part of the record and cannot be deleted.',
    )
  }
  await db.delete(schema.creativeExperiments).where(eq(schema.creativeExperiments.id, id))
}
