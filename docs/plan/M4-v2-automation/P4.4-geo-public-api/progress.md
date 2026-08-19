# P4.4 — GEO Tracking + Public API — Progress

Status: [~]  ·  Updated: 2026-08-20  ·  **In progress** — the public API + OpenAPI half shipped
2026-07-26. Per-key rate limits and outbound webhooks are planned (`plan.md`) and not yet built.
GEO/AI-citation tracking is deferred on credentials.

## Slices

| Slice | Status | Notes |
|-------|--------|-------|
| Public REST API + OpenAPI + API keys UI | [x] | **Done 2026-07-26.** `api_keys` (SHA-256 hash only), Bearer-authenticated `/api/public/v1/*`, spec + docs UI via `@fastify/swagger`, Settings → API Keys. 15 tests. Verified with a real signup → upgrade → create-key → call → revoke run. |
| P4.4a-1 Per-key rate limits | [ ] | **Planned.** Scoped limiter inside the `public-api.ts` plugin, keyed by API key id, `max` resolved per plan (Scale = 120/min), Redis-backed with in-memory fallback. Adds `RateLimit-*` + `Retry-After` headers. |
| P4.4a-2 Outbound webhooks | [ ] | **Planned.** Standard Webhooks signing, `webhook_endpoints` + `webhook_deliveries`, fan-out from the existing `publish()` bus, scheduler-driven delivery with jittered exponential backoff. |
| P4.4b GEO / AI-citation tracking | [!] | **Deferred** — needs paid ChatGPT/Perplexity/Gemini access. Nothing to measure without it. |

## Design decisions worth keeping visible

- **Standard Webhooks over a bespoke signature scheme.** Customers verify with an off-the-shelf
  library rather than against documentation we would have to write and they would have to trust.
- **One event bus, two transports.** Webhooks fan out from `ws.ts`'s existing `publish()` rather than
  adding a parallel set of trigger points that would drift out of sync with the WebSocket ones.
- **Redis-backed rate limiting, not in-memory.** In-memory buckets are per-process and would silently
  double the real ceiling the moment a second API instance runs — the same per-process assumption
  already flagged against `ws.ts` in the go-live checklist.
- **Headers on every response, not only 429s.** A client that only learns its budget at the moment it
  is cut off cannot slow down in time; `RateLimit-Remaining` is what lets it back off early.

## Log

- 2026-07-26 — Public API half built (recorded in `PROGRESS.md` at the time; this folder did not exist).
- 2026-08-20 — Phase folder created; `plan.md` written. Audited what P4.4 actually specified and found
  three of four deliverables need nothing external. Split the phase at the credential line (P4.4a
  buildable, P4.4b deferred), matching how P4.3 was split.
