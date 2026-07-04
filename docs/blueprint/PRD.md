# GrowthOS — Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Status:** Active  
**Owner:** Product & Engineering

---

## 1. Product Overview

### 1.1 What We Are Building

GrowthOS is a unified SaaS platform that connects SEO, Google Ads, and Meta Ads into a single AI-powered growth operating system. It is the first platform at the $79–$399/month price point to treat all three channels as one shared data brain — where performance data from each channel continuously improves the others.

### 1.2 The Core Problem

Digital marketers managing SEO, Google Ads, and Meta Ads simultaneously use an average of 7+ separate tools. These tools:

- Do not share data with each other
- Contradict each other's attribution numbers
- Require the user to manually connect insights across channels
- Assume prior expert knowledge — no guided workflow exists for non-experts

Enterprise tools (Northbeam, Triple Whale, Smartly.io) solve this at $50,000–$200,000/year. Nothing exists at the SMB price point.

### 1.3 The Solution

The **Three-Channel Insight Loop**: a continuous, automated data exchange between SEO, Google Ads, and Meta Ads modules. Every insight from one channel automatically generates a recommendation in another.

```
SEO rank drops → Google Ads campaign recommended
Google Ads search term converts → SEO content brief created
Meta ad CTR > 3% → SEO article brief generated from winning hook
Top organic page → Meta TOFU campaign brief created
Google converters → Meta Lookalike seed synced automatically
Meta traffic lift → Google Smart Bidding signals improved
```

### 1.4 Target Market

| Segment | Monthly Budget | Willingness to Pay |
|---|---|---|
| Freelancer / Small Agency (3–15 clients) | Tool spend $200–$600/mo | $79–$199/mo |
| Small Business Owner (DIY marketer) | Ad spend $500–$5K/mo | $49–$99/mo |
| In-House Growth Marketer (reports to CMO) | Tool spend $800–$3K/mo | $199–$399/mo |

---

## 2. User Personas

### Persona 1 — Alex, Freelance Digital Marketer

- **Profile:** Solo freelancer, 8 clients, manages SEO + Meta Ads for most of them
- **Current stack:** Semrush ($150) + Canva ($15) + AgencyAnalytics ($80) + Meta Ads Manager (free) = $245/mo
- **Pain:** 25% of billable hours on reporting. Cannot show clients how SEO supports paid results. Loses pitches to agencies with better reporting.
- **Goal:** Replace 4 tools with 1. Generate white-label reports automatically. Get back 8 hours/week.
- **Success metric:** Onboards 3 new clients in 90 days using time saved

### Persona 2 — Sarah, Small Business Owner

- **Profile:** Runs an e-commerce skincare brand. $2,000/month ad budget. No marketing hire.
- **Current stack:** None — runs Google Ads herself, loses money, doesn't know why
- **Pain:** Doesn't know if ads are working. Afraid to spend more. Has tried Semrush but found it overwhelming.
- **Goal:** A guided platform that tells her what to do, why, and whether it's working
- **Success metric:** First profitable Meta campaign within 60 days of signup

### Persona 3 — Marcus, In-House Growth Marketer

- **Profile:** Growth lead at a B2B SaaS company, 40-person team. Manages SEO + Google Ads + Meta Ads solo.
- **Current stack:** Semrush ($250) + GA4 (free) + Northbeam ($2,000) + Google Ads + Meta Ads Manager = $2,250/mo
- **Pain:** Data lives in 5 places. Northbeam is expensive and hard to justify. Leadership doesn't trust the attribution numbers.
- **Goal:** One source of truth. One number for each channel's contribution to revenue.
- **Success metric:** Cancel Northbeam within 90 days of GrowthOS onboarding

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

| Goal | MVP (Month 4) | V1 (Month 9) | V2 (Month 15) |
|---|---|---|---|
| Paying users | 100 | 500 | 2,000 |
| MRR | $8K | $50K | $200K |
| NPS | > 50 | > 55 | > 60 |
| 60-day churn | 0% | < 5% | < 3% |

### 3.2 Product Success Metrics

- **Time to first value:** User sees a cross-channel recommendation within 10 minutes of signup
- **Insight loop activations:** At least 3 cross-channel recommendations acted on per user per month
- **Report generation:** 80% of agency users generating a client report within first week
- **Attribution adoption:** 60% of users using Blended MER as primary ROAS metric within 30 days

---

## 4. Features & Requirements

### 4.1 MVP Features (Month 1–4)

These 5 features are the only ones needed to prove the product thesis. Nothing else ships in MVP.

#### 4.1.1 Unified Onboarding Wizard

**User story:** As a new user, I want to go from entering my website URL to seeing my first cross-channel recommendations in under 10 minutes, without needing any marketing expertise.

