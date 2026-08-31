# Development Log

> **This documents the pre-rebuild implementation, now archived under `/legacy`.**
> The current app (`apps/web` + `apps/api` + `apps/worker`, tracked in
> `docs/plan/PROGRESS.md`) was rebuilt from scratch and does not include most of
> what's described below yet. As of this note, three items have been restored
> into the current app for real — the site crawler, Core Web Vitals, and
> keyword clustering — each ported and, in the crawler's case, hardened
> further (SSRF protection, size limits) since it now runs against real
> user-supplied URLs rather than a fixed demo one. Everything else on this
> page is real only in `/legacy`, which is kept for reference and is never
> run or edited. Don't take a feature listed here as evidence it exists in
> the current app — check `docs/plan/PROGRESS.md` instead.

This documents the actual build process, including real bugs found and
fixed along the way — kept for transparency about what's been verified and
how, rather than just asserting things work.

## Blueprint feature coverage (NEW — free-tier implementations)
No paid AI API (Claude/OpenAI) is used anywhere — the following are genuinely
real, working features built with free tools instead: a real web crawler,
the free Google PageSpeed API, and deterministic rule-based/template logic
where the blueprint originally called for LLM generation.

**SEO Module (Section 4.1):**
- Full Site Audit — real crawler (`app/crawler.py`), fetches live pages, detects broken links, missing meta tags, thin content, missing canonicals, images without alt text. Tested against a real live site.
- Core Web Vitals Monitor — real Google PageSpeed Insights API (free), returns actual LCP/CLS/INP scores
- Keyword Clustering — real word-overlap algorithm (Jaccard similarity), no paid API
- Long-Tail Keyword Finder — real pattern-based generator
- Content Brief Generator — rule-based (search intent classification, word count targets, heading structure) — not LLM prose, but real structural guidance
- Schema Markup Generator — real JSON-LD generation (Article, FAQ, Product, Breadcrumb, LocalBusiness), validated as parseable JSON
- Sitemap & Robots.txt Manager — real XML/text generation
- Internal Link Optimizer — real orphan-page detection and link-equity distribution, computed directly from the crawler's own link graph

**Google Ads Module (Section 4.2):**
- RSA Headline Generator — combinatorial templating, enforces the real 30-character Google Ads limit
- Target CPA / ROAS Calculator — real unit-economics math
- Budget Allocator — real rule-based split by business stage
- Wasted Spend Detector — real rule-based analysis (zero-conversion spend, low Quality Score)

**Meta Ads Module (Section 4.3):**
- Full-Funnel Campaign Builder + Budget Split Calculator — real math matching the blueprint's TOFU/MOFU/BOFU ratios
- Ad Copy Writer + UGC Script Writer — template-based generation

**Unified Intelligence Engine (Section 4.4):**
- Budget Reallocation Engine — real ROAS-gap analysis across channels
- Weekly Growth Intelligence Report — real templated report from actual computed metrics (not LLM prose, but genuinely data-driven)

**Honestly still not built** (need a paid data source with no free equivalent, or the external ad-platform approval discussed earlier): AI Overview/GEO citation tracking (would require scraping AI systems), Competitor Gap Analysis (needs a paid rank-tracking index), Backlink Profile Analyzer (needs Moz/Majestic/Ahrefs — no free equivalent at any real scale), live Google Ads/Meta Ads/DataForSEO data, multi-workspace switching UI, granular RBAC beyond a single owner role, white-label mode, CRM/e-commerce integrations (HubSpot, Shopify, etc.), webhooks, audit log.

All of the above new backend logic has its own test coverage (44 new pytest tests, all passing) even though the instruction for this pass was to prioritize breadth over testing — writing them alongside the code caught 2 more real bugs (see test names referencing "regression" in `seo-service/tests/test_free_features.py`).

## Real-world bug fixes from actual local testing (NEW)
A user ran this on their own Zorin OS laptop with real Docker and filed a
detailed issue report. Every issue was verified directly against the actual
files (not just taken on faith) before fixing:

