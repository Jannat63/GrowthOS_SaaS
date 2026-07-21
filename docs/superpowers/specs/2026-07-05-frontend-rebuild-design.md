# GrowthOS — Frontend Rebuild (Slice 1) Design

**Date:** 2026-07-05
**Status:** Approved (design), ready for implementation planning
**Author:** Sheikh Shihab Hossain + Claude

---

## 1. Context

`apps/web` today is the legacy frontend carried forward verbatim (81 pages, Next 15 / React 19,
Tailwind v3, ad-hoc components, no PostCSS/next config on disk). The decision now is to **rebuild the
frontend fresh** on the blueprint's target stack rather than migrate it incrementally.

This **reverses decision D5** ("existing frontend is carried forward, migrated incrementally — not
rebuilt"). D5 is updated accordingly (see §9). The full legacy frontend remains preserved under
`/legacy/apps/web` as reference, so resetting the current `apps/web` internals is non-destructive.

The rebuild is delivered in **slices**, not big-bang. This document specs **Slice 1**: the design
system, the landing page, and the full auth + onboarding flow. The remaining ~70 dashboard pages are
later slices.

## 2. Locked decisions (from brainstorming)

- **Fresh from zero** for the app shell, structure, components, and styling — but the proven,
  expensive-to-reproduce code is preserved: the tested `lib/logic` engines are **ported in
  unchanged**, and the working **backend** auth (`apps/api`, already verified) is **kept as-is** with
  the fresh frontend building a new Better Auth client against it (not retyped).
- **Approach A** — rebuild `apps/web` **in place** (keep the `@growthos/web` workspace + turbo
  wiring; replace internals). No parallel app.
- **Tailwind v4 + shadcn/ui** (the blueprint target; D6 shadcn-maximal).
- **Keep the current visual identity** — primary indigo `#4F46E5`, green accent, Inter — expressed as
  shadcn CSS-variable tokens. Real brand/copy arrives later; placeholders until then.
- **`globals.css` is the single theme source of truth** — all tokens (color, radius, shadow, font)
  live there as CSS variables; components consume tokens only, **no hardcoded hex**.

## 3. Scope — Slice 1

In: design system + `packages/ui` primitives; landing page; auth + onboarding pages.
Out (later slices): all dashboard modules, `lib/hooks`, `lib/mock-data`, `lib/api` client, real
onboarding backend.

## 4. Stack & scaffold

Reset `apps/web` internals to a clean Next 15 / React 19 app:

- `next.config.mjs` — `transpilePackages: ['@growthos/ui']`.
- `postcss.config.mjs` — `@tailwindcss/postcss` (also fixes the current missing-PostCSS gap).
- Tailwind **v4** (CSS-first; no `tailwind.config.ts` required — theme lives in `globals.css`).
- `tsconfig.json` — `@/*` path alias, `moduleResolution: bundler` (as today).
- New **`packages/ui`** (`@growthos/ui`) — shared shadcn primitives, consumed via `transpilePackages`;
  Tailwind scans its source. Initial set: button, input, label, card, dialog, dropdown-menu, table,
  tabs, form, sonner (toast).
- `apps/web/package.json` gains `@growthos/ui` (`workspace:*`) + shadcn deps; `packages/ui` owns the
  radix / cva / lucide deps.

## 5. Design system & theme

`apps/web/styles/globals.css` is the source of truth:

- `@import "tailwindcss";` then a `@theme` block + shadcn CSS-variable tokens.
- Tokens: full shadcn set (`--background`, `--foreground`, `--card`, `--popover`, `--primary`,
  `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, and their
  `-foreground` pairs) plus `--radius` and shadow scale. `--primary` carries indigo `#4F46E5`;
  `--destructive` the red; a green accent token for success. Font: Inter.
- **Light and dark** sets (dark via `.dark` class / `prefers-color-scheme`).
- Components reference tokens (`bg-background`, `text-primary`, `border-border`,
  `text-muted-foreground`) — never raw hex. Rebrand = edit variables only.
- `lib/utils/cn.ts` (clsx + tailwind-merge) ported as-is; `packages/ui` re-exports it.

## 6. Pages in Slice 1

Route groups:

- `app/(marketing)/` — public shell (nav + footer) + landing at `/` (hero, three-channel features:
  SEO / Google Ads / Meta Ads, unified insight loop, how-it-works, pricing teaser, social proof,
  footer; CTAs → sign-up / sign-in). Placeholder copy/brand.
- `app/(auth)/` — `sign-in`, `sign-up`, `welcome`, `verify-email`, and onboarding steps
  `business-info`, `connect-accounts`, `create-workspace`, `onboarding-complete`.

`app/page.tsx` no longer redirects to `/welcome`; `/` renders the landing page.

## 7. Ported vs rebuilt

- **Ported unchanged:** `lib/logic/*` (6 engines: seo-scoring, search-terms-bridge, creative-fatigue,
  cross-channel-engine, blended-mer, goal-simulator) + their vitest tests; `lib/utils/cn.ts`.
- **Rebuilt fresh:** all components, pages, layouts, providers, styling.
- **Deferred to dashboard slices:** `lib/hooks` (live→mock fallback), `lib/mock-data`, `lib/api`
  client. Slice 1 pages don't need them.

## 8. Data / auth integration

- Better Auth **React client** points at Fastify `/api/auth/*` (`http://localhost:3001`).
- `sign-in` / `sign-up` create a real user + session in Neon (verified backend from P1.2).
- `create-workspace` calls the real Better Auth `organization/create` (verified).
- `middleware.ts` route protection is backed by the Better Auth session.
- Other onboarding steps (`business-info`, `connect-accounts`, `onboarding-complete`) are UI-first;
  their backend lands in later milestones (M2).
- The browser sends `Origin` natively, so Better Auth's CSRF check passes (this is what tripped the
  `inject()`-based verify in P1.2).

## 9. Decision update — D5

D5 changes from "carry forward, migrate incrementally" to: **the frontend is rebuilt fresh on the
blueprint stack (Next 15 / React 19 / Tailwind v4 / shadcn), in slices. The tested `lib/logic` engines
are ported in unchanged and the working backend auth (`apps/api`) is kept as-is; the fresh frontend is
built against them rather than retyped.** The legacy frontend stays under `/legacy` as reference. `docs/blueprint/DECISIONS.md` (D5) and `CLAUDE.md` are updated to match during
planning.

## 10. Plan reconciliation

Slice 1 merges the previously separate M1 phases **P1.5 (shadcn foundation)**, **P1.6 (landing page)**,
and **P1.4a (web login)** — plus the auth/onboarding pages — into one **"Frontend rebuild — Slice 1"**
unit. `docs/plan/M1-platform-spine` and `docs/plan/linear-titles.md` are reconciled during the
writing-plans step (fold those phases; keep P1.3 domain skeleton and P1.4b data re-point for later).

## 11. Testing & verification

- `pnpm --filter @growthos/web test` — ported logic engine tests stay green.
- `pnpm build` — green across api + web + db + ui.
- Browser: sign up at `/sign-up` → a `user` row appears in Neon; protected route gated by session.
- `/` renders the full landing page (not a redirect); theme tokens drive light/dark.

## 12. Out of scope / later slices

- Dashboard shell + the ~15 modules (~70 pages).
- `lib/hooks` / `lib/mock-data` / `lib/api` client rebuild.
- Real onboarding + integrations backend (M2).
- Real brand assets + final marketing copy (user-supplied).
