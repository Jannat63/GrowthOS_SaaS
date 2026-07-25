# P3.0 — Real Platform Integrations (OAuth)

Milestone: M3 · Depends on: M1 (Better Auth + `platform_connections`), M2 (ClickHouse, job/route patterns)
Prerequisites: **Google Cloud OAuth client** (user-provided) · `TOKEN_ENCRYPTION_KEY` · `OAUTH_STATE_SECRET`

## Goal

Replace M2's seeded `platform_connections` stubs with **real OAuth**: connect a workspace to real
provider accounts, store encrypted tokens, and sync live data into ClickHouse. **First provider =
Google Search Console** (free, testable with the user's own Google account in "testing mode"). The
framework is provider-agnostic so Meta / Google Ads / Shopify plug in later (gated on their approvals).

Design source: `docs/superpowers/plans/` + the approved M3 plan. Full rationale in the milestone README.

## Locked decisions
- **Custom OAuth flow into `platform_connections`** — NOT Better Auth (its OAuth is user-scoped; our
  connections are per-workspace with provider metadata). Better Auth stays login-only.
- **Provider-agnostic adapter** (`OAuthProvider` interface); Google implemented first.
- **Connection row created only after a successful token exchange** → `accessToken` always set → no
  schema migration.
- **Signed `state`** (HMAC + nonce + expiry) for CSRF; PKCE deferred (confidential server client).
- **Sync on the API side (TS)** — tokens + AES key + `@clickhouse/client` are co-located there; never
  push live tokens through Redis. **On-demand sync** now; scheduled (4-hourly) → P3.4.
- **Template-first (D4)** — no Claude dependency.

## Subphases (TDD)
- [ ] `apps/api/src/crypto.ts` — AES-256-GCM `encryptToken`/`decryptToken` (`TOKEN_ENCRYPTION_KEY`). Test: round-trip + tamper.
- [ ] `apps/api/src/oauth/state.ts` — `signState`/`verifyState` (HMAC, nonce, expiry). Test: verify + reject tampered/expired.
- [ ] `apps/api/src/oauth/providers.ts` — `OAuthProvider` + `googleProvider` (`authorizeUrl`, `exchangeCode`, `refreshAccessToken`, `listAccounts` via GSC `sites.list`; scope `webmasters.readonly`, `access_type=offline`). Test: authorize-URL params + token-exchange body (fetch mocked).
- [ ] `getValidAccessToken(connection)` — decrypt → refresh-if-expired → re-encrypt/persist → plaintext.
- [ ] `apps/api/src/routes/connections.ts` — `GET .../connections/:platform/connect`, `GET /oauth/callback`, `DELETE .../connections/:connectionId`, `POST .../connections/:connectionId/sync`. Guards + typed errors. Registered in `app.ts`. Smoke via `inject` with a mocked provider.
- [ ] `apps/api/src/gsc-sync.ts` — `syncGscConnection`: GSC Search Analytics (query→`keyword_rankings`, page→`organic_traffic`) → ClickHouse insert; update `lastSyncedAt`/`syncError`. Test: transform (mocked GSC payload).
- [ ] Frontend — Connections management on `Settings` (`useConnections` + new `useConnectionActions`): Connect / Disconnect / Sync now / last-synced. Wire onboarding `connect-accounts` buttons.
- [ ] Env — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`.

## Reuse
- `requireWorkspaceMember`/`AppError` (`apps/api/src/guards.ts`, `errors.ts`); `@clickhouse/client`
  pattern (`apps/api/src/analytics.ts`); `platform_connections` (`packages/db/src/schema/tenancy.ts`,
  unchanged); `useConnections` + `PlatformConnection` type. Reference: legacy `auth-service/app/google_oauth.py`.

## Google Cloud setup (user)
1. Google Cloud project → enable **Google Search Console API**.
2. OAuth consent screen → External, **Testing**; add your Google account as a **Test user**.
3. Credentials → OAuth client ID → **Web application**; redirect URI
   `http://localhost:3001/api/v1/oauth/callback`. Copy Client ID + secret into `apps/api/.env`.

## Verification
- Automated (CI-safe): crypto/state/provider/transform vitest + callback via `inject` with a mocked provider.
- Live E2E (needs Google creds): Connect on Settings → Google consent → connection shows `Connected`;
  Sync now → ClickHouse `organic_traffic`/`keyword_rankings` populate. Record in `VERIFY.md`.
