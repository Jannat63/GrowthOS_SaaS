# P3.5 — Agency Features — Progress

Status: [x]  ·  Updated: 2026-07-22  ·  **Complete** — Slices A + B + C1 + C2 all done. P3.5 closed.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| A — Recommendation collaboration | [x] | Comments + assignment; `/recommendations` unified queue page. |
| B — Audit log | [x] | `audit_logs` + best-effort write hooks + read endpoint + Settings activity section. |
| C1 — White-label branding | [x] | `white_label_config` on workspaces; agency name/logo/accent applied to the shell; admin Settings form. |
| C2 — White-labeled PDF export | [x] | `GET .../reports/weekly.pdf` renders the Weekly Intelligence Report to a branded PDF (react-pdf, **no headless browser**) and streams it as a download; `/intelligence` "Export PDF" button. |

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
| API | `apps/api/src/reports/weekly-pdf.ts` — `renderWeeklyReportPdf(report, branding)` (react-pdf → Buffer); `GET .../reports/weekly.pdf` route in `v1.ts` (membership-guarded, streams `application/pdf` as attachment, audited `report.exported`) | 3 ✓ |
| Web | `/intelligence` "Export PDF" button — authenticated blob fetch → browser download | typecheck ✓ |
| Deps | `@react-pdf/renderer` + `react`/`@types/react` (aligned to **React 19** to match the monorepo and avoid a duplicate drizzle-orm peer-variant) | — |

**Decisions (revised from plan):** (1) **react-pdf, not Puppeteer** — pure JS, no bundled Chromium, renders
straight to a Buffer we stream; fits "Fastify never does heavy work" better than launching a browser.
(2) **Stream direct, no R2** — no external Cloudflare creds needed; `renderWeeklyReportPdf` is the seam a
future R2 uploader would call. (3) Guarded by membership like the report route; **Growth+ plan-gating is a
flagged follow-up** for when billing (M5) lands.

## Verification
`apps/api` typecheck clean; `apps/api` tests **38/38** (incl. 3 new renderer tests asserting a valid `%PDF`
header, with/without branding, and empty-report). `apps/web` typecheck clean. Renderer runs headless-free.

## Log
- 2026-07-18 — Slice A (recommendation collaboration) built + committed. P3.5 opened.
- 2026-07-18 — Slice B (audit log) built + committed.
- 2026-07-18 — Self-audit hardening (audit-log authz + assignee validation) committed.
- 2026-07-18 — Slice C1 (white-label branding) built + committed. Only C2 (PDF export, infra-blocked) left.
- 2026-07-22 — Slice C2 (white-labeled PDF export) built via react-pdf (no Puppeteer/R2). **P3.5 complete.**
