# Frontend Rebuild — Slice 2: Dashboard shell + Growth Hub (+ P1.4b)

Date: 2026-07-11 · Branch: `shihab-restructure` · Status: approved direction, spec for review

## Goal

Stand up the authenticated product surface: a dashboard **shell** (rail / topbar / module tabs) and the
first module page, **Growth Hub**, backed by a `lib/api` + `lib/hooks` data layer that follows the
**live→mock fallback** pattern. This is the slice that P1.4b ("re-point dashboard data to `/api/v1`")
depends on — P1.4b is its tail end, not a standalone task.

## Scope (agreed)

- **Shell + one module** (Growth Hub). No other legacy modules ported in this slice.
- **Port only the mock data Growth Hub needs** (start with `growth-hub.ts` + whatever the reused
  `lib/logic` engines consume). Keep `lib/mock-data` lean; add more when later modules land.
- **Full design pass** — on-brand with the existing "insight loop" identity (indigo/green/ink,
  Space Grotesk + Inter, Tailwind v4 tokens in `globals.css`, shadcn primitives from `@growthos/ui`).

## The honest data situation

The only real `/api/v1` endpoints today are `auth/me`, `GET/POST /workspaces`, and
`GET /workspaces/:id/connections`. The domain data endpoints a dashboard wants (recommendations,
search-terms, MER, fatigue) are **M2 work and do not exist yet**. So in this slice:

- **Genuinely live:** workspace identity (from `auth/me` → memberships) and channel connection state
  (from `/workspaces/:id/connections`).
- **Mock (badged):** KPIs (Blended MER, revenue, spend, organic) and the cross-channel recommendation
  queue — produced by the ported `lib/logic` engines over `lib/mock-data`.

Every hook returns `{ data, source: "live" | "mock" }`; a `DataSourceBadge` surfaces which was used. When
the M2 endpoints ship, the *hook* changes and the UI doesn't. That is exactly P1.4b's pattern, proven now
on the two endpoints that are real.

## Design — "The Loop, operationalized"

The landing page's thesis is that GrowthOS is *one loop* (SEO → Google Ads → Meta Ads feeding a shared
hub). The dashboard makes that literal rather than shipping the generic sidebar + stat-grid template.

**Signature — the Loop Masthead.** The Growth Hub opens with a compact live **orbit**: three channel
nodes (SEO · Google Ads · Meta Ads) around a central **Blended MER** hub, connected by the landing's
flowing-dash arc (`loop-flow` keyframe, already in `globals.css`). It is functional, not decorative:

- Each channel node shows its **live connection state** (from `/workspaces/:id/connections`) + one
  headline metric.
- The central hub shows Blended MER (mock, badged).
- Hovering a **recommendation** in the queue lights the arc between its source and target channel — so
  the loop visibly *is* the recommendations. This is the one bold element; everything else stays quiet.

**Shell.**
- **Left rail** on the **ink** surface (deep indigo — the landing's "night" band becomes the persistent
  nav): icon + label nav, collapsible. Instantly ties the app to the brand.
- **TopBar** (light): workspace switcher (live from `auth/me` memberships), global `DataSourceBadge`,
  user menu (sign out via Better Auth).
- **ModuleTabs**: in-module sub-nav (Overview · Recommendations · Channels for Growth Hub).

**Type.** KPI values and the MER hub number use **Space Grotesk** with `tabular-nums` — confident
figures. Eyebrows/labels use Inter uppercase, tracked wide. Body in Inter.

**Button fix (applies to landing too).** The shared `@growthos/ui` primary button was a flat, fully
saturated indigo block — the templated-default look the user flagged. Refined the `default` variant with
subtle depth (`shadow-sm` → `hover:shadow-md`), a crisp inset edge (`ring-1 ring-inset ring-white/15`),
and a gentle press micro-interaction (`active:translate-y-px`). Because it is the shared primitive, the
fix lands on the landing header and the whole dashboard at once.

## Structure & files

```
apps/web/
  app/(dashboard)/
    layout.tsx                 # shell: rail + topbar + tabs; requires session (middleware)
    growth-hub/page.tsx        # Growth Hub module
  components/
    layout/
      Sidebar.tsx              # ink rail, collapsible
      TopBar.tsx               # workspace switcher + DataSourceBadge + user menu
      ModuleTabs.tsx           # in-module sub-nav
    dashboard/
      LoopMasthead.tsx         # the signature orbit (channels ↔ MER hub, arc-lighting on rec hover)
      KpiCard.tsx              # single KPI (display-face value + label + delta)
      RecommendationQueue.tsx  # cross-channel rec list, hover → arc highlight
      DataSourceBadge.tsx      # live | mock indicator
  lib/
    api/client.ts              # fetch wrapper → NEXT_PUBLIC_API_URL/api/v1, credentials: include, timeout
    hooks/
      useWorkspace.ts          # LIVE: auth/me → active workspace + memberships
      useConnections.ts        # LIVE: /workspaces/:id/connections
      useGrowthHub.ts          # MER + KPIs (mock via lib/logic + lib/mock-data)
      useRecommendations.ts    # cross-channel recs (mock via cross-channel-engine)
    mock-data/
      growth-hub.ts            # ported, trimmed to what the hub needs
      (seo.ts / google-ads.ts / meta-ads.ts inputs the engines require, as needed)
```

- `middleware.ts` extends its matcher to guard `/growth-hub` (and the dashboard group) with the Better
  Auth session, same pattern as the onboarding routes.
- New shadcn primitives pulled into `@growthos/ui` only if needed (e.g. `avatar`, `badge`, `skeleton`,
  `tooltip`) — shadcn-first, no new libraries.

## Data flow

`page.tsx` (client) → feature hook (`useGrowthHub`, etc.) → tries `lib/api/client` against `/api/v1` →
on failure runs the matching `lib/logic` engine over `lib/mock-data` → returns `{ data, source }` →
component renders + `DataSourceBadge` shows the source. TanStack Query caches; Zustand holds active
workspace id (client state) once selected.

## Error / empty / loading states

- **Loading:** shadcn `skeleton` placeholders for KPI cards, masthead nodes, and the queue.
- **Live failure:** silent fallback to mock (by design) — the badge flips to "mock", no error toast.
- **Empty recs:** the queue shows a direction-giving empty state ("No cross-channel moves right now —
  connect a channel to start the loop."), not a blank panel.
- **No workspace / not a member:** dashboard redirects to onboarding `create-workspace`.

## Testing

- Vitest unit tests for the hooks' fallback contract: when the API client rejects, the hook resolves
  `source: "mock"` with engine output; when it resolves, `source: "live"`. Mock `lib/api/client`.
- The `lib/logic` engines are already tested — not re-tested here.
- Manual: sign in → land on Growth Hub; workspace name + connection nodes render **live**; KPIs/recs
  render **mock** with the badge; hovering a rec lights its arc.

## Out of scope (YAGNI for this slice)

- The other ~14 legacy modules.
- Real recommendation / MER / search-terms endpoints (M2).
- WebSocket / real-time notifications (M2 P2.7).
- Billing, settings, integrations OAuth (later phases).

## P1.4b closure

When this slice lands, P1.4b is satisfied: the dashboard data layer exists, is wired to `/api/v1` for
the endpoints that are real, and preserves the live→mock fallback + `DataSourceBadge`. Remaining domain
hooks flip from mock to live automatically as M2 ships their endpoints — no UI rework.
