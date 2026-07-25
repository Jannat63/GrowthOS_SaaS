# GrowthOS — Plan & Progress-Tracking System

This directory is the living, ordered map of the whole GrowthOS rebuild. It decomposes the
blueprint into **Milestones → Phases → Subphases** and carries a `progress.md` at every level so
work is trackable end-to-end. It does **not** contain application code — it is the plan and the
scoreboard for the code.

Near-term milestones (**M0–M2**) are detailed to the subphase level. Later milestones (**M3–M4**,
V1/V2) are high-level outlines that will be expanded to full phase folders when they are reached
(rolling-wave planning).

## The hierarchy

- **Milestone** (`Mx`) — a large, releasable chunk of the product (e.g. Platform Spine, MVP). Each
  milestone is a folder with a `README.md` (goal, phase list, exit criteria) and a `progress.md`
  (rollup of its phases).
- **Phase** (`Px.y`) — a coherent unit of work inside a milestone (e.g. Better Auth + workspaces).
  For M0–M2 each phase is a folder with a `plan.md` and a `progress.md`.
- **Subphase** — a concrete `[ ]` checkbox item inside a phase's `plan.md` `## Subphases` list. The
  smallest tracked unit of work.

## Status legend

Used verbatim in every progress file and checklist:

- `[ ]` ⬜ Not started
- `[~]` 🟨 In progress
- `[x]` ✅ Done
- `[!]` ⛔ Blocked (note the blocker)

## File conventions

- **`plan.md`** (per phase, M0–M2) — the *what and how*. Sections:
  - `# <Phase ID> — <Name>`
  - Header line: `Milestone: <Mx> · Depends on: <phase ids> · Prerequisites: <e.g. Neon URL>`
  - `## Goal` — 1–2 sentences.
  - `## Subphases` — checklist, `[ ]` each.
  - `## Reuse` — legacy/blueprint asset → as-is | reference | rebuild.
  - `## Surface` — files to create/modify · API endpoints · tables · UI pages.
  - `## Verification` — how to prove it works end-to-end.
- **`progress.md`** (every level) — the *where are we*. Sections:
  - `# <ID> — Progress`
  - `Status: [ ]  ·  Updated: <date>`
  - A table of the child items (subphases for a phase; phases for a milestone) with status + notes.
  - `## Log` — dated one-liners of what changed.
- **`README.md`** (milestone + top level) — orientation: goal, phase list with summaries, exit
  criteria. For M3/M4 the README also carries the full phase outline until those phases are
  expanded into folders.
- **`PROGRESS.md`** (top level) — the master rollup dashboard. One table per milestone, plus an
  overall status line. The single place to check "where are we."

## How to use it

1. Start at [`PROGRESS.md`](./PROGRESS.md) for the whole-project status at a glance.
2. Open a milestone `README.md` for its goal and exit criteria.
3. Open a phase `plan.md` to see the subphases, surface, and how it will be verified.
4. As work happens, tick subphase checkboxes, update the phase `progress.md` table + `Status:`
   line, add a `## Log` entry, then roll the change up into the milestone `progress.md` and the
   master `PROGRESS.md`. The docs are the source of truth for progress.

## Related documents

- [`../blueprint/DECISIONS.md`](../blueprint/DECISIONS.md) — the six locked architectural decisions.
- [`../blueprint/`](../blueprint/) — the full blueprint (ARCHITECTURE, API_SPEC, DATA_MODELS,
  ENGINEERING, PRD, ROADMAP, REPO_SETUP, GETTING_STARTED).
- [`../superpowers/specs/2026-07-05-restructure-design.md`](../superpowers/specs/2026-07-05-restructure-design.md)
  — the restructure design spec this plan implements.
