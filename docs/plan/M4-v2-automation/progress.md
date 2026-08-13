# M4 — Progress

Status: [~]  ·  Updated: 2026-07-26  ·  **Started early** — P4.1 attribution slice, the Intelligence
Engine rule-set expansion, and P4.4's buildable half (public API) are done; the rest of M4 remains
gated on external providers/write-access or is a larger standalone effort (mobile app).

Rolling-wave — phases expand to folders as reached.

| Item | Status | Notes |
|------|--------|-------|
| P4.1 Cross-channel attribution | [~] | **Engine + comparison UI done** — 5 multi-touch models over conversion paths (`/attribution`). Real path data pending live channel conversions. CRM integrations (HubSpot/Salesforce) mentioned in this phase's original scope are still enum-only placeholders. |
| Intelligence Engine rule-set expansion | [x] | Not a numbered blueprint phase — the roadmap names an aspirational "47 rules" with no enumerated spec anywhere. Expanded from 5 rules to 19 registry entries (20 distinct recommendation outputs) across all 6 channel-pair bridges. See log. |
| P4.2 AI creative automation | [ ] | Outline. Gated on an image/LLM provider (D4 deferred). |
| P4.3 Automated campaign management | [ ] | Outline. Gated on Ads/Meta write access. |
| P4.4 GEO tracking + public API | [~] | **Public API done** (see log) — GEO/AI-citation tracking still needs external access this codebase doesn't have. |
| P4.5 Mobile app | [ ] | Outline. Different scale of effort — a standalone app package, not a slice of this one. |

## P4.1 — what shipped (commit `6873738`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| logic | `engines/attribution.ts` — `modelWeights`, `attribute`, `attributeAll` (last/first-click, linear, time-decay, position-based) + `conversionPaths` fixture | 9 ✓ |
| API | `apps/api/src/attribution.ts` — `getAttribution` over a `conversion_paths` ClickHouse table (CREATE-if-missing + seed); route `GET .../analytics/attribution` | — |
| Web | `/attribution` — model-comparison matrix (channel × model) + focused single-model bars; `useAttribution` (liveOrMock over fixture); sidebar item | build ✓ |

**Design:** models conserve total revenue and keep a consistent channel set (0-credit touches retained),
so the comparison matrix aligns across columns. The touchpoint table is created on demand (not in the
base ClickHouse init) so the feature works without a container reload. Real multi-touch paths replace the
seed once connected channels report conversions.

## Intelligence Engine rule-set expansion — what shipped

| Layer | Artifact | Tests |
|-------|----------|-------|
| logic | `engines/cross-channel-engine.ts` — rewritten as a rule registry (`RULES: Rule[]`, each a small pure `evaluate()` function) instead of one long function. 19 registry entries across all 6 bridges (`SEO→GoogleAds`, `GoogleAds→SEO`, `Meta→SEO`, `SEO→Meta`, `GoogleAds→Meta`, `Meta→GoogleAds`); the blended-MER rule produces one of two distinct outputs depending on data, for 20 recommendation types total. New `listRules()` export for introspection. | 37 ✓ |
| API + Web | `recommendations.ts` and `useRecommendations.ts` updated to the new `EngineSignals` object signature, now also passing `adCampaigns`/`metaCampaigns` (run through the existing `analyzeCampaigns`) alongside the original keywords/searchTerms/creatives — both call sites stay in sync since both read the same `@growthos/logic/fixtures`. | 1 ✓ (recommendations.test.ts) |

**Why not exactly 47:** checked every blueprint doc — the number appears once, in `ROADMAP.md`, as an
unenumerated checkbox. There's no real spec to hit. Padding to an arbitrary count with near-duplicate
rules would have made the recommendation feed noisier, not smarter — see the file's own header
comment for the full reasoning.

**New bridges added:** the original 5 rules only covered `SEO↔GoogleAds`, `Meta→SEO`, and `SEO→Meta`.
Added `GoogleAds→Meta` and `Meta→GoogleAds` (3 rules each) plus a cross-cutting blended-MER rule whose
direction is data-driven (points at whichever channel currently has the smaller spend share).

**Honest limitation, same as fatigue alerts:** all of this still runs over the same static
`@growthos/logic/fixtures` data the original 5 rules used — real richness shows up once live
Google Ads/Meta/GSC data replaces the fixtures. More rules produce better recommendations *whenever*
they run; it doesn't change *how often* they run (see the scheduler note below for that).

