# GrowthOS — Project Roadmap

**Version:** 1.0  
**Last updated:** July 2026

---

## Overview

The roadmap is structured into three phases. Each phase has hard success criteria before proceeding to the next. We build only what proves the thesis at each stage.

```
Phase 1: MVP (Months 1–4)     → Prove the insight loop works and users pay for it
Phase 2: V1  (Months 5–9)     → Full A-to-Z channel coverage, agency-ready
Phase 3: V2  (Months 10–15)   → Intelligence automation, attribution, platform moat
```

---

## Phase 1 — MVP (Months 1–4)

**Theme:** Prove the cross-channel insight loop  
**Success criteria:** 100 paying users at $79/mo. NPS > 50. Zero churn in first 60 days.

### Month 1 — Foundation

**Engineering (Turborepo setup + core infra)**
- [ ] Initialize Turborepo monorepo with `apps/` and `packages/` structure
- [ ] Scaffold `apps/web` — Next.js 15 app with App Router
- [ ] Scaffold `apps/api` — Fastify + TypeScript API server
- [ ] Scaffold `apps/worker` — Python FastAPI + Celery for background jobs
- [ ] Set up Neon Postgres (production + staging branches)
- [ ] Set up ClickHouse Cloud (analytics database)
- [ ] Set up Upstash Redis (caching + job queue broker)
- [ ] Configure Upstash Kafka (event streaming)
- [ ] Set up Better Auth (email/password + OAuth + MFA, sessions) backed by Neon via Drizzle
- [ ] Configure CI/CD: GitHub Actions → Railway deploy (web + api + worker)
- [ ] Set up Sentry (error tracking, both web and api)
- [ ] Set up Grafana Cloud (free tier metrics)
- [ ] Cloudflare R2 bucket for file storage
- [ ] Stripe integration: subscription plans (Starter / Growth / Scale)
- [ ] Base UI component library in `packages/ui` (shadcn/ui + Tailwind)
- [ ] Shared TypeScript types in `packages/types`
- [ ] Environment variable management (`.env.example` for every app)

**Product**
- [ ] Finalize onboarding UX flow (wireframes approved)
- [ ] Define database schema v1 (users, workspaces, integrations, recommendations)
- [ ] OAuth app registration: Google (Ads + Search Console + GA4) + Meta Business Manager
- [ ] DataForSEO API account + pricing model validated
- [ ] Shopify Partner account created for API access

**Design**
- [ ] Design system tokens defined in `packages/ui`
- [ ] Dashboard shell layout (sidebar nav, header, main content area)
- [ ] Onboarding wizard screens (7 steps)
- [ ] Unified dashboard initial design

---

### Month 2 — Onboarding + Data Connections

**Engineering**
- [ ] Onboarding wizard: step 1–3 (business intake + AI analysis + channel recommendation)
- [ ] Google Search Console OAuth integration + data pull
- [ ] Google Ads OAuth integration + campaign/search terms data pull
- [ ] Meta Business Manager OAuth integration + campaign/ad set data pull
- [ ] Shopify OAuth integration + revenue data pull
- [ ] Website crawler (Playwright headless) for onboarding analysis
- [ ] Claude API integration: channel mix recommendation prompt
- [ ] Claude API integration: 90-day strategy generation prompt
- [ ] Onboarding wizard: step 4–7 (integration setup + tracking check + dashboard)
- [ ] Tracking detection: Meta Pixel validator + Google Ads conversion tag validator
- [ ] Neon schema: users, workspaces, workspace_members, platform_connections
- [ ] Row-level security policies on all workspace-scoped tables
- [ ] Workspace switcher UI (for agency users with multiple clients)

**Product**
- [ ] Internal alpha: 5 team members dogfooding the onboarding flow
- [ ] Fix top 3 onboarding friction points from internal feedback

---

### Month 3 — Core MVP Features

**Engineering**

