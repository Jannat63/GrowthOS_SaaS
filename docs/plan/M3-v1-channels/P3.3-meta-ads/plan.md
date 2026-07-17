# P3.3 — Meta Ads Module  (outline — gated on Meta App Review)

Milestone: M3 · Depends on: P3.0 (add Meta provider adapter + OAuth)

## Goal
Full Meta surface: full-funnel campaign builder, audiences, CAPI wizard, EMQ optimizer, creative fatigue
(live), overlap detector. **Template-first (D4).**

## Scope
- **Port as-is:** full-funnel builder + budget split (`meta-ads-service/src/features.ts`); creative
  fatigue (already have `packages/logic/creative-fatigue.ts` + `fatigue-alert.ts` from M2 — swap seed → live).
- **Build:** Cold/Lookalike/Custom/Retargeting audience tools, audience overlap detector (alert >20%),
  CAPI setup wizard (JS/Shopify/WP), EMQ monitor, attribution advisor, learning-phase tracker.
- **Deferred/flagged:** AI image ad generator + UGC scripts — image-gen provider is an **open, paid**
  question (DALL·E / SD / Recraft); UGC scripts are template (D4).

## Tables / endpoints
- Neon: `meta_campaigns` (funnel_stage), `meta_ad_sets` (frequency/ctr/fatigue), `capi_configs`
  (pixel_id, emq_score). ClickHouse: `creative_performance`, `ad_performance`.
- API: `GET /meta-ads/campaigns`, `POST /meta-ads/campaigns` (push), `GET /meta-ads/creatives`,
  `GET /meta-ads/audiences`.

## External
Meta Marketing API v20+ — **requires Meta App Review** for `ads_read` (business verification, privacy
policy, demo video; weeks). CAPI, Ad Library API. **Blocked until App Review passes.** Start paperwork now.

## Legacy refs
`legacy/services/meta-ads-service/`: `src/features.ts` (as-is), `creative-fatigue.ts`, `meta-ads.controller.ts`.
