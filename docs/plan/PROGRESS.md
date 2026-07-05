# GrowthOS — Master Progress Dashboard

Overall status: **🟨 In progress** — M0 done; M1 underway (Neon connected, P1.1 complete, Better Auth
next); M2–M4 not started.  ·  Updated: 2026-07-05

Status legend: `[ ]` Not started · `[~]` In progress · `[x]` Done · `[!]` Blocked (note blocker)

## M0 — Foundation & Restructure  🟨 In progress

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P0.1 | Monorepo & legacy | [x] | Code moved to `/legacy`; blueprint imported; DECISIONS.md written. |
| P0.2 | API + web scaffold | [x] | Turborepo + `packages/config`; Fastify `/health` verified; `apps/web` builds. |
| P0.3 | Planning system | [~] | This `docs/plan/` structure. |

## M1 — Platform Spine  🟨 In progress

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P1.1 | packages/db (Drizzle + Neon) | [x] | Tenancy schema live on Neon; migration applied; write/read verified. |
| P1.2 | Better Auth + workspaces | [ ] | Unblocked. Next up. |
| P1.3 | Fastify domain skeleton | [ ] | Unblocked. Depends on P1.2. |
| P1.4 | Web re-point to api | [ ] | Depends on P1.2. |
| P1.5 | shadcn/ui foundation | [ ] | No Neon needed — parallelizable, can start anytime. |

## M2 — MVP: The Insight Loop  ⬜ Not started

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P2.1 | Worker & data plumbing | [ ] | Prereqs: Python 3.12 (current 3.14); Docker for local ClickHouse; Upstash Redis broker. |
| P2.2 | Onboarding Wizard | [ ] | |
| P2.3 | Paid-to-Organic Bridge | [ ] | |
| P2.4 | Organic-to-Paid Bridge | [ ] | |
| P2.5 | Creative Fatigue Monitor | [ ] | |
| P2.6 | Blended MER Dashboard | [ ] | |
| P2.7 | Unified Dashboard + notifications | [ ] | |
| P2.8 | Billing, plan limits, launch readiness | [ ] | |

## M3 — V1: Full Channel Coverage  ⬜ Not started (outline only)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P3.1 | SEO module | [ ] | Outline — expand to folder when reached. |
| P3.2 | Google Ads module | [ ] | Outline — expand to folder when reached. |
| P3.3 | Meta Ads module | [ ] | Outline — expand to folder when reached. |
| P3.4 | Intelligence Engine V1 | [ ] | Outline — expand to folder when reached. |
| P3.5 | Agency features | [ ] | Outline — expand to folder when reached. |

Gate: 500 users / MRR >$50K / agency tier.

## M4 — V2: Automation & Scale  ⬜ Not started (outline only)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P4.1 | Cross-channel attribution | [ ] | Outline — expand to folder when reached. |
| P4.2 | AI creative automation | [ ] | Outline — expand to folder when reached. |
| P4.3 | Automated campaign management | [ ] | Outline — expand to folder when reached. |
| P4.4 | GEO tracking + public API | [ ] | Outline — expand to folder when reached. |
| P4.5 | Mobile app | [ ] | Outline — expand to folder when reached. |

Gate: 2,000 users / MRR >$200K.

## Known blockers

| Blocker | Affects |
|---------|---------|
| ~~Neon connection string~~ | ✅ Resolved 2026-07-05 — connected, P1.1 live. |
| Python 3.12 (current is 3.14) | P2.1 |
| Docker not installed (local ClickHouse) | P2.1 |
| Upstash Redis account (job broker) | P2.1 |
