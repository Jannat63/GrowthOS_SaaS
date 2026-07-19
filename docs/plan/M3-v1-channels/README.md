# M3 — V1: Full Channel Coverage

Status: ⬜ Not started  *(outline — expand when reached)*

> **Rolling-wave note:** M3 is an outline only. It has no per-phase folders yet. Each phase below
> will be expanded into its own folder (`Px.y-.../plan.md` + `progress.md`) when the milestone is
> reached, the same way M0–M2 are structured today.

## Goal

Full coverage across the core channels — SEO, Google Ads, Meta Ads — plus the V1 intelligence engine
and agency features, taking GrowthOS from the MVP insight loop to a complete per-channel product.

> **M3 is where the app goes live-data.** M2 ran entirely on seeded fixtures. **P3.0 (below) is the
> phase that adds real platform OAuth** and swaps seeds for live data — it is a hard prerequisite for
> the channel modules pulling real numbers. Meta App Review and the Google Ads developer token can
> take weeks, so start P3.0's app-registration paperwork early / in parallel.

## Phase outline

| Phase | Summary | Status |
|-------|---------|--------|
| P3.0 | **Real platform integrations (OAuth)** — real connect/disconnect + encrypted tokens for Google Ads / Meta / GSC / Shopify; live sync workers replacing the M2 seeded fixtures; account-registration paperwork (Meta App Review, Google Ads dev token). *Deferred out of M2 P2.1.* | [ ] |
| P3.1 | **SEO module** — DataForSEO keywords, rank tracking (2,500 kw), site audit (100K, `legacy/services/seo-service/crawler.py` as-is), Core Web Vitals (`pagespeed.py` as-is), clustering (pgvector; `keyword_clustering.py`), backlinks, schema (`schema_generator.py`), internal links (`sitemap_and_links.py`), content editor, GEO citation tracker. | [ ] |
| P3.2 | **Google Ads module** — AI campaign builder (API push — rebuild), RSA generator, PMax, bidding advisor + tCPA/tROAS (`google-ads-service/features.py` as-is), Quality Score, Enhanced Conversions, Customer Match, wasted-spend detector. | [ ] |
| P3.3 | **Meta Ads module** — full-funnel builder + budget split (`meta-ads-service/features.ts` as-is), audiences (Cold/Lookalike/Custom/Retargeting), AI image gen, UGC scripts, CAPI wizard, EMQ optimizer, overlap detector. | [ ] |
| P3.4 | **Intelligence Engine V1** — 47-rule engine + 4-hourly loop (extend `apps/web/lib/logic/cross-channel-engine.ts`), Claude-or-template recommendation explanations, Weekly Growth Intelligence Report, budget reallocation, first-party data orchestrator. | [ ] |
| P3.5 | **Agency features** — white-label (domain/logo/colors), team comments + task assignment, `audit_logs`, multi-workspace UI polish. | [ ] |

## Gate

500 users / MRR >$50K / agency tier.
