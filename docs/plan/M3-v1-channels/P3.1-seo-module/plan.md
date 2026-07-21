# P3.1 — SEO Module  (outline — deepen when DataForSEO key is set)

Milestone: M3 · Depends on: P3.0 (GSC connection + live organic data)

## Goal
Full SEO surface: keyword research, rank tracking, site audit, Core Web Vitals, clustering, content
editor, GEO citation tracking. **Template-first (D4); free tiers preferred (D3).**

## Scope
- **Now-buildable (no paid API):** GSC-fed **rank tracking** + **organic traffic** (from P3.0's
  `keyword_rankings`/`organic_traffic`), a real **SEO module page** over that data (reuse
  `packages/logic/seo-scoring.ts`), Core Web Vitals via **PageSpeed API** (free; port `pagespeed.py`),
  site audit crawler (port `seo-service/crawler.py`), schema generator (`schema_generator.py`), internal
  links (`sitemap_and_links.py`).
- **Gated on DataForSEO (paid — tier-cap, D3):** keyword research (volume/difficulty/CPC/SERP), AI Overview
  tracker, long-tail + competitor gap.
- **Clustering:** pgvector on Neon (free extension) — `keyword_embeddings vector(1536)` + `keyword_clustering.py`.
- **GEO/AI citation tracker:** `ai_citations` (ClickHouse) — hits ChatGPT/Perplexity/Gemini.

## Tables / endpoints
- Neon: `tracked_keywords`, `site_audits`, `keyword_embeddings` (pgvector). ClickHouse: `keyword_rankings`,
  `organic_traffic`, `ai_citations`.
- API: `POST /seo/keywords/research` (202), `GET /seo/keywords`, `GET /seo/rankings`, `POST /seo/audits`,
  `GET /seo/audits/:id`.

## Legacy refs
`legacy/services/seo-service/app/`: `crawler.py`, `pagespeed.py`, `keyword_clustering.py`,
`schema_generator.py`, `sitemap_and_links.py`, `long_tail.py`, `scoring.py`.

## Recommendation
Build the **GSC-fed rank-tracking + CWV + audit slice first** (no paid dep, real value); flag DataForSEO
features behind the key.
