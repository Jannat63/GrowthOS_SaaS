# P0.3 — Planning system

Milestone: M0 · Depends on: P0.1, P0.2 · Prerequisites: —

## Goal

Create the living `docs/plan/` documentation system that decomposes the blueprint into
Milestones → Phases → Subphases with a `progress.md` at every level, so the whole project is a
single ordered, reviewable, trackable map.

## Subphases

- [~] Create the `docs/plan/` tree (top-level README + PROGRESS; M0–M2 phase folders; M3–M4 outline
  milestones).
- [~] Write the top-level `README.md` (hierarchy, status legend, file conventions, cross-links).
- [~] Write the master `PROGRESS.md` rollup dashboard (one table per milestone + overall status).
- [~] Write M0–M2 phase `plan.md` files from the decomposition (Goal, Subphases, Reuse, Surface,
  Verification).
- [~] Seed all `progress.md` files with the current-progress reconciliation values.
- [~] Write M3/M4 outline READMEs (phase outlines only; expand to folders when reached).

## Reuse

- Blueprint decomposition (Milestone→Phase→Subphase) → authored into `docs/plan/` (as-is).
- Status legend + `plan.md`/`progress.md` templates → applied across all files (as-is).

## Surface

- `docs/plan/README.md`, `docs/plan/PROGRESS.md`.
- `docs/plan/M0-foundation/`, `M1-platform-spine/`, `M2-mvp-insight-loop/` — milestone
  `README.md` + `progress.md` + per-phase `plan.md` + `progress.md`.
- `docs/plan/M3-v1-channels/`, `M4-v2-automation/` — milestone `README.md` + `progress.md` (outline).
- Cross-links to `docs/blueprint/DECISIONS.md` and
  `docs/superpowers/specs/2026-07-05-restructure-design.md`.

## Verification

- `docs/plan/` matches the target structure; M0–M2 each phase has `plan.md` + `progress.md`; M3–M4
  have milestone `README.md` + `progress.md`.
- Master `PROGRESS.md` renders every milestone/phase with a status matching the reconciliation
  (spot-check: P0.2 `[x]`, P1.1 `[!]`).
- No `TBD`/placeholder left in any M0–M2 `plan.md`.
- Every legacy-reusing `plan.md` names the real path.
- Cross-links resolve.
