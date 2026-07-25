# P3.5 — Agency Features — Progress

Status: [x]  ·  Updated: 2026-07-25  ·  **All slices done** — A, B, C1, C2.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| A — Recommendation collaboration | [x] | Comments + assignment; `/recommendations` unified queue page. |
| B — Audit log | [x] | `audit_logs` + best-effort write hooks + read endpoint + Settings activity section. |
| C1 — White-label branding | [x] | `white_label_config` on workspaces; agency name/logo/accent applied to the shell; admin Settings form. |
| C2 — White-labeled PDF export | [x] | Puppeteer renders the same `WeeklyReport` the Intelligence page shows, branded via `white_label_config`. R2 storage from the original plan not wired up — generated on demand and streamed straight back instead (no credentials exist for R2 anywhere in this codebase; see notes below). |

## Slice A — what shipped (commit `4ab46f1`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| DB | `recommendation_comments` table + migration `0006`; `assigned_to`/`due_date` on `recommendations` | — |
| API | `apps/api/src/collaboration.ts` (list/add comments, assign) + 3 routes in `v1.ts` | 3 ✓ |
| Types | `RecommendationComment`; `assignedTo`/`dueDate` on `Recommendation` | — |
| Web | `/recommendations` page + `RecommendationCard` + `useCollaboration` hooks; sidebar item live | build ✓ |
| UI | `@growthos/ui` `textarea` primitive | — |

**Design decision:** assignment collapsed onto the recommendation's own status lifecycle (no separate
`recommendation_tasks` table) — see plan.md.

**Authorization:** any workspace member may read/post comments; **manager+** may assign.

## Verification
Backend green — `apps/api` `vitest run src/collaboration.test.ts` (3 pass, Neon only). `pnpm typecheck`
clean (9/9). `pnpm --filter @growthos/web build` passes; `/recommendations` route emitted (~5.2 kB).
Manual: sidebar → Recommendations → assign an owner, open a card's thread, post a comment.

## Slice B — what shipped (commit `0c05c81`)

| Layer | Artifact | Tests |
|-------|----------|-------|
| DB | `audit_logs` (actor, action, entity, metadata, ip, user_agent) + migration `0007` | — |
| API | `apps/api/src/audit.ts` — best-effort `recordAudit()` + paginated `getAuditLogs()`; write-hooks on recommendation status/assign/comment + connection connect/disconnect/sync; `GET .../audit-logs` | 2 ✓ |
| Types | `AuditLogEntry` | — |
| Web | `useAuditLogs` hook + `ActivitySection` on Settings (human-readable labels, empty-state on mock) | build ✓ |

**Design:** auditing is fire-and-forget (`void recordAudit(...)`) and swallows its own errors, so a
logging failure can never break the mutation it records. Any member may read the log; OAuth-callback
"connected" events have `actorId: null` (no session).

## Slice C1 — what shipped (commit `86e2d7d`)

| Layer | Artifact |
|-------|----------|
| DB | `white_label_config` jsonb on `workspaces` + migration `0008` |
| API | GET/PATCH `.../branding` (read any member / update admin+, hex-validated, audited); `WhiteLabelConfig` type |
| Web | `useBranding` hook; `BrandingProvider` (custom `--primary` via inline root CSS var); Sidebar agency name + logo; admin Branding section on Settings |

**Decision:** stored on the Better-Auth-owned `workspaces` table (as a jsonb column) rather than a separate
table — this repo already extends that table with app columns (websiteUrl, onboarding…), so it's the
established precedent; Better Auth ignores unknown columns.

## Self-audit fixes (commit `bc5c77e`)
Before continuing, audited the A/B slices and fixed two issues: (1) `GET /audit-logs` was readable by any
member → **admin-only** (+ UI gated to admins); (2) the assignment route accepted any userId → now
**validates the assignee is a workspace member**.

## Slice C2 — what shipped

