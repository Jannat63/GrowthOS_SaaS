# P3.5 — Agency Features — Progress

Status: [~]  ·  Updated: 2026-07-18  ·  **In progress** — Slices A + B + C1 done; only white-labeled PDF
export (C2, infra-blocked) remains.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| A — Recommendation collaboration | [x] | Comments + assignment; `/recommendations` unified queue page. |
| B — Audit log | [x] | `audit_logs` + best-effort write hooks + read endpoint + Settings activity section. |
| C1 — White-label branding | [x] | `white_label_config` on workspaces; agency name/logo/accent applied to the shell; admin Settings form. |
| C2 — White-labeled PDF export | [ ] | **Deferred (infra):** Puppeteer + Cloudflare R2. Slots in with the report-export work. |

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

## Log
- 2026-07-18 — Slice A (recommendation collaboration) built + committed. P3.5 opened.
- 2026-07-18 — Slice B (audit log) built + committed.
- 2026-07-18 — Self-audit hardening (audit-log authz + assignee validation) committed.
- 2026-07-18 — Slice C1 (white-label branding) built + committed. Only C2 (PDF export, infra-blocked) left.