**Acceptance criteria:**
- User enters: website URL, business category, monthly marketing budget
- System crawls website and pulls existing Google Search Console data (if connected)
- AI generates channel mix recommendation based on budget and business profile
- AI generates 90-day strategy: top 20 SEO keywords, Meta ad campaign structure, Google Ads keyword list
- User connects Google Ads, Meta Business Manager, Google Search Console via OAuth
- System detects whether Meta Pixel and Google Ads tracking are installed and alerts if missing
- User lands on dashboard with first 5 cross-channel recommendations pre-populated
- **Time limit:** Entire flow completes in < 10 minutes

**Out of scope for MVP:** Custom brand voice setup, CRM connection, e-commerce integration

#### 4.1.2 Paid-to-Organic Bridge

**User story:** As a marketer running Google Ads, I want to automatically discover which search terms are converting in paid so I can create SEO content targeting those exact terms.

**Acceptance criteria:**
- System pulls Google Ads Search Terms Report every 4 hours via Google Ads API
- Each search term is scored on: conversion rate, organic search volume, existing SEO coverage
- Terms that converted in Google Ads AND have no SEO content coverage are flagged as high-priority content opportunities
- Flagged terms appear in the Content Pipeline with label "Paid-Proven, Organic Needed"
- System generates a full SEO content brief for each flagged term (Claude API)
- Terms already ranking #1–3 organically trigger a different recommendation: "Reduce bid — you rank organically"
- User can dismiss, snooze, or act on each recommendation
- Data refreshes every 4 hours; user receives push notification for new high-priority opportunities

#### 4.1.3 Organic-to-Paid Bridge

**User story:** As a marketer with existing organic content, I want to automatically discover which blog posts and pages are proven audience signals that I can use as Meta ad creative briefs.

**Acceptance criteria:**
- System reads top 10 organic pages by traffic from Google Search Console (daily)
- For each top page, system generates a Meta ad creative brief: hook variation, primary text, CTA suggestion
- Brief is tagged with the organic traffic volume that inspired it
- Meta ad hook suggestions appear in the Creative Queue with label "Organic-Proven Content"
- User can approve or edit each brief before it enters the creative production queue
- When a Meta ad with an organic-inspired hook achieves CTR > 3%, system creates a reverse loop: generates SEO content brief using the same angle

#### 4.1.4 Creative Fatigue Monitor

**User story:** As a Meta advertiser, I want to be alerted before creative fatigue kills my ROAS so I can refresh creatives proactively instead of reactively.

**Acceptance criteria:**
- System monitors all active Meta ad sets every 4 hours via Meta Marketing API
- Fatigue alert triggers when: frequency > 3.0 AND CTR has declined > 20% week-over-week
- Alert fires 72 hours before estimated ROAS impact based on trend
- Alert includes: affected ad set, current frequency, CTR decline trend, estimated days to ROAS impact
- Alert triggers automatic generation of new creative brief suggestions (Claude API)
- User receives push notification + email for fatigue alerts
- System tracks: how many fatigue alerts were acted on vs ignored, and ROAS impact of each

#### 4.1.5 Blended MER Dashboard

**User story:** As a marketer running both Google Ads and Meta Ads, I want a single, unbiased performance number that shows my true marketing efficiency — immune to platform attribution bias.

**Acceptance criteria:**
- Dashboard calculates: Total Revenue (from Shopify or manually entered) ÷ Total Ad Spend (Google + Meta combined)
- Displayed as primary metric on the unified dashboard — more prominent than any platform-reported ROAS
- Revenue can be connected via Shopify integration or entered manually
- Historical MER chart shows trend over last 30/60/90 days
- MER breakdown shows Google contribution vs Meta contribution vs organic (estimated)
- Anomaly detection: alert when MER drops > 15% week-over-week
- User can annotate the chart with events (sale, campaign launch, creative change)

---

### 4.2 V1 Features (Month 5–9)

Full A-to-Z module completion across all three channels. See appendix for complete feature list.

**SEO Module additions:** Full keyword database (DataForSEO), rank tracking (up to 2,500 keywords), site audit (up to 100K pages), backlink analyzer, GEO/AI citation tracker, content editor with real-time SEO scoring, schema markup generator, internal link optimizer

**Google Ads Module additions:** AI campaign builder (push to Google Ads API), RSA headline generator, Performance Max builder, AI Max setup guide, bidding strategy advisor, Quality Score monitor, Enhanced Conversions setup, Consent Mode v2, Customer Match manager

**Meta Ads Module additions:** Full-funnel campaign builder, audience manager (Cold, Lookalike, Custom, Retargeting), AI image ad generator, UGC script writer, CAPI setup wizard, Event Match Quality optimizer, audience overlap detector, attribution window advisor, full white-label reporting

**Intelligence Engine V1:** 47 cross-channel rules evaluated every 4 hours, Weekly Growth Intelligence Report (every Sunday 8AM local time), budget reallocation recommendations, first-party data orchestrator (Google converters → Meta seed → Google Customer Match)

