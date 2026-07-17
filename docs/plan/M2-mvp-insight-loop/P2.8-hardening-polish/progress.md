# P2.8 — Progress

Status: [x]  ·  Updated: 2026-07-17  ·  **Done (recommended passes; PDF deferred).**

| Item | Status | Notes |
|------|--------|-------|
| Security pass | [x] | `@fastify/rate-limit` (200/min → `RATE_LIMITED` envelope); every data route already `requireWorkspaceMember`-scoped. |
| Perf pass | [x] | Generator inserts batched (2N → 2 round-trips); dashboards render on seeded data. |
| Workspace settings (members/roles) | [x] | `GET /workspaces/:id/members` + Settings page (workspace info + team roles). |
| White-label PDF export (Puppeteer) | [–] | Optional / nice-to-have → deferred. |
| Invites (Resend email) | [–] | → M5 (lifecycle emails). |

## Log

- 2026-07-05 — Plan created (was "Billing, plan limits, launch readiness").
- 2026-07-12 — **Rescoped.** Billing / Stripe / plan limits / customer portal / trial emails moved
  out to the new **M5 — Launch & Monetization** (not launching this season). This phase is now
  hardening + polish only (security, perf, workspace settings, optional PDF). Folder renamed
  `P2.8-billing-launch` → `P2.8-hardening-polish`.
- 2026-07-17 — **P2.8 complete → M2 COMPLETE.** Rate limiting + batched-insert perf pass + workspace
  settings page (members/roles). PDF export + Resend invites deferred (optional / M5). **M2 (the seeded
  Insight Loop MVP) is done.** Next milestone: **M3 — real OAuth + live data**.