## Public API — what shipped (P4.4's buildable half)

| Layer | Artifact | Tests |
|-------|----------|-------|
| DB | `packages/db/src/schema/api-keys.ts` — `api_keys` table (SHA-256 hash only, never the plaintext; migration `0011_api_keys.sql`) | — |
| API | `apps/api/src/api-keys.ts` — `createApiKey` (gated behind `assertFeatureEnabled(..., 'apiAccess')`, Scale plan), `listApiKeys`, `revokeApiKey`, `resolveApiKey` (Bearer-token lookup) | 9 ✓ |
| API | `apps/api/src/routes/public-api.ts` — `GET /api/public/v1/{recommendations,keywords,reports/weekly}`, Bearer-authenticated via a `preHandler`, versioned separately from the internal `/api/v1` the web app uses | 6 ✓ |
| API | `@fastify/swagger` + `@fastify/swagger-ui` registered in `app.ts` — OpenAPI spec generated from the routes' own schemas (can't drift out of sync), docs UI at `/api/public/v1/docs` | — |
| API | 3 new key-management routes on `/api/v1/workspaces/:id/api-keys` (create/list/revoke), cookie-session authenticated, admin+, audit-logged | — |
| Web | `useApiKeys`/`useCreateApiKey`/`useRevokeApiKey` hooks + `ApiKeysSection.tsx` in Settings — create (plaintext shown once), list (metadata only), revoke | build ✓ |

**Verified with a real end-to-end run**, not just typecheck: signed up a real user, created a workspace
(starts on the Growth trial), attempted to create a key → real `402 PLAN_LIMIT_REACHED`; upgraded the
workspace to Scale in the DB → key creation succeeded; called the public API with the real returned key
→ real `200` with actual recommendation data (29 recommendations, confirming the expanded rule engine
runs correctly through this whole path); revoked the key → immediate `401` on the next call.
`keywords`/`reports/weekly` need ClickHouse, unavailable in this dev sandbox — same pre-existing,
already-documented limitation as every other ClickHouse-dependent route in this codebase.

**Real bug caught before shipping:** the first cast-based attempt to attach `workspaceId` to the
Fastify request (`request as FastifyRequest & { workspaceId: string }`) failed to typecheck — each
route's inline `schema` block gives it a distinct `FastifyRequest` generic, so a blanket cast isn't
type-sound. Fixed with the standard Fastify pattern instead: `declare module 'fastify' { interface
FastifyRequest { workspaceId?: string } }`.

## Log

- 2026-07-05 — Plan created.
- 2026-07-18 — **P4.1 attribution slice** built + committed (engine + comparison UI). M4 opened early as
  a non-blocked path while M3 live features wait on external credentials/approvals.
- 2026-07-26 — **Scheduler** built (not a numbered M4 phase — cross-cutting infra; see
  `apps/api/src/scheduler.ts`). Lightweight `node-cron`-based, in-process, registered from `index.ts`
  only (never `app.ts`/tests). Wires `checkTrialsEndingSoon` (daily @ 09:00 UTC) and
  `getWeeklyReport`-per-workspace refresh (every 4h) — both genuinely benefit from periodic execution.
  Deliberately does NOT wire `ensureFatigueAlerts`: its `if (existing.length > 0) return` design means
  re-running it is a guaranteed no-op for any workspace already past onboarding, and it runs over a
  static fixture besides — scheduling a no-op would misrepresent it as working. 3 tests, including one
  that proves per-workspace error isolation using a *real* ClickHouse failure (unavailable in this
  sandbox) rather than a stubbed one — 3/3 seeded workspaces failed independently and the loop
  completed without throwing.
- 2026-07-26 — **Intelligence Engine rule-set expansion** and **Public API** (P4.4 buildable half)
  built — see sections above. Full backend suite re-run clean after each (82, then 97 tests passed;
  same 5-6 pre-existing infra-only failures — ClickHouse, Redis, missing `OAUTH_STATE_SECRET` — seen
  in every prior test run of this project, zero regressions). Real Next.js production build succeeded
  after each change (27, then 24 routes — route count differs run to run based on which marketing
  pages are present in the working tree at build time, not a regression).
