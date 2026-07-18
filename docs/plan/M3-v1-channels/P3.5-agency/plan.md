# P3.5 — Agency Features  (outline — buildable now, no external API)

Milestone: M3 · Depends on: M1 Better Auth org roles

## Goal
Agency power-user features: white-label reports, team collaboration (comments + task assignment on
recommendations), per-workspace audit log, multi-workspace UI polish.

## Scope
- **White-label:** `workspaces.white_label_config` JSONB ({logo_url, primary_color, domain}); apply to
  the app shell + PDF reports for Growth+ tiers (plan gating already in `packages/types` plans).
- **Team collaboration:** comments + task assignment on recommendations. **New tables needed** (gap — not
  in the blueprint DATA_MODELS): design `recommendation_comments` and `recommendation_tasks` (assignee,
  status, due). Roles via Better Auth org plugin (owner/admin/manager/viewer/client).
- **Audit log:** `audit_logs` (action, entity_type, before/after JSONB, ip, user_agent; index
  workspace+created_at) + write hooks on mutating routes + a read endpoint + UI.
- **White-labeled PDF export** (Puppeteer) → R2 (free tier). **Multi-workspace UI polish.**

## Tables / endpoints
- Neon: `workspaces.white_label_config`, `audit_logs`, `recommendation_comments`, `recommendation_tasks` (new).
- API (new — undefined in blueprint, design here): comment CRUD, task CRUD, `GET /audit-logs`, `POST /reports`.

## External
None. Cloudflare DNS (in stack) for white-label domains; R2 for PDF assets.

## Recommendation
Buildable without approvals — good to interleave after P3.4. Flag the new comments/tasks/audit table +
endpoint designs (blueprint gaps) up front.

---

## Build slices (2026-07-18)

Split into vertical slices so each ships value independently. See `progress.md`.

- **Slice A — Recommendation collaboration** ✅ (2026-07-18). Comments + assignment on recommendations.
  **Senior decision:** *no separate `recommendation_tasks` table.* A recommendation already carries a
  status lifecycle (pending/acted/dismissed/snoozed), so "task assignment" is an `assigned_to` + `due_date`
  on the recommendation itself; only the discussion thread (`recommendation_comments`) is a new table.
  Avoids a redundant parallel status machine. Delivered the `/recommendations` unified queue page (also
  fulfils the P2.7-deferred unified queue and lights up the "Soon" sidebar item).
- **Slice B — Audit log** (next). `audit_logs` (action, entity_type, before/after JSONB, actor, ip) +
  write hooks on mutating routes + `GET /audit-logs` + UI.
- **Slice C — White-label + PDF export.** `workspaces.white_label_config` applied to shell; white-labeled
  PDF report via Puppeteer → R2. Heavier (new infra) — last.
