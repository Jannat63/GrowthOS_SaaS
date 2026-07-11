# P1.4b — Progress

Status: [x]  ·  Updated: 2026-07-11

Delivered via **Frontend Rebuild Slice 2** — the dashboard shell + Growth Hub had to be built first
(Slice 1 was public + auth only), so the data layer P1.4b re-points was created and wired here.

| Item | Status | Notes |
|------|--------|-------|
| `lib/api/client.ts` → Fastify `/api/v1` | [x] | New client: `credentials: include`, 4s timeout, prepends `/api/v1`. |
| Feature hooks point at real endpoints | [x] | `useWorkspace` (`/auth/me`) + `useConnections` (`/workspaces/:id/connections`) are **live**; `useGrowthHub` + `useRecommendations` target their (M2) endpoints and fall back. |
| Live→mock fallback + `DataSourceBadge` | [x] | Fallback extracted to pure `liveOrMock()` (unit-tested); `DataSourceBadge` surfaces live/mock per hook + globally in the TopBar. |

## Log

- 2026-07-05 — Split out of the old P1.4 (data half) when M1 was re-threaded into interleaved
  backend↔frontend slices.
- 2026-07-11 — **Done** via Slice 2. Built the dashboard shell (ink `Sidebar` / `TopBar` workspace
  switcher + user menu / `ModuleTabs`) and the **Growth Hub** module (Loop Masthead signature, KPI
  cards, cross-channel recommendation queue). Data layer: `lib/api/client` → `/api/v1`, four hooks
  through the pure `liveOrMock()` helper, `DataSourceBadge`. Workspace + connections resolve live from
  Neon; KPIs/recs run the tested `lib/logic` engines over ported mock data until M2 ships those routes.
  Middleware guards `/growth-hub`. Full build green; 53 web tests pass (incl. `liveOrMock`).
