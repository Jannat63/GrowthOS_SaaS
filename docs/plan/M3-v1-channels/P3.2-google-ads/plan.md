# P3.2 — Google Ads Module  (outline — gated on Google Ads developer token)

Milestone: M3 · Depends on: P3.0 (Google OAuth; add Ads scope + customer connect)

## Goal
Full Google Ads surface: enriched Search Terms Intelligence, bidding advisor, RSA generator, campaign
builder (API push), Quality Score, wasted-spend. **Template-first (D4).**

## Scope
- **Port as-is:** bidding advisor + tCPA/tROAS (`google-ads-service/app/features.py`); enriched search
  terms (already have `packages/logic/search-terms-bridge.ts` from M2).
- **Rebuild:** AI Campaign Builder (pushes to Google Ads API), RSA generator (template headlines/desc +
  Ad Strength), Performance Max asset groups.
- **Monitors:** Quality Score history, auction insights, wasted-spend detector, Enhanced Conversions /
  Customer Match wizards.

## Tables / endpoints
- Neon: `google_ads_campaigns` (mirror), `quality_score_history`. ClickHouse: `ad_performance` (shared).
- API: `GET /google-ads/campaigns`, `POST /google-ads/campaigns` (push), `GET /google-ads/search-terms`
  (already exists from M2 — swap seed → live).

## External
Google Ads API v18+ — **requires a developer token** (apply in a Google Ads manager account; days–weeks).
GA4 API (free). **Blocked until the token is granted.**

## Legacy refs
`legacy/services/google-ads-service/app/`: `features.py` (as-is), `search_terms.py`, `routes/`.