*Paid-to-Organic Bridge*
- [ ] Celery worker: Google Ads Search Terms Report pull every 4 hours
- [ ] Search term scoring: conversion rate × search volume × SEO coverage gap
- [ ] Claude API: SEO content brief generator from flagged search terms
- [ ] Content Pipeline UI: list view with "Paid-Proven, Organic Needed" tag
- [ ] Dismiss / snooze / act workflow on each recommendation

*Organic-to-Paid Bridge*
- [ ] Celery worker: Google Search Console top pages pull (daily)
- [ ] Claude API: Meta ad creative brief generator from top organic pages
- [ ] Creative Queue UI: hook variations + primary text + CTA per page
- [ ] Reverse loop trigger: Meta CTR > 3% → SEO content brief generation

*Creative Fatigue Monitor*
- [ ] Celery worker: Meta ad set metrics pull every 4 hours
- [ ] Fatigue detection algorithm: frequency > 3 AND CTR decline > 20% WoW
- [ ] Push notification + email (Resend) for fatigue alerts
- [ ] Fatigue alert card UI with creative brief suggestions

*Blended MER Dashboard*
- [ ] MER calculation: total revenue ÷ total ad spend (Google + Meta)
- [ ] 30/60/90-day trend chart (Recharts)
- [ ] Manual revenue entry + Shopify revenue auto-pull
- [ ] MER anomaly detection: alert at > 15% WoW drop
- [ ] Chart annotation system (events, campaign launches)

*Unified dashboard*
- [ ] Cross-channel KPI cards (MER, total spend, total revenue, top recommendation)
- [ ] Recommendation queue (sorted by impact score)
- [ ] Notification center (real-time via WebSocket)

**Product**
- [ ] Closed beta: 20 external users (10 freelancers, 5 SMBs, 5 in-house)
- [ ] Weekly feedback calls — track NPS and top pain points

---

### Month 4 — Polish, Billing & Launch

**Engineering**
- [ ] Stripe subscription flow (trial → paid conversion)
- [ ] Usage metering: recommendation count, AI creative count, keyword count
- [ ] Plan limit enforcement (soft limits with upgrade prompts)
- [ ] White-label report generator (PDF via Puppeteer, agency users only on Growth+)
- [ ] In-app upgrade prompts at limit boundaries
- [ ] Performance audit: all dashboards < 2s load time
- [ ] Security audit: OAuth token storage, RLS verification, API rate limiting
- [ ] Resend email sequences: trial day 1, day 7, day 12, post-trial
- [ ] Workspace settings: member invites, role assignment
- [ ] Billing portal (Stripe customer portal embedded)
- [ ] Help center integration (Intercom or Crisp)

**Product / Marketing**
- [ ] Public launch (Product Hunt, Twitter/X, IndieHackers)
- [ ] Affiliate program setup
- [ ] 14-day trial onboarding email sequence live

**Success gate:** 100 paying users. NPS > 50. Zero churn in 60 days. → Proceed to Phase 2.

---

## Phase 2 — V1 (Months 5–9)

**Theme:** Full A-to-Z channel coverage. Agency-ready.  
**Success criteria:** 500 paying users. MRR > $50K. Agency tier fully launched.

### Month 5–6 — Complete SEO Module

- [ ] DataForSEO integration: keyword research engine (volume, difficulty, CPC, SERP)
- [ ] AI keyword discovery: business description → keyword universe (Claude API)
- [ ] Long-tail keyword finder + competitor keyword gap analysis
- [ ] Keyword clustering (embedding similarity via pgvector on Neon)
- [ ] Rank tracking: daily SERP scraping for up to 2,500 keywords per workspace
- [ ] AI Overview tracker: detect when keywords trigger Google AI Overviews
- [ ] Full site audit: Playwright crawler up to 100K pages
- [ ] Core Web Vitals monitor (Google PageSpeed API)
- [ ] Internal link optimizer
- [ ] Backlink profile analyzer (Majestic or Moz API)
- [ ] Competitor link gap detection
- [ ] Schema markup generator (JSON-LD for Article, FAQ, Product, LocalBusiness, HowTo)
- [ ] Content editor with real-time SEO scoring (Monaco or Tiptap editor)
- [ ] Topical authority builder
- [ ] GEO/AI Citation Tracker: brand mention monitoring in ChatGPT, Perplexity, Gemini, Google AI

