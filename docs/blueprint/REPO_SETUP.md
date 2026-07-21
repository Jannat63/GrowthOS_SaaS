# GrowthOS — Repository Setup

Exact commands to bootstrap the Turborepo monorepo from scratch. Run these in order.

---

## 1. Init Turborepo

```bash
npx create-turbo@latest growthOS --package-manager pnpm
cd growthOS
```

Replace the default `apps/` structure with:

```bash
# Remove create-turbo defaults
rm -rf apps/docs apps/web

# Create our app directories
mkdir -p apps/web apps/api apps/worker

# Create shared packages
mkdir -p packages/ui packages/types packages/db packages/config/typescript packages/config/eslint packages/config/tailwind
```

---

## 2. Root Configuration

**`package.json`** (root):
```json
{
  "name": "growthOS",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "db:migrate": "turbo db:migrate --filter @growthOS/db",
    "db:generate": "turbo db:generate --filter @growthOS/db",
    "db:studio": "turbo db:studio --filter @growthOS/db",
    "db:seed": "turbo db:seed --filter @growthOS/db"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "prettier": "^3.3.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

**`turbo.json`**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env.test*"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## 3. Shared TypeScript Config

**`packages/config/typescript/base.json`**:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 4. packages/types

```bash
cd packages/types
```

**`package.json`**:
```json
{
  "name": "@growthOS/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "*"
  }
}
```

Create `src/index.ts` — paste the TypeScript types from `DATA_MODELS.md`.

---

## 5. packages/db (Drizzle ORM)

```bash
cd packages/db
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit tsx
```

**`package.json`**:
```json
{
  "name": "@growthOS/db",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts"
  },
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  }
}
```

**`drizzle.config.ts`**:
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/**/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

---

## 6. apps/api (Fastify)

```bash
cd apps/api
pnpm init
pnpm add fastify @fastify/cors @fastify/websocket @fastify/jwt
pnpm add fastify-type-provider-zod zod
pnpm add drizzle-orm @neondatabase/serverless
pnpm add ioredis bullmq
pnpm add stripe @aws-sdk/client-s3
pnpm add resend
pnpm add better-auth
pnpm add -D typescript @types/node tsx vitest @vitest/coverage-v8 supertest @types/supertest
pnpm add -D @growthOS/types @growthOS/db
```

**`tsconfig.json`**:
```json
{
  "extends": "@growthOS/config/typescript/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**`src/app.ts`** (Fastify server setup):
```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.register(cors, { origin: process.env.WEB_URL })
  app.register(websocket)

  // Plugins
  app.register(import('./plugins/db'))
  app.register(import('./plugins/auth'))
  app.register(import('./plugins/redis'))
  app.register(import('./plugins/audit'))

  // Routes
  app.register(import('./routes/workspaces'), { prefix: '/api/v1/workspaces' })

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    if (error.code) {
      return reply.status(error.statusCode ?? 500).send({ error })
    }
    app.log.error(error)
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', statusCode: 500 } })
  })

  return app
}
```

**`src/index.ts`**:
```typescript
import { buildApp } from './app'

const app = buildApp()

app.listen({ port: Number(process.env.API_PORT ?? 3001), host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
})
```

**`Dockerfile`**:
```dockerfile
FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## 7. apps/web (Next.js 15)

```bash
cd apps/web
pnpm dlx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Add shadcn/ui
pnpm dlx shadcn@latest init

# Core dependencies
pnpm add zustand @tanstack/react-query socket.io-client recharts
pnpm add better-auth
pnpm add react-hook-form zod @hookform/resolvers
pnpm add -D @growthOS/ui @growthOS/types
```

**`next.config.ts`**:
```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@growthOS/ui'],
  experimental: {
    typedRoutes: true,
  },
}

export default config
```

---

## 8. apps/worker (Python)

```bash
cd apps/worker
python3.12 -m venv .venv
source .venv/bin/activate
```

**`requirements.txt`**:
```
fastapi==0.111.0
uvicorn[standard]==0.30.0
celery[redis]==5.4.0
anthropic==0.28.0
google-ads==24.0.0
facebook-business==20.0.0
pydantic==2.7.0
pydantic-settings==2.3.0
clickhouse-connect==0.7.0
asyncpg==0.29.0
sentence-transformers==3.0.0
scrapy==2.11.0
playwright==1.44.0
pandas==2.2.0
polars==0.20.0
httpx==0.27.0
python-dotenv==1.0.0
pytest==8.2.0
pytest-asyncio==0.23.0
pytest-mock==3.14.0
```

**`celery_app.py`**:
```python
from celery import Celery
from celery.schedules import crontab
import os
from dotenv import load_dotenv

