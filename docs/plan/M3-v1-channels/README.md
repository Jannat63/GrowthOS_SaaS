# M3 — V1: Full Channel Coverage

Status: ⬜ Not started  *(outline — expand when reached)*

> **Rolling-wave note:** M3 is an outline only. It has no per-phase folders yet. Each phase below
> will be expanded into its own folder (`Px.y-.../plan.md` + `progress.md`) when the milestone is
> reached, the same way M0–M2 are structured today.

## Goal

Full coverage across the core channels — SEO, Google Ads, Meta Ads — plus the V1 intelligence engine
and agency features, taking GrowthOS from the MVP insight loop to a complete per-channel product.

## Phase outline

| Phase | Summary | Status |
|-------|---------|--------|
| P3.1 | **SEO module** — DataForSEO keywords, rank tracking (2,500 kw), site audit (100K, `legacy/services/seo-service/crawler.py` as-is), Core Web Vitals (`pagespeed.py` as-is), clustering (pgvector; `keyword_clustering.py`), backlinks, schema (`schema_generator.py`), internal links (`sitemap_and_links.py`), content editor, GEO citation tracker. | [ ] |
| P3.2 | **Google Ads module** — AI campaign builder (API push — rebuild), RSA generator, PMax, bidding advisor + tCPA/tROAS (`google-ads-service/features.py` as-is), Quality Score, Enhanced Conversions, Customer Match, wasted-spend detector. | [ ] |
| P3.3 | **Meta Ads module** — full-funnel builder + budget split (`meta-ads-service/features.ts` as-is), audiences (Cold/Lookalike/Custom/Retargeting), AI image gen, UGC scripts, CAPI wizard, EMQ optimizer, overlap detector. | [ ] |
| P3.4 | **Intelligence Engine V1** — 47-rule engine + 4-hourly loop (extend `apps/web/lib/logic/cross-channel-engine.ts`), Claude-or-template recommendation explanations, Weekly Growth Intelligence Report, budget reallocation, first-party data orchestrator. | [ ] |
| P3.5 | **Agency features** — white-label (domain/logo/colors), team comments + task assignment, `audit_logs`, multi-workspace UI polish. | [ ] |

## Gate

500 users / MRR >$50K / agency tier.