### Month 6–7 — Complete Google Ads Module

- [ ] AI Campaign Builder: Google Ads campaign push via API
- [ ] RSA headline generator (15 headlines, 4 descriptions, Ad Strength scoring)
- [ ] Performance Max builder with asset group management
- [ ] AI Max setup guide (migrating from DSA)
- [ ] Bidding strategy advisor (Target CPA / ROAS / Maximize Conversions)
- [ ] Target CPA / ROAS calculator from unit economics inputs
- [ ] Quality Score monitor + improvement recommendations
- [ ] Auction insights tracker
- [ ] Enhanced Conversions setup wizard
- [ ] Consent Mode v2 configuration guide
- [ ] Customer Match manager + CRM sync
- [ ] Deep GA4 integration (audience import + cross-channel path analysis)
- [ ] Wasted spend detector (irrelevant search terms, low QS keywords, cannibalizing campaigns)

### Month 7–8 — Complete Meta Ads Module

- [ ] Full-funnel campaign builder (TOFU/MOFU/BOFU with budget split calculator)
- [ ] Cold audience builder + Lookalike generator (1%, 2%, 3–5% tiers)
- [ ] Custom audience manager + retargeting architecture builder
- [ ] Advantage+ audience setup guide
- [ ] Audience overlap detector (alert when overlap > 20%)
- [ ] AI image ad generator (1:1, 9:16, 1.91:1 Meta sizes)
- [ ] UGC-style video script writer (15s, 30s, 60s formats)
- [ ] Competitor Ad Library analyzer (Meta Ad Library API)
- [ ] CAPI setup wizard (JS snippet, Shopify extension, WordPress plugin)
- [ ] Event Match Quality optimizer + EMQ score monitoring
- [ ] Attribution window advisor
- [ ] Advantage+ Shopping campaign setup
- [ ] Campaign scaling roadmap (20% budget increase intervals)
- [ ] Learning phase tracker

### Month 8–9 — Intelligence Engine V1 + Agency Features

- [ ] 47 cross-channel rules engine (full rule set implementation)
- [ ] Rule evaluation loop: runs every 4 hours, updates recommendations
- [ ] Claude API: human-readable recommendation explanations + action steps
- [ ] Recommendation scoring: impact × effort × urgency composite score
- [ ] Weekly Growth Intelligence Report (generated Sunday 8AM local time via Claude)
- [ ] First-party data orchestrator: Google converters → Meta Custom Audience
- [ ] Budget reallocation engine: cross-channel budget shift recommendations
- [ ] Content-to-Creative pipeline: automated SEO → Meta brief generation
- [ ] White-label reports: custom domain, logo, color scheme for agency users
- [ ] Team collaboration: comments + task assignments on recommendations
- [ ] Audit log: full activity history per workspace
- [ ] Multi-workspace UI polish for agency power users

**Success gate:** 500 paying users. MRR > $50K. Agency tier launched. → Proceed to Phase 3.

---

## Phase 3 — V2 (Months 10–15)

**Theme:** Intelligence automation, full attribution, platform moat  
**Success criteria:** 2,000 paying users. MRR > $200K. Category leader positioning.

### Month 10–11 — Full Cross-Channel Attribution

- [ ] Unified event schema in ClickHouse: all conversion events from Google + Meta + organic + CRM
- [ ] Customer journey reconstruction: full touchpoint path per converting customer
- [ ] Multi-touch attribution model (data-driven, similar to GA4 DDA)
- [ ] Attribution dashboard: each channel's contribution to conversions
- [ ] Blended MER dashboard v2: breakdown by channel, time comparison, budget scenario modeling
- [ ] Attribution model comparison: last-click vs linear vs data-driven (side by side)
- [ ] CRM integration: HubSpot + Salesforce + Klaviyo (closed-loop revenue data)