load_dotenv()

app = Celery(
    'growthOS',
    broker=os.environ['CELERY_BROKER_URL'],
    backend=os.environ['CELERY_BROKER_URL'],
    include=[
        'app.workers.google_ads.search_terms',
        'app.workers.meta_ads.fatigue_monitor',
        'app.workers.seo.rank_tracker',
        'app.workers.intelligence.engine',
        'app.workers.intelligence.weekly_report',
    ]
)

app.conf.beat_schedule = {
    # Every 4 hours: core data pipeline
    'pull-google-ads-search-terms': {
        'task': 'app.workers.google_ads.search_terms.pull_all_workspaces',
        'schedule': crontab(minute=0, hour='*/4'),
    },
    'monitor-meta-fatigue': {
        'task': 'app.workers.meta_ads.fatigue_monitor.check_all_workspaces',
        'schedule': crontab(minute=30, hour='*/4'),
    },
    'run-intelligence-engine': {
        'task': 'app.workers.intelligence.engine.run_all_workspaces',
        'schedule': crontab(minute=0, hour='*/4'),
    },
    # Daily: rank tracking
    'run-rank-tracking': {
        'task': 'app.workers.seo.rank_tracker.track_all_workspaces',
        'schedule': crontab(minute=0, hour=6),  # 06:00 UTC
    },
    # Weekly: Growth Intelligence Report
    'generate-weekly-reports': {
        'task': 'app.workers.intelligence.weekly_report.generate_all',
        'schedule': crontab(minute=0, hour=20, day_of_week=0),  # Sunday 20:00 UTC
    },
}

app.conf.task_serializer = 'json'
app.conf.result_serializer = 'json'
app.conf.accept_content = ['json']
app.conf.timezone = 'UTC'
```

**`Dockerfile`**:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

COPY . .

# Worker entrypoint (Railway uses this)
CMD ["celery", "-A", "celery_app", "worker", "--loglevel=info", "--concurrency=4"]
```

For the beat scheduler (separate Railway service):
```dockerfile
CMD ["celery", "-A", "celery_app", "beat", "--loglevel=info"]
```

---

## 9. GitHub Actions CI

**`.github/workflows/ci.yml`**:
```yaml
name: CI

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    services:
      clickhouse:
        image: clickhouse/clickhouse-server:latest
        ports:
          - 8123:8123

    env:
      DATABASE_URL: ${{ secrets.NEON_CI_BRANCH_URL }}
      UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
      UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
          
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          
      - name: Install Node dependencies
        run: pnpm install --frozen-lockfile
        
      - name: TypeScript check
        run: pnpm typecheck
        
      - name: Lint
        run: pnpm lint
        
      - name: Build
        run: pnpm build
        
      - name: Test (Node)
        run: pnpm test
        
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          
      - name: Install Python dependencies
        run: |
          cd apps/worker
          pip install uv
          uv pip install --system -r requirements.txt
          
      - name: Test (Python)
        run: |
          cd apps/worker
          pytest --tb=short
```

---

## 10. Railway Deployment

Deploy as 3 separate Railway services from the same GitHub repo, each with a custom build command:

| Service | Build command | Start command |
|---|---|---|
| `growthOS-web` | `pnpm build --filter web` | `pnpm start --filter web` |
| `growthOS-api` | `pnpm build --filter api` | `node apps/api/dist/index.js` |
| `growthOS-worker` | `pip install -r apps/worker/requirements.txt` | `celery -A apps/worker/celery_app worker` |
| `growthOS-beat` | (same as worker) | `celery -A apps/worker/celery_app beat` |

Set `RAILWAY_DOCKERFILE_PATH` per service if using Dockerfiles.

---

## First Commands After Clone

```bash
# 1. Install everything
pnpm install

# 2. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env

# 3. Fill in env vars (see GETTING_STARTED.md)

# 4. Set up databases
pnpm db:migrate
cd apps/worker && python -m app.scripts.setup_clickhouse

# 5. Start dev
pnpm dev
# In separate terminal:
cd apps/worker && celery -A celery_app worker --loglevel=info
```
