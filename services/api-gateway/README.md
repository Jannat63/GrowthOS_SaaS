# API Gateway

**Tech:** Express (dev) / Kong (production)
**Port:** 8000
**Status:** Scaffolded and runnable locally with mock/direct-payload data. Real third-party API calls (Google Ads / Meta / DataForSEO) are stubbed with TODO comments — wire them in once API access is approved.

**Endpoints:** Proxies /api/* to all services by prefix. Swap for Kong Gateway in production for JWT validation + rate limiting.

Run standalone: see Dockerfile, or run everything together with `docker compose up` from the repo root.