### Month 11–12 — AI Creative Automation

- [ ] AI image generation pipeline: auto-generate 15–25 variants/week per ad set
- [ ] Image generation integration: Recraft AI or Stability AI API
- [ ] Brand guidelines system: upload colors, fonts, logo → applied to all generated creatives
- [ ] Creative performance prediction model (trained on historical CTR/ROAS data)
- [ ] Video script → storyboard generator (Claude API)
- [ ] UGC hook testing: A/B test multiple hooks automatically, retire losers

### Month 12–13 — Automated Campaign Management

- [ ] AI action mode: platform executes recommendations (not just suggests)
- [ ] Automated: pause underperforming ad sets, increase budget on winners
- [ ] Automated: refresh fatigued creatives without user prompt
- [ ] Automated: add converting search terms to SEO content queue
- [ ] Approval workflow: user sets automation rules, approves batches daily
- [ ] Automation audit log: full history of every automated action taken

### Month 13–14 — GEO Tracking + Public API

- [ ] GEO tracker: daily brand mention monitoring in ChatGPT, Perplexity, Google AI, Gemini
- [ ] GEO ranking: citation frequency trend over time
- [ ] Competitor GEO comparison: who gets cited more and for what content
- [ ] AEO (Answer Engine Optimization) recommendations: content changes to increase AI citations
- [ ] Public API: full REST API available to Scale tier subscribers
- [ ] API documentation (Swagger/OpenAPI spec, developer portal)
- [ ] Webhook system: push events to external tools in real-time

### Month 14–15 — Mobile App

- [ ] iOS app (React Native or Expo): dashboard, recommendations, alerts
- [ ] Android app: same feature set as iOS
- [ ] Push notifications: fatigue alerts, rank drops, MER anomalies
- [ ] Mobile-optimized report viewer

---

## Engineering Milestones

| Milestone | Target Date | Criteria |
|---|---|---|
| Monorepo initialized | Week 1 | All apps scaffold, CI/CD green |
| OAuth connections live | Week 6 | Google + Meta + Shopify auth working |
| MVP 5 features complete | Week 12 | All acceptance criteria passing |
| Closed beta | Week 10 | 20 external users onboarded |
| Public launch | Week 16 | 100 trial signups in first week |
| V1 feature complete | Month 9 | All module features shipped |
| $50K MRR | Month 9 | 500 paying users average $100 ARPU |
| V2 launch | Month 15 | Automation + attribution + mobile live |
| $200K MRR | Month 15 | 2,000 paying users average $100 ARPU |

---

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google Ads API access revocation | Low | Critical | Enterprise developer account, strict TOS compliance |
| Meta Marketing API policy changes | Medium | High | Abstract API layer so switching is contained to one service |
| DataForSEO cost exceeds model at scale | Medium | High | Cap queries per plan tier, negotiate volume pricing at 100 users |
| Rank tracking proxy cost at scale | Medium | Medium | Use DataForSEO SERP API instead of own crawler until $50K MRR |
| Neon Postgres performance at analytics scale | Low | Medium | ClickHouse handles time-series; Neon for relational only |
| Claude API cost at scale (content generation) | Medium | Medium | Haiku for classification, Sonnet only for final output |
| Stripe/payment processing issues | Low | High | Standard Stripe integration, no custom payment flows |

---

## What We Are NOT Building (Ever, or Not Yet)

- A standalone SEO tool (we are not competing with Semrush on depth)
- A standalone Google Ads management tool (we are not competing with Optmyzr)
- A standalone Meta Ads tool (we are not competing with Madgicx)
- LinkedIn Ads, TikTok Ads, Twitter/X Ads — not in scope for any phase
- Email marketing platform — integrations only (Klaviyo, Mailchimp)
- A full CRM — integrations only
- Custom data warehouse / BI tool — ClickHouse covers internal needs

---

## Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | July 2026 | Initial roadmap based on GrowthOS SaaS Blueprint v1.0 |
