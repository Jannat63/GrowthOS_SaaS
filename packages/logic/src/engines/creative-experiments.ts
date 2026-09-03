// Creative variant experiments (M4 · P4.2a-3) — the pure half: status transitions and conclusion
// validation. No database, no I/O.
//
// WHAT THIS FEATURE IS. An experiment LOG, not an A/B testing engine. It records what was tested,
// why, how it would be judged, and what the human concluded. Nothing in this codebase publishes an
// ad or reads per-variant delivery, so the test itself runs in the user's ad manager; this is the
// structured record of it.
//
// That distinction drives every rule below:
//
//  - STATUS IS USER-CONTROLLED. An earlier plan gated `running` on the workspace having a live
//    platform connection. That gates the wrong thing: `draft` vs `running` is a label, and gating a
//    label prevents nothing (contrast `resolveAdapter` in the API, where a connection gate stops a
//    real call to a live ad account). Worse, it would freeze the record of work genuinely happening
//    in Meta Ads Manager — confusing OUR ability to measure with THEIR workflow state.
//
//  - THE RESULT IS WHAT GETS GATED. We never compute, infer, or assert a winner, because we have no
//    per-variant delivery data. Concluding is an explicitly human act, and any numbers the user
//    supplies are carried as `selfReported` so a later reader — or the intelligence engine — cannot
//    mistake a hand-typed CTR for an observed one. That mislabelling is
//    `AUDIT-2026-08-13-codebase.md` #14 in a new place.
//
//  - `concluded` IS TERMINAL. Reopening would let a recorded outcome be quietly rewritten, and a log
//    whose history is editable is not a log.

export type ExperimentStatus = "draft" | "running" | "concluded";

export type ExperimentWinner = "a" | "b" | "inconclusive";

/**
 * Allowed moves.
 *
 * `draft → concluded` covers abandoning before launch — a real outcome worth recording, and
 * forcing it through `running` would put a lie in the log. `running → draft` un-launches a
 * mistake. Nothing leaves `concluded`.
 */
const TRANSITIONS: Record<ExperimentStatus, readonly ExperimentStatus[]> = {
  draft: ["running", "concluded"],
  running: ["draft", "concluded"],
  concluded: [],
};

export function canTransition(from: ExperimentStatus, to: ExperimentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Why a transition was refused, phrased for the user rather than for the developer. */
export function transitionError(from: ExperimentStatus, to: ExperimentStatus): string | null {
  if (canTransition(from, to)) return null;
  if (from === "concluded") {
    return "This experiment is concluded. Its outcome is part of the record and cannot be changed — start a new experiment instead.";
  }
  if (from === to) return `This experiment is already ${from}.`;
  return `An experiment cannot move from ${from} to ${to}.`;
}

/**
 * The recorded outcome of an experiment.
 *
 * `selfReported` is not decoration. Every number in here was typed by a person reading their own ad
 * manager; the product did not observe any of it. The flag is what stops a later consumer treating
 * it as measured.
 */
export interface ExperimentResult {
  winner: ExperimentWinner;
  /** The user's own account of what happened. */
  notes: string;
  /**
   * Optional figures the user chose to record, in whatever metric they declared. Never parsed for
   * meaning, never compared across experiments, never used to pick a winner.
   */
  metricA?: number | undefined;
  metricB?: number | undefined;
  /** Always true today. Present as a field, not an assumption, so measured results can join later. */
  selfReported: true;
  concludedBy: string;
  concludedAt: string;
}

export interface ConclusionInput {
  winner: ExperimentWinner;
  notes?: string | undefined;
  metricA?: number | undefined;
  metricB?: number | undefined;
}

export interface ConclusionValidation {
  ok: boolean;
  error?: string;
}

/**
 * Validates a conclusion before it is recorded.
 *
 * Deliberately does NOT check that the declared winner agrees with the reported numbers. A user may
 * pick B despite A's higher CTR because B drove better downstream revenue they can see and we
 * cannot — overruling them from two numbers we did not measure would be exactly the false
 * confidence this design avoids. The numbers are context for the human's decision, not evidence
 * against it.
 */
export function validateConclusion(input: ConclusionInput): ConclusionValidation {
  const notes = input.notes?.trim() ?? "";

  // An inconclusive result is the one that most needs an explanation: "we could not tell" is only
  // useful to a future reader if it says what was seen. A winner can stand on the variants alone.
  if (input.winner === "inconclusive" && notes.length === 0) {
    return {
      ok: false,
      error: "Say what you saw — an inconclusive result with no notes tells a future reader nothing.",
    };
  }

  for (const [label, value] of [
    ["metricA", input.metricA],
    ["metricB", input.metricB],
  ] as const) {
    if (value == null) continue;
    if (!Number.isFinite(value)) {
      return { ok: false, error: `${label} must be a number.` };
    }
    // Negative rates and spends are not typos worth guessing at; refuse rather than store nonsense.
    if (value < 0) {
      return { ok: false, error: `${label} cannot be negative.` };
    }
  }

  return { ok: true };
}

/** Builds the stored result. Centralised so `selfReported` cannot be forgotten at a call site. */
export function buildResult(
  input: ConclusionInput,
  concludedBy: string,
  concludedAt: Date,
): ExperimentResult {
  return {
    winner: input.winner,
    notes: input.notes?.trim() ?? "",
    metricA: input.metricA,
    metricB: input.metricB,
    selfReported: true,
    concludedBy,
    concludedAt: concludedAt.toISOString(),
  };
}
