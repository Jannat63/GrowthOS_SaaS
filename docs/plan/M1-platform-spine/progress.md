# M1 — Progress

Status: [x]  ·  Updated: 2026-07-11  —  **M1 complete.** All phases done: platform spine (db, auth,
`/api/v1`), fresh frontend (design system, landing, auth/onboarding), and the dashboard shell +
Growth Hub with the data layer re-pointed to `/api/v1` (P1.4b).

Rows in **execution order** (interleaved BE↔FE — see README). IDs kept stable.

| # | Item | Layer | Status | Notes |
|---|------|-------|--------|-------|
| 1 | P1.1 packages/db (Drizzle + Neon) | 🔧 BE | [x] | Tenancy schema live on Neon; migration applied; write/read verified. |
| 2 | P1.2 Better Auth + workspaces | 🔧 BE | [x] | Live on Neon; sign-up + create-workspace(owner) verified. |
| 3 | P1.5 shadcn/ui foundation | 🎨 FE | [x] | Delivered via Frontend Rebuild Slice 1 (`packages/ui`, Tailwind v4, theme tokens). |
| 4 | P1.6 Landing page | 🎨 FE | [x] | Delivered via Slice 1 — redesigned (loop signature, bento, ink bands). |
| 5 | P1.4a Web login | 🎨 FE | [x] | Delivered via Slice 1 — sign-in/up + onboarding + middleware; browser→Neon verified. |
| 6 | P1.3 Fastify domain skeleton | 🔧 BE | [x] | `/api/v1` (auth/me, workspaces, connections) + member guard + `@growthos/types`; verified. |
| 7 | P1.4b Web data re-point | 🎨 FE | [x] | Via Slice 2 — dashboard shell + Growth Hub; `lib/api`→`/api/v1`, hooks live/mock via `liveOrMock`, `DataSourceBadge`. |

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
- 2026-07-05 — **P1.3 done**: `@growthos/types`, typed error envelope, session-verify, the
  `requireWorkspaceMember` guard, and the `/api/v1` routes (auth/me, workspaces, connections) with zod.
  Verified member/non-member (403)/unauth (401). Only **P1.4b** remains (deferred — needs dashboard
  pages), so M1's spine is effectively complete.
- 2026-07-11 — **P1.4b done → M1 COMPLETE.** Frontend Rebuild Slice 2: dashboard shell (ink `Sidebar`,
  `TopBar` workspace switcher + user menu, `ModuleTabs`) + **Growth Hub** (Loop Masthead signature that
  lights channel spokes on rec hover, KPI cards, cross-channel recommendation queue). Data layer
  re-pointed to `/api/v1` — `useWorkspace`/`useConnections` live from Neon, `useGrowthHub`/
  `useRecommendations` fall back to the tested `lib/logic` engines over ported mock data via the pure
  `liveOrMock()` helper; `DataSourceBadge` surfaces the source. `/growth-hub` middleware-guarded.
  Full turbo build green; 53 web tests pass.