---

### 4.3 V2 Features (Month 10–15)

- Full cross-channel attribution model (replaces Northbeam at fraction of cost)
- AI image and video script generation at scale (15–25 variants/week automation)
- Automated campaign management (AI executes, not just recommends)
- GEO tracking (ChatGPT, Perplexity, Google AI, Gemini citation monitoring)
- Public API (Scale tier)
- Mobile app (iOS + Android)

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|---|---|
| Dashboard load time | < 2 seconds |
| API response time (read) | < 500ms at p95 |
| API response time (write) | < 2s |
| Cross-channel data freshness | Max 4-hour lag |
| Rank tracking update | Daily at 06:00 UTC |
| Report generation | < 30s standard, < 2min full |
| Concurrent users | 10,000 with < 1% degradation |
| Uptime SLA | 99.9% (99.95% target for paid) |

### 5.2 Security

- OAuth 2.0 + PKCE for all platform connections
- MFA enforced on all paid plans
- AES-256 encryption at rest; TLS 1.3 in transit
- Row-level security in Neon Postgres (workspace data isolation)
- Encrypted secrets via environment variables + Vault at scale
- API keys encrypted per-user — platform never stores plaintext credentials
- GDPR: EU data residency option (planned for V1)
- CCPA: data deletion on request
- SOC 2 Type II target: Year 2

### 5.3 Scalability

- Neon Postgres: autoscales compute, branching for dev/staging environments
- All background services: horizontally scalable Celery workers
- ClickHouse: columnar analytics, handles billions of rows
- Upstash Redis: serverless, scales to zero — no idle cost
- All services: stateless — no session pinning

---

## 6. Integration Requirements

| Category | Integrations |
|---|---|
| SEO data | Google Search Console API, DataForSEO (keyword data), Majestic/Moz (backlinks) |
| Google | Google Ads API v18+, GA4 API, Google Tag Manager API, Google Merchant Center API |
| Meta | Meta Marketing API v20+, Meta Conversions API, Meta Business SDK |
| E-commerce | Shopify Admin API (MVP), WooCommerce REST API (V1), BigCommerce API (V1) |
| CRM | HubSpot API (V1), Salesforce (V1), Klaviyo API (V1) |
| AI | Anthropic Claude API (Sonnet 4.6 for generation, Haiku 4.5 for classification) |
| Payments | Stripe (subscriptions + usage metering) |
| Email | Resend API |
| Alerts | WebSockets (in-app), Resend (email), Slack webhook (V1) |

---

## 7. Pricing Model

| Feature | Starter $79/mo | Growth $199/mo | Scale $399/mo |
|---|---|---|---|
| Websites / Ad accounts | 1 each | 5 each | Unlimited |
| Keywords tracked | 500 | 2,500 | 10,000 |
| Monthly ad spend | Up to $10K | Up to $50K | Unlimited |
| Intelligence recommendations | 5/week | Unlimited | Unlimited + priority |
| AI creative generation | 10/month | 100/month | Unlimited |
| GEO tracking | — | ✓ | ✓ |
| White-label reports | — | ✓ | ✓ |
| Cross-channel attribution | Blended MER only | Full model | Full + custom |
| Team members | 1 | 5 | Unlimited |
| API access | — | — | Full |
| Support | Email | Priority email + chat | Dedicated + Slack |

Annual billing: 20% discount. 14-day free trial (Growth tier, no credit card).

---

## 8. Out of Scope (MVP)

- Mobile app (iOS / Android) — deferred to V2
- CRM integrations — deferred to V1
- Custom attribution models — deferred to V2
- Public API — deferred to V2
- SMS alerts via Twilio — email + in-app is sufficient for MVP
- Video ad generation — deferred to V2
- Google Shopping campaigns — deferred to V1
- Demand Gen campaigns — deferred to V1

---

## 9. Open Questions

| Question | Owner | Target resolution |
|---|---|---|
| DataForSEO API cost per query at 100 users — is Starter margin positive? | Engineering | Before MVP launch |
| EU data residency: Neon has EU region — confirm GDPR coverage | Legal | Before any EU marketing |
| Meta image generation API: which provider? (DALL-E, Stable Diffusion, Recraft?) | Product | Month 2 |
| Rank tracking proxy infrastructure cost at 500 keywords × 100 users daily | Engineering | Before MVP launch |
| Shopify app store listing vs direct OAuth: which path for MVP? | Product | Month 1 |

---

## Appendix A — Complete Feature List by Module

See `FEATURES.md` for the complete A-to-Z feature specification per module.

## Appendix B — Data Models

See `DATA_MODELS.md` for the complete database schema.

## Appendix C — API Specification

See `API_SPEC.md` for all endpoint definitions.
