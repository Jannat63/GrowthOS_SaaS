# P3.0 — Progress

Status: [~]  ·  Updated: 2026-07-17  ·  **Build complete; live E2E pending Google creds.**

| Item | Status | Notes |
|------|--------|-------|
| Token crypto (AES-256-GCM) | [x] | `apps/api/src/crypto.ts` — round-trip + tamper tests. |
| OAuth signed state | [x] | `apps/api/src/oauth/state.ts` — sign/verify/expiry tests. |
| Provider adapter + Google | [x] | `apps/api/src/oauth/providers.ts` — authorize/exchange/refresh/listAccounts. |
| getValidAccessToken (refresh) | [x] | `apps/api/src/oauth/connections.ts`. |
| Connect/callback/disconnect/sync routes | [x] | `apps/api/src/routes/connections.ts` — callback verified via mocked-provider integration test. |
| GSC live sync → ClickHouse | [x] | `apps/api/src/gsc-sync.ts` — transforms unit-tested. |
| Connections UI (Settings) | [x] | `ConnectionsSection` + `useConnectionActions` (Connect/Disconnect/Sync/last-synced). |
| Env keys | [x] | Generated `TOKEN_ENCRYPTION_KEY`/`OAUTH_STATE_SECRET`; `GOOGLE_*` await user creds. |
| **Live E2E (real GSC)** | [ ] | **Blocked on user's Google Cloud OAuth client** — see plan.md "Google Cloud setup". |

27 API tests pass (14 new for P3.0). Callback integration test confirms: state verify → token exchange →
**encrypted** upsert → redirect, all with a mocked Google (CI-safe).

## Log
- 2026-07-17 — Plan created; P3.0 built. OAuth primitives (crypto/state/provider) + connection service
  (upsert/getValidAccessToken) + routes (connect/callback/disconnect/sync) + GSC→ClickHouse sync +
  Settings Connections UI. All unit/integration tested with mocks. **Live round-trip awaits the user's
  Google Cloud OAuth Client ID/secret** (`apps/api/.env`).
