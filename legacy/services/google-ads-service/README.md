# Google Ads Service

**Tech:** Python 3.12 + FastAPI
**Port:** 8002
**Status:** Scaffolded and runnable locally with mock/direct-payload data. Real third-party API calls (Google Ads / Meta / DataForSEO) are stubbed with TODO comments — wire them in once API access is approved.

**Endpoints:** POST /google-ads/search-terms, GET /google-ads/campaigns, GET /health

Run standalone: see Dockerfile, or run everything together with `docker compose up` from the repo root.