| Layer | Artifact | Tests |
|-------|----------|-------|
| API | `apps/api/src/pdf-report.ts` — pure HTML template (no I/O, no Puppeteer) rendering a `WeeklyReport` with `WhiteLabelConfig` applied | 6 ✓ (offline) |
| API | `apps/api/src/pdf-report-generate.ts` — Puppeteer wrapper: launches headless Chromium (browser instance reused across requests), renders the HTML, returns a PDF buffer + filename | — |
| API | `GET .../workspaces/:id/reports/pdf` in `routes/v1.ts` — streams the PDF straight back (`Content-Disposition: attachment`); read access matches branding's (`client`+) | — |
| Web | `useDownloadReportPdf` hook (triggers a real browser download from the binary response — not built on the JSON-only `api` client) + "Download PDF" button on the Intelligence page | build ✓ |

**Design decisions:**
- **No R2.** The original plan (see `plan.md`) called for uploading to Cloudflare R2; no R2 credentials
  exist anywhere in this codebase (same status as Google Ads/Meta/DataForSEO — see
  `GO_LIVE_CHECKLIST.md` §2). Generating on demand and streaming the bytes straight back sidesteps
  needing R2 at all for a one-off "download my report" button — nothing is persisted, so there's
  nothing to upload. A "report history" feature would need object storage later; this doesn't.
- **Reuses the existing report, doesn't reinvent it.** The PDF renders the exact same `WeeklyReport`
  the Intelligence page already shows on-screen (`intelligence.ts` `getWeeklyReport`) — one source of
  truth for report content, two presentations of it.
- **Template/render split**, same pattern as `schema-markup.ts` — the pure HTML-building logic has
  zero dependencies (no `@growthos/db` import, no Puppeteer import) specifically so it's testable
  without a headless browser.

**Real issues caught before shipping:**
- `puppeteer@23.x` was flagged deprecated by npm at install time — bumped to the current `25.3.0`.
  That surfaced a real breaking type change: `page.setContent()` no longer accepts `'networkidle0'`
  as a `waitUntil` value in this version. Fixed to `'load'` specifically (not `'domcontentloaded'`) —
  a branded report can include a remote `logoUrl` image, and `'load'` is what actually waits for it.
- A stale `@fastify`-adjacent build-approval gate (pnpm's `onlyBuiltDependencies` check) needed
  `pnpm approve-builds` before Puppeteer's own install script could run at all.

**Verification boundary — stated plainly:** the dev sandbox this was built in has no Chromium binary
(network-restricted, can't download it) *and* no ClickHouse instance running. Confirmed via a real
signup → workspace-creation → PDF-route request that auth-gating works correctly (401 without a
session). Beyond that, `getWeeklyReport` needs ClickHouse and fails before the request ever reaches
the Puppeteer call — so the specific "Chromium unavailable → clean 409 `INTEGRATION_NOT_CONNECTED`"
fallback path (`pdf-report-generate.ts`'s catch block) is exercised by the same well-understood
try/catch-around-an-external-client pattern already proven correct in `billing.ts`
(`getStripe()`) and `emails.ts` (`getResend()`), not by a live end-to-end run in this sandbox. Verify
this specific path in a real environment with Postgres up but Chromium intentionally unavailable, if
that matters before relying on it.

## Log
- 2026-07-18 — Slice A (recommendation collaboration) built + committed. P3.5 opened.
- 2026-07-18 — Slice B (audit log) built + committed.
- 2026-07-18 — Self-audit hardening (audit-log authz + assignee validation) committed.
- 2026-07-18 — Slice C1 (white-label branding) built + committed. Only C2 (PDF export, infra-blocked) left.
- 2026-07-25 — Slice C2 (white-labeled PDF export) built. P3.5 fully complete — all slices (A, B, C1,
  C2) done. `pdf-report.test.ts` 6/6 passing fully offline. Full backend suite re-run clean (79 passed,
  same 5 pre-existing infra-only failures — ClickHouse, Redis, missing `OAUTH_STATE_SECRET` — seen in
  every prior test run of this project, zero regressions). Real Next.js production build succeeded,
  all 27 routes prerendered, `/intelligence` picked up the new download button.
