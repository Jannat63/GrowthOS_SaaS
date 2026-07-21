# M1 — Platform Spine

Status: 🟨 In progress  *(P1.1, P1.2, P1.4a, P1.5, P1.6 done — auth, workspaces, and the fresh
frontend Slice 1 live; P1.3 + P1.4b remain)*

## Goal

A real database, real auth, shared packages, a public landing page, and the frontend wired to the new
API — the load-bearing spine every MVP feature will hang off of, plus the public front door.

## Working rhythm — interleaved BE ↔ FE slices

M1 is worked as **thin backend → thin frontend** slices (walking skeleton). After P1.2, the frontend
was **rebuilt fresh** (D5 reversed) instead of migrated — one slice absorbed shadcn (P1.5), the landing
page (P1.6), and browser login (P1.4a). See `docs/superpowers/specs/2026-07-05-frontend-rebuild-design.md`
+ `docs/superpowers/plans/2026-07-05-frontend-rebuild-slice-1.md`. Phase IDs are kept stable; the table
below is in **execution order**.

## Phases (execution order)

| # | Phase | Layer | Summary | Status |
|---|-------|-------|---------|--------|
| 1 | [P1.1 packages/db](./P1.1-packages-db/plan.md) | 🔧 BE | `packages/db` with Drizzle + Neon client, tenancy schema, migrations. | [x] |
| 2 | [P1.2 Better Auth + workspaces](./P1.2-better-auth-workspaces/plan.md) | 🔧 BE | Better Auth in `apps/api` (Drizzle/Neon, email/password) + organization plugin ⇒ workspaces/members/roles. | [x] |
| 3 | [P1.5 shadcn/ui foundation](./P1.5-shadcn-ui-foundation/plan.md) | 🎨 FE | shadcn + `packages/ui` + Tailwind v4 theme tokens. **Delivered via Frontend Rebuild Slice 1.** | [x] |
| 4 | [P1.6 Landing page](./P1.6-landing-page/plan.md) | 🎨 FE | Public marketing homepage at `/` (redesigned: loop signature, bento, ink bands). **Via Slice 1.** | [x] |
| 5 | [P1.4a Web login](./P1.4a-web-login/plan.md) | 🎨 FE | Better Auth client + sign-in/up + onboarding + session middleware — verified in the browser. **Via Slice 1.** | [x] |
| 6 | [P1.3 Fastify domain skeleton](./P1.3-fastify-domain-skeleton/plan.md) | 🔧 BE | **Next.** Core plugins, workspace-member guard, first `/api/v1` routes, zod validation, `packages/types`. | [ ] |
| 7 | [P1.4b Web data re-point](./P1.4b-web-data-repoint/plan.md) | 🎨 FE | Point `apps/web` data hooks at Fastify `/api/v1`; rebuild the live→mock hooks (deferred from Slice 1). | [ ] |

## Status notes

- **P1.1 / P1.2 done** — Neon connected; sign-up + create-workspace verified end-to-end.
- **P1.5 / P1.6 / P1.4a done** — absorbed into **Frontend Rebuild Slice 1** (fresh Next 15 / Tailwind v4 /
  shadcn app: design system, landing page, full auth + onboarding). Browser sign-up + create-workspace
  verified against Neon.
- **P1.3 is next** — the `/api/v1` domain skeleton (`/auth/me`, `/workspaces`, member guard, `packages/types`).
- **P1.4b** follows P1.3 — it rebuilds the dashboard data hooks (they were deferred from Slice 1).

## Exit criteria

- shadcn adopted for core primitives; `packages/ui` exists. ✅
- Public landing page live at `/` with working CTAs. ✅
- Real login works end-to-end against Neon (in the browser). ✅
- `/auth/me` + workspace guard live. *(P1.3)*
- Dashboard hooks read `/api/v1` with graceful mock fallback. *(P1.4b)*
