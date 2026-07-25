# GrowthOS — Getting Started

This guide gets a new engineer from zero to a running local development environment.

---

## Prerequisites

Install these before anything else:

```bash
# Node.js 22+ (use nvm)
nvm install 22
nvm use 22

# pnpm (package manager for the monorepo)
npm install -g pnpm@9

# Python 3.12+
brew install python@3.12   # macOS
# or: sudo apt install python3.12  # Ubuntu

# uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Docker (for local ClickHouse)
# Install Docker Desktop from https://docker.com

# Turborepo (global CLI)
pnpm add -g turbo
```

---

## 1. Clone and Install

```bash
git clone https://github.com/your-org/growthOS.git
cd growthOS

# Install all Node.js dependencies across all packages
pnpm install

# Set up Python worker dependencies
cd apps/worker
uv venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
cd ../..
```

---

## 2. Environment Variables

Copy the example env files for each app:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```

Then fill in the values. See below for which services you need to set up.

---

## 3. Required Services

### Neon Postgres (Primary Database)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project called `growthOS-dev`
3. Copy the connection string → paste into `DATABASE_URL` in `apps/api/.env` and `apps/worker/.env`
4. Enable the `pgvector` extension in Neon console: `CREATE EXTENSION vector;`

### ClickHouse Cloud (Analytics Database)

1. Create a free account at [clickhouse.cloud](https://clickhouse.cloud)
2. Create a new service (free tier: 10GB)
3. Copy host, database, username, password → paste into `apps/worker/.env`

**Or run locally with Docker (faster for dev):**

```bash
docker run -d \
  --name clickhouse-local \
  -p 8123:8123 \
  -p 9000:9000 \
  clickhouse/clickhouse-server:latest
```

Then set `CLICKHOUSE_HOST=localhost` in `apps/worker/.env`.

### Upstash Redis

1. Create a free account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy REST URL and REST token → paste into `apps/api/.env`
4. For Celery broker, copy the `rediss://` URL → paste into `CELERY_BROKER_URL` in `apps/worker/.env`

### Better Auth (Authentication)

No external service needed — Better Auth runs inside `apps/api` and stores its tables in your Neon database.

1. Generate a secret: `openssl rand -base64 32`
2. Paste it into `BETTER_AUTH_SECRET` in `apps/api/.env`
3. Set `BETTER_AUTH_URL=http://localhost:3001`
4. (Optional) For Google/Meta social sign-in, add the provider's client ID/secret to `apps/api/.env`

### Anthropic API (deferred — optional)

Claude is **not** used in the current build. Content briefs, recommendation explanations, and the weekly
report use deterministic/template logic. To enable Claude later, add `ANTHROPIC_API_KEY` to
`apps/worker/.env` — without it, the app falls back to deterministic logic and nothing breaks.

### Stripe (optional for local dev)

1. Create a Stripe account
2. Use test mode keys (`sk_test_...`)
3. Install Stripe CLI for local webhook testing:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe
   ```

---

## 4. Database Setup

```bash
# Run Neon migrations (from repo root)
pnpm db:migrate

# Seed with development data
pnpm db:seed

# Open Drizzle Studio to browse the database
pnpm db:studio
```

Set up ClickHouse tables:

```bash
cd apps/worker
python -m app.scripts.setup_clickhouse
```

---

## 5. Run in Development

```bash
# From repo root — starts web + api simultaneously
pnpm dev

# This runs:
# - apps/web on http://localhost:3000
# - apps/api on http://localhost:3001

# In a separate terminal — start the Python worker
cd apps/worker
source .venv/bin/activate
celery -A celery_app worker --loglevel=info --concurrency=4

# In another terminal — start Celery Beat (scheduler)
celery -A celery_app beat --loglevel=info
```

Visit [http://localhost:3000](http://localhost:3000) — you should see the GrowthOS login screen.

---

## 6. Running Tests

```bash
# All tests (web + api)
pnpm test

# API tests only
pnpm test --filter api

# Web tests only
pnpm test --filter web

# Python worker tests
cd apps/worker
pytest

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

---

## 7. Common Tasks

### Adding a new API route

```bash
# Create route file
touch apps/api/src/routes/seo/new-feature.ts

# Register in the router
# Edit apps/api/src/routes/seo/index.ts and add:
# fastify.register(newFeatureRoute, { prefix: '/new-feature' })
```

### Adding a new database table

```bash
# Create schema file
touch packages/db/schema/new_table.ts

# Run migration
pnpm db:generate  # generates SQL migration
pnpm db:migrate   # applies migration to Neon
```

### Adding a new Celery task

```bash
# Create task file
touch apps/worker/app/workers/seo/new_task.py

# Register in apps/worker/celery_app.py:
# app.autodiscover_tasks(['app.workers.seo.new_task'])
```

### Adding a new UI component

```bash
# Add to shared package (available in all apps)
touch packages/ui/components/NewComponent.tsx

# Or use shadcn/ui to add a pre-built component
pnpm dlx shadcn@latest add button  # runs from apps/web
```

---

## 8. Turborepo Commands

```bash
# Build all apps
pnpm build

# Build only changed apps (uses cache)
turbo build

# Run a command in a specific app
pnpm --filter api dev
pnpm --filter web build

# Add a dependency to a specific app
pnpm --filter api add fastify-plugin

# Add a dependency to a shared package
pnpm --filter @growthOS/ui add lucide-react
```

---

## 9. Project Conventions

### Git branches

```
main           → production
staging        → staging (auto-deploys to Railway staging)
feature/xxx    → feature branches (PR → staging → main)
fix/xxx        → bug fixes
```

### Commit format

```
feat: add blended MER dashboard
fix: correct fatigue alert threshold calculation
chore: update DataForSEO API client
docs: add architecture section to ARCHITECTURE.md
```

### File naming

- TypeScript: `camelCase.ts` for utilities, `PascalCase.tsx` for components
- Python: `snake_case.py` everywhere
- SQL migrations: `0001_initial.sql`, `0002_add_recommendations.sql` (sequential)

### TypeScript rules

- Strict mode enabled everywhere — no `any` types
- All API responses typed via `packages/types`
- Zod schemas for all request validation in Fastify routes

### No direct database queries from the frontend

The Next.js app never queries Neon Postgres directly. All data goes through the Fastify API. Server Components can call the API using the internal `apiClient` in `apps/web/lib/api.ts`.

---

## 10. Neon Database Branching

Neon lets you create isolated database branches from the production schema. Use this for feature development to avoid polluting shared dev data.

```bash
# Create a branch for your feature (using Neon CLI)
neon branches create --name feature/my-feature

# Get the connection string for your branch
neon connection-string --branch feature/my-feature

# Use it locally by overriding DATABASE_URL in your .env
DATABASE_URL=postgresql://... (branch connection string)
```

Delete the branch when your PR merges.

---

## 11. Troubleshooting

**`pnpm install` fails:**  
Make sure you're using pnpm v9 and Node.js 22. Run `pnpm --version` and `node --version`.

**Fastify server won't start:**  
Check `DATABASE_URL` is correct and Neon is accessible. Run `pnpm db:migrate` to ensure schema is up to date.

**Celery tasks not running:**  
Verify `CELERY_BROKER_URL` points to your Upstash Redis instance and the URL starts with `rediss://` (note double s — TLS required for Upstash).

**TypeScript errors after pulling:**  
Run `pnpm build --filter @growthOS/types` first to rebuild the shared types package before starting the dev server.

**ClickHouse connection refused:**  
If using Docker locally, make sure the container is running: `docker ps`. If using ClickHouse Cloud, check that your IP is in the allowed list.
