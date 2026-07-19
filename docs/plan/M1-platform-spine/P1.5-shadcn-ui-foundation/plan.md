# P1.5 — shadcn/ui foundation

Milestone: M1 · Depends on: P0.2 · Prerequisites: none — **No Neon needed, parallelizable**

## Goal

Adopt shadcn/ui as the UI foundation: init it in `apps/web`, create a shared `packages/ui`, and add
the core primitives replacing the existing hand-rolled `components/ui`, setting the shadcn-first
convention (D6).

## Subphases

- [ ] Init shadcn in `apps/web` — `components.json`, reuse existing `lib/utils/cn.ts`, CSS-variable
  theming.
- [ ] Decide Tailwind v3 → v4.
- [ ] Create `packages/ui` (wired via `transpilePackages`).
- [ ] Add core primitives: button, input, card, dialog, dropdown, table, tabs, toast — replacing the
  existing `components/ui`.
- [ ] Set the shadcn-first convention (Decision D6).

## Reuse

- Existing `apps/web/components/ui` → replacement targets (rebuild via shadcn).
- Existing `apps/web/lib/utils/cn.ts` → as-is (reused by shadcn init).

## Surface

- `apps/web/components.json`, CSS-variable theme, Tailwind v3→v4 decision.
- `packages/ui/` — shared primitives, consumed via `transpilePackages`.
- Primitives: button, input, card, dialog, dropdown, table, tabs, toast.

## Verification

- A converted page renders via shadcn.
- The build stays green.
