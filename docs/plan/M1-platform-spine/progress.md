# M1 — Progress

Status: [~]  ·  Updated: 2026-07-05

Rows in **execution order** (interleaved BE↔FE — see README). IDs kept stable.

| # | Item | Layer | Status | Notes |
|---|------|-------|--------|-------|
| 1 | P1.1 packages/db (Drizzle + Neon) | 🔧 BE | [x] | Tenancy schema live on Neon; migration applied; write/read verified. |
| 2 | P1.2 Better Auth + workspaces | 🔧 BE | [x] | Live on Neon; sign-up + create-workspace(owner) verified. |
| 3 | P1.5 shadcn/ui foundation | 🎨 FE | [x] | Delivered via Frontend Rebuild Slice 1 (`packages/ui`, Tailwind v4, theme tokens). |
| 4 | P1.6 Landing page | 🎨 FE | [x] | Delivered via Slice 1 — redesigned (loop signature, bento, ink bands). |
| 5 | P1.4a Web login | 🎨 FE | [x] | Delivered via Slice 1 — sign-in/up + onboarding + middleware; browser→Neon verified. |
| 6 | P1.3 Fastify domain skeleton | 🔧 BE | [ ] | **Next.** `/api/v1` routes + workspace guard + `packages/types`. |
| 7 | P1.4b Web data re-point | 🎨 FE | [ ] | Rebuild dashboard data hooks → `/api/v1`; live→mock fallback. Depends on P1.3. |

## Log

- 2026-07-05 — Plan created.
- 2026-07-05 — Neon connection string provided → M1 unblocked. P1.1 complete (packages/db on Neon,
  tenancy schema, migration applied, live write/read verified, full build green).
- 2026-07-05 — P1.2 complete: Better Auth + organization plugin live on Neon. Unified `0000_init`
  migration (8 tables). Sign-up → user+session; create-workspace → workspaces + owner membership,
  verified end-to-end. Full build green.
- 2026-07-05 — Re-threaded M1 into interleaved BE↔FE slices. Split P1.4 → **P1.4a (web login)** and
  **P1.4b (web data re-point)**; P1.4a now runs before P1.3 (needs only P1.2). IDs unchanged; table
  reordered by execution sequence.
- 2026-07-05 — Added **P1.6 — Landing page** (public marketing homepage, shadcn-first, placeholder
  brand/copy). Re-sequenced to front-load the UI: P1.5 (shadcn) → P1.6 (landing) → P1.4a (login),
  with P1.3 following.
- 2026-07-05 — Decided to **rebuild the frontend fresh** (D5 reversed). **Frontend Rebuild Slice 1**
  shipped: fresh Next 15 / Tailwind v4 / shadcn app, `packages/ui`, theme tokens, redesigned landing
  page, and the full auth + onboarding flow. Browser sign-up + create-workspace verified against Neon.
  This completes **P1.5, P1.6, and P1.4a**. Remaining M1: **P1.3** (domain routes) then **P1.4b**.
