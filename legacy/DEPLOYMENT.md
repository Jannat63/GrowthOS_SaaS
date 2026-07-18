# Deploying GrowthOS

This gets the app on a real URL. Two pieces: backend (Railway) and frontend (Vercel).
Both have generous free tiers, which is enough for a demo/early-stage deployment.

## Running locally first (recommended before deploying)

### Prerequisites
- Docker Desktop (or Docker Engine + Compose plugin on Linux) — see Linux setup below if you're on Ubuntu/Zorin/Debian
- Node.js 22+ and Python 3.12+ only if you plan to run services outside Docker

### Linux setup (Ubuntu, Zorin OS, Debian, etc.)
After installing Docker, add your user to the `docker` group so you don't need `sudo` for every command:
```bash
sudo usermod -aG docker $USER
```
**This does not take effect in your current terminal session.** Either run `newgrp docker` in that terminal, or fully log out and back in (a reboot is the most reliable option). Verify it worked:
```bash
docker run hello-world
```
If that prints "Hello from Docker!", you're set.

### Start everything
```bash
docker compose up --build
```
First run takes a few minutes. Watch the logs — `postgres` should report healthy before the services that depend on it (`auth-service`, `intelligence-service`) start.

### Seed demo data
```bash
docker exec -i $(docker compose ps -q postgres) psql -U growthos -d growthos < db/postgres/seed.sql
```
Then sign in with `demo@growthos.app` / `DemoPass123`.

### Port 3000 conflict
The Docker `web` container and a locally-run `npm run dev` both default to port 3000 — **don't run both at once**. Pick one workflow:
- **All-in-Docker** (simplest): just `docker compose up`, use the `web` container as-is.
- **Frontend outside Docker** (faster iteration on frontend code): `docker compose stop web`, then `cd apps/web && npm install && npm run dev`, pointing `NEXT_PUBLIC_API_URL` at the gateway (still running in Docker on :8000).

### Troubleshooting

**Postgres container exits immediately / other services keep restarting.**
Check `docker compose logs postgres`. If you see an error about the `vector` extension, you're on an old copy of this repo from before this was fixed — pull the latest `docker-compose.yml`, which uses `pgvector/pgvector:pg16` instead of the stock `postgres:16` image (the stock image doesn't include the `pgvector` extension that `001_core_schema.sql` requires).

**Frontend loads but looks completely unstyled.**
This was a real bug: `apps/web` was missing `postcss.config.js`, so Tailwind never actually processed the CSS despite `globals.css` being imported correctly. Fixed — if you still see this, run `rm -rf apps/web/.next` and rebuild; stale build cache can mask the fix.

**`web` container stuck in "Created" state, never starts.**
It depends on `api-gateway`, which depends on every backend service, which (for `auth-service` and `intelligence-service`) depend on `postgres` being healthy. If `postgres` never becomes healthy (see above), everything upstream waits forever. Fix `postgres` first and the rest should cascade into starting.

**`docker: permission denied while trying to connect to the Docker daemon socket`**
You're not in the `docker` group yet, or the group change hasn't taken effect in this shell — see the Linux setup section above.

## Deploying for real

## 1. Database — Railway Postgres

1. Create a Railway account at railway.app, new project.
2. Add a Postgres database (Railway → New → Database → PostgreSQL).
3. Once created, open its "Connect" tab and copy the `DATABASE_URL`.
4. Run the schema against it:
   ```
   psql "<DATABASE_URL>" -f db/postgres/migrations/001_core_schema.sql
   psql "<DATABASE_URL>" -f db/postgres/migrations/002_seed_demo_workspace.sql
   ```
5. Optionally seed demo data so the app isn't empty on first login:
   ```
   psql "<DATABASE_URL>" -f db/postgres/seed.sql
   ```
   This creates a demo account (`demo@growthos.app` / `DemoPass123`) — tested and confirmed working. Useful for a demo/investor walkthrough; delete it before real customers sign up.
6. Skip ClickHouse for now — nothing in the current build writes to it yet (see README status). Add it later when you wire up the analytics pipeline for real.

## 2. Backend services — Railway

Each service in `services/*` deploys as its own Railway service, pointing at its own folder.

For each of: `auth-service`, `seo-service`, `google-ads-service`, `intelligence-service`
(these 4 are the ones with real logic — deploy `meta-ads-service`, `notification-service`,
`api-gateway` the same way once you need them):

1. Railway → New → GitHub Repo → select your repo → set **Root Directory** to `services/<name>`.
2. Railway auto-detects the Dockerfile and builds it.
3. Set environment variables (Railway → Variables):
   - `DATABASE_URL` — the Postgres URL from step 1 (only needed for `auth-service` and `intelligence-service`)
   - `JWT_SECRET` — generate one real value (`openssl rand -hex 32`) and use the **same value** across `auth-service` and `intelligence-service` — they must match, or token verification breaks
   - `FRONTEND_ORIGIN` — your Vercel URL once you have it (step 4) — until then, leave as `http://localhost:3000`
4. Railway gives each service a public URL like `https://auth-service-production.up.railway.app`. Note all of them down.

## 3. API Gateway — Railway

Deploy `services/api-gateway` the same way, then edit `services/api-gateway/index.js` to
replace the hardcoded `localhost:800X` URLs with the real Railway URLs from step 2
(or better: refactor it to read them from environment variables — that's a quick follow-up,
currently hardcoded for local dev simplicity).

## 4. Frontend — Vercel

1. vercel.com → New Project → import your GitHub repo.
2. Set **Root Directory** to `apps/web`.
3. Environment variable: `NEXT_PUBLIC_API_URL` = your api-gateway's Railway URL from step 3.
4. Deploy. Vercel gives you a URL like `https://growthos.vercel.app`.
5. Go back to Railway and set `FRONTEND_ORIGIN` on `auth-service`, `seo-service`,
   `google-ads-service`, and `intelligence-service` to this Vercel URL — required for CORS
   to allow the frontend to actually call them (see the CORS middleware added during the
   security-hardening pass).

## 5. Verify it's actually live

- Visit your Vercel URL → should land on `/welcome`
- Sign up → should create a real user (check Railway Postgres logs / connect with `psql` and `SELECT * FROM users;`)
- Sign in → should work with the account you just created
- Intelligence Center → should show "Live backend" badge (not "Local fallback") if the gateway routing is wired correctly

## What's NOT covered by this guide

- ClickHouse (not used yet)
- Redis / Celery scheduled tasks (intelligence-service has the schedule defined but nothing
  triggers it automatically yet — see `app/celery_app.py`)
- `meta-ads-service`, `notification-service` (NestJS/Node) — same Railway process, just point
  Root Directory at their folders
- Custom domain — both Vercel and Railway support this under their project settings
- HTTPS — both platforms provide this automatically, nothing to configure
