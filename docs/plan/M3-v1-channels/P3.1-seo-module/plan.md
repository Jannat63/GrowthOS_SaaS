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
- **Clustering:** now-buildable and **free** — see the corrected slice design below.
- **GEO/AI citation tracker:** `ai_citations` (ClickHouse) — hits ChatGPT/Perplexity/Gemini.

## Tables / endpoints
- Neon: `tracked_keywords`, `site_audits`. ClickHouse: `keyword_rankings`, `organic_traffic`, `ai_citations`.
- API: `POST /seo/keywords/research` (202), `GET /seo/keywords`, `GET /seo/rankings`, `POST /seo/audits`,
  `GET /seo/audits/:id`, `GET /seo/clusters`.

## Legacy refs
`legacy/services/seo-service/app/`: `crawler.py`, `pagespeed.py`, `keyword_clustering.py`,
`schema_generator.py`, `sitemap_and_links.py`, `long_tail.py`, `scoring.py`.

## Recommendation
Build the **GSC-fed rank-tracking + CWV + audit slice first** (no paid dep, real value); flag DataForSEO
features behind the key.

---

# Keyword clustering slice — design (2026-08-20)

## Correction to the line above

This plan previously specified clustering as *"pgvector on Neon — `keyword_embeddings vector(1536)` +
`keyword_clustering.py`"*, and `PROGRESS.md` carried it as **"Keyword clustering (pgvector) — Neon
pgvector — free. Later."**

**Both overstate the dependency.** Reading the legacy implementation, `keyword_clustering.py` uses
**Jaccard similarity over tokenised word sets** — 60 lines of pure Python, no embeddings, no vector
column, no pgvector extension. A `vector(1536)` column implies an embedding model to populate it,
which would mean a paid API and would contradict D4. Nothing about the working implementation needs
any of that.

Recording the correction rather than quietly editing it, per the convention in
`AUDIT-2026-08-13-codebase.md`.

## Which algorithm — and the honest limit of this one

Current practice ranks the options roughly:

- **SERP overlap** — cluster keywords by how much their actual result pages overlap. Strongest
  signal, because it reflects how the search engine itself groups intent. **Needs SERP data, which
  means DataForSEO — gated.**
- **Lexical / semantic similarity** — cluster by shared words or embedding distance. Free and fast,
  but blind to intent that only shows up in results: *"how to clean running shoes"* and *"best
  running shoes"* look similar and serve completely different intents.
- **Hybrid** — pre-cluster semantically, then validate with SERP overlap. Best results, and it is
  what the SERP-based tools converge on.

**Decision: build the free lexical layer now, and shape the interface so SERP validation plugs in
later as a second pass.** The hybrid approach is explicitly a *pre-cluster then validate* pipeline,
so building the pre-cluster stage first is a step toward it, not a detour around it. The engine takes
an optional validator; without one it returns lexical clusters, with one it splits them.

The blind spot is documented in the engine and surfaced in the UI — clusters are labelled as
lexical, not intent-verified. Presenting an unverified cluster as though the search engine agreed
with it would be the same class of error as audit #14.

## Design

A pure engine, matching the other ten in `packages/logic/src/engines/`:

```ts
clusterKeywords(keywords: string[], opts?: {
  threshold?: number          // Jaccard, default 0.3
  validator?: ClusterValidator // reserved for the SERP pass
}): KeywordCluster[]
```

Pure `string[]` in, clusters out — no ClickHouse, no clock, no I/O — so `apps/api` adapts it over
`keyword_rankings` the same way `google-ads-advisor` is adapted over `ad_performance`, and the web
mock runs the identical engine over the identical fixture.

### Two fixes to the legacy algorithm

1. **Order-dependence.** Legacy iterates the input list and makes the first unassigned keyword a
   cluster seed, so the same keyword set in a different order yields different clusters. Seeds are
   instead chosen by descending token frequency, then alphabetically — deterministic regardless of
   input order, which is also what makes the output testable.
2. **Cluster naming ties.** Legacy names a cluster after the most common token via `max()`, which
   resolves ties by insertion order. Break ties explicitly (frequency, then longer token, then
   alphabetical) so names are stable.

`O(n²)` comparison is kept. It is the honest fit for the input size here — a workspace's tracked
keyword set is hundreds, not millions — and the bound is documented rather than engineered around.

### Files

- `packages/logic/src/engines/keyword-clustering.ts` + `.test.ts`
- `packages/logic/src/index.ts` — export
- `apps/api/src/seo.ts` — `getKeywordClusters(workspaceId)` over `keyword_rankings`
- `apps/api/src/routes/v1.ts` — `GET /workspaces/:id/seo/clusters`
- `apps/web` — a Clusters tab on `/seo`, alongside Rank tracker and Organic traffic

### Tests

Groups "office chair" / "ergonomic office chair" / "best office chair" while keeping "dining table"
separate (the legacy docstring's own example, kept as the regression case) · output is identical
under shuffled input · threshold boundaries · stopwords ignored · empty and single-keyword inputs ·
cluster names are stable under tie conditions · a supplied validator splits a lexical cluster.
