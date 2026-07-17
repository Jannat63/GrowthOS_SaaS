# M3 — Progress

Status: [~]  ·  Updated: 2026-07-17  ·  **In progress** — phase folders created; P3.0 building.

Phases expanded to folders (`P3.0-real-integrations/` … `P3.5-agency/`). First real provider = **Google
Search Console**. Build order: P3.0 → then the non-blocked phases (P3.4, GSC-slice of P3.1, P3.5) while
Meta/Ads/DataForSEO approvals mature → then P3.2/P3.3.

| Item | Status | Notes |
|------|--------|-------|
| P3.0 Real platform integrations (OAuth) | [~] | **Building.** Custom OAuth → `platform_connections`; GSC first; live sync → ClickHouse. |
| P3.1 SEO module | [ ] | Outline. GSC-fed slice buildable now; DataForSEO features gated (paid). |
| P3.2 Google Ads module | [ ] | Outline. Gated on Google Ads dev token. |
| P3.3 Meta Ads module | [ ] | Outline. Gated on Meta App Review. |
| P3.4 Intelligence Engine V1 | [ ] | Outline. Non-blocked — extends M2 engine to 47 rules + scheduling + WS. |
| P3.5 Agency features | [ ] | Outline. Non-blocked — white-label, comments/tasks, audit log. |

## Log

- 2026-07-05 — Plan created.
- 2026-07-12 — Added **P3.0 Real platform integrations (OAuth)** — the real-OAuth work deferred out of
  M2 (which runs on seeded data).
- 2026-07-17 — **M3 started.** Expanded P3.0–P3.5 into phase folders (plan + progress each). Decided:
  Google Search Console first; custom OAuth into `platform_connections` (not Better Auth); API-side live
  sync into ClickHouse. **P3.0 build in progress.**
