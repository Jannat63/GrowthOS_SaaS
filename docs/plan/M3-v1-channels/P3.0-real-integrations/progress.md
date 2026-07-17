# P3.0 — Progress

Status: [~]  ·  Updated: 2026-07-17  ·  **In progress** (first M3 phase).

| Item | Status | Notes |
|------|--------|-------|
| Token crypto (AES-256-GCM) | [ ] | `apps/api/src/crypto.ts`. |
| OAuth signed state | [ ] | `apps/api/src/oauth/state.ts`. |
| Provider adapter + Google | [ ] | `apps/api/src/oauth/providers.ts`; GSC scope. |
| getValidAccessToken (refresh) | [ ] | Auto-refresh helper. |
| Connect/callback/disconnect/sync routes | [ ] | `apps/api/src/routes/connections.ts`. |
| GSC live sync → ClickHouse | [ ] | `apps/api/src/gsc-sync.ts`. |
| Connections UI (Settings) | [ ] | `useConnectionActions` + Settings section. |
| Env keys | [ ] | GOOGLE_*, TOKEN_ENCRYPTION_KEY, OAUTH_STATE_SECRET. |

## Log
- 2026-07-17 — Plan created; P3.0 build started. First real provider: Google Search Console.
