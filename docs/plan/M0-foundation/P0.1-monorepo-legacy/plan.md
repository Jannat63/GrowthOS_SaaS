# P0.1 — Monorepo & legacy

Milestone: M0 · Depends on: — · Prerequisites: —

## Goal

Preserve the previous build as reference under `/legacy`, import and amend the blueprint docs, and
lock the foundational architecture decisions so the rebuild starts from a clean, documented base.

## Subphases

- [x] Move the previous build into `/legacy` (kept as reference, not deleted).
- [x] Import the blueprint docs into `docs/blueprint/` and amend them for GrowthOS.
- [x] Write `docs/blueprint/DECISIONS.md` capturing the six locked decisions (Better Auth over
  Supabase; Neon as the single database; maximize free tiers — ClickHouse local, Kafka deferred;
  Claude deferred behind a flag; frontend carried forward and migrated incrementally; shadcn/ui
  used maximally).

## Reuse

- Previous GrowthOS build → moved to `/legacy` (reference).
- Blueprint source docs → imported into `docs/blueprint/` and amended (as-is + amend).

## Surface

- `/legacy/` — the entire previous build, preserved.
- `docs/blueprint/` — ARCHITECTURE, API_SPEC, DATA_MODELS, ENGINEERING, PRD, ROADMAP, REPO_SETUP,
  GETTING_STARTED.
- `docs/blueprint/DECISIONS.md` — the six locked decisions.

## Verification

- `/legacy` contains the previous build intact.
- `docs/blueprint/DECISIONS.md` exists and records all six decisions.
- Committed on branch `shihab-restructure`.
