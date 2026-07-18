# P3.5 — Agency Features — Progress

Status: [~]  ·  Updated: 2026-07-18  ·  **In progress** — Slices A + B done; white-label PDF remains.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| A — Recommendation collaboration | [x] | Comments + assignment; `/recommendations` unified queue page. |
| B — Audit log | [x] | `audit_logs` + best-effort write hooks + read endpoint + Settings activity section. |
| C — White-label + PDF export | [ ] | `white_label_config` on shell; Puppeteer PDF → R2. Heavier — last. |

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

## Log
- 2026-07-18 — Slice A (recommendation collaboration) built + committed. P3.5 opened.
- 2026-07-18 — Slice B (audit log) built + committed.