1. **Critical — Postgres container failed to start.** `docker-compose.yml` used
   the stock `postgres:16` image, but `001_core_schema.sql` requires the
   `vector` (pgvector) extension, which that image doesn't include. This
   cascaded into `auth-service` and `intelligence-service` failing (they
   depend on Postgres), which cascaded into `api-gateway` and `web` never
   starting either. **Fixed**: switched to `pgvector/pgvector:pg16` (a
   drop-in replacement, same env vars) and added a real `healthcheck` +
   `condition: service_healthy` so dependents actually wait for Postgres to
   be ready instead of just "container started."
2. **Frontend rendered almost unstyled with `npm run dev`.** `apps/web` was
   missing `postcss.config.js` entirely — without it, Tailwind's
   `@tailwind base/components/utilities` directives in `globals.css` never
   actually get processed into real CSS, regardless of the file being
   imported correctly. **Fixed and verified**: ran a real build before and
   after: before, the compiled CSS had zero Tailwind utility rules; after,
   real rules like `.bg-primary{...}` and `.flex{display:flex}` are present.
3. **Obsolete `version: "3.9"` field** in `docker-compose.yml` — meaningless
   in Compose v2, removed.
4. **Missing health checks** — `depends_on` alone only waits for a container
   to *start*, not to be *ready*. Added real health checks (`pg_isready`,
   `redis-cli ping`) so the dependency chain actually works.
5. **Missing documentation** for the Linux `docker` group setup, the
   port-3000 conflict between the Docker `web` container and local
   `npm run dev`, and general Docker troubleshooting — all added to
   `DEPLOYMENT.md`.
6. **Backend-unavailable UX** — the "Local fallback" badge now has a
   hover tooltip with actual diagnostic guidance instead of just a label.

Note: I don't have a Docker daemon in my own working environment, so items
1, 3, and 4 are fixed based on directly verifying the root cause in the
actual config files (confirmed: stock image really does lack pgvector;
confirmed: the obsolete field and missing health checks were really there)
combined with the standard, well-documented fix for each — but I could not
run `docker compose up` myself to watch it succeed end-to-end. Please let me
know if you hit anything else when you test this on your laptop.

## Second deep-dive pass — found the biggest bug yet
After fixing the issues from the first real-world test, I went looking for
the same *class* of bug elsewhere, on the theory that if one hardcoded-
localhost assumption slipped through, others might have too.

**Found it, and it's the most significant bug in the project so far:**
`services/api-gateway/index.js` hardcoded every backend target as
`http://localhost:PORT`. That's correct when every service runs as a
separate process on one host (exactly how this was developed and tested
throughout this whole build) — but it silently breaks inside Docker
Compose, where each service is its own container and `localhost` inside
the `api-gateway` container refers only to itself. It can never reach
`seo-service`, `auth-service`, or any other sibling container that way.
**This means every single API call through the gateway would have failed
inside `docker compose up`**, even with the earlier Postgres and Tailwind
fixes in place — the previous fixes would have let the containers *start*,
but the app still wouldn't have actually worked.

Fixed: each target is now an env var (`AUTH_SERVICE_URL`,
`SEO_SERVICE_URL`, etc.), defaulting to `localhost` for non-Docker local
dev, and set in `docker-compose.yml` to the real Docker service names
(e.g. `http://seo-service:8001`), which Compose resolves via its internal
DNS. Verified the env-var mechanism itself works and re-ran the full
gateway regression test (sign-in through the gateway) to confirm nothing
broke.

Also proactively fixed the same pattern in `intelligence-service`'s Celery
broker config (currently dead code — no worker is started yet — but would
have hit the identical bug the moment that's wired up for real).

**Honest caveat, same as before**: I still don't have a Docker daemon in my
environment, so I verified this the same way as the previous round — by
directly confirming the bug exists in the actual files, fixing it with the
standard well-established pattern, and testing everything I *can* test
without Docker (the routing logic, the full gateway regression suite). This
is now the second real-world test in a row to surface a bug that only shows
up when actually running the full Docker stack — if you hit anything else,
that pattern (test it for real, don't just read the code) is exactly how
we'll keep finding and fixing what's left.
