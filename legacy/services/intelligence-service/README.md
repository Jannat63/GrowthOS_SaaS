# Intelligence Service

**Tech:** Python + FastAPI + Celery
**Port:** 8004
**Status:** Scaffolded and runnable locally with mock/direct-payload data. Real third-party API calls (Google Ads / Meta / DataForSEO) are stubbed with TODO comments — wire them in once API access is approved.

**Endpoints:** POST /intelligence/recommendations, GET /health. Celery beat schedule runs analysis every 4 hours + weekly report Sundays (Section 7.5).

Run standalone: see Dockerfile, or run everything together with `docker compose up` from the repo root.
