# Notification Service

**Tech:** Node.js + Socket.io
**Port:** 8005
**Status:** Scaffolded and runnable locally with mock/direct-payload data. Real third-party API calls (Google Ads / Meta / DataForSEO) are stubbed with TODO comments — wire them in once API access is approved.

**Endpoints:** POST /dispatch, WebSocket /alert, GET /health

Run standalone: see Dockerfile, or run everything together with `docker compose up` from the repo root.
