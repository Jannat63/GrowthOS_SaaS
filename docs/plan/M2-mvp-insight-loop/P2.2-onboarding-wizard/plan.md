# P2.2 — Onboarding Wizard

Milestone: M2 · Depends on: P2.1 · Prerequisites: Neon URL · worker (P2.1)

## Goal

Take a new user from a URL through crawl → strategy → a dashboard seeded with 5 recommendations via
a 7-step onboarding wizard.

## Subphases

- [ ] Add onboarding fields to the `workspaces` table.
- [ ] Build wizard steps 1–7 (the auth pages business-info / connect-accounts / create-workspace /
  onboarding-complete already exist).
- [ ] Add the site-crawler worker (reuse `legacy/services/seo-service/crawler.py` as-is).
- [ ] Generate channel-mix + 90-day strategy (deterministic templates now, Claude later behind a
  flag — Decision D4).
- [ ] Add pixel / tag validators.
- [ ] Land the user on the dashboard with 5 seeded recommendations.

## Reuse

- `legacy/services/seo-service/crawler.py` → as-is (site-crawler worker).
- Existing auth pages (business-info, connect-accounts, create-workspace, onboarding-complete) → as-is.

## Surface

- `workspaces` table — onboarding fields.
- Wizard UI — steps 1–7 (`apps/web` onboarding pages).
- Worker: site crawler (`legacy/services/seo-service/crawler.py`).
- Strategy generation: channel-mix + 90-day plan (templates, Claude behind flag per D4).
- Pixel/tag validators.

## Verification

- The flow URL → crawl → strategy → dashboard-with-recs completes end-to-end.
