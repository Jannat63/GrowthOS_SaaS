# GrowthOS Frontend Rebuild — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset `apps/web` in place to a fresh Next 15 / React 19 / Tailwind v4 / shadcn app delivering the design system, landing page, and full auth + onboarding flow — porting the tested logic engines and building a Better Auth client against the existing `apps/api` backend.

**Architecture:** In-place reset of `apps/web` internals (workspace + turbo wiring kept). A new `packages/ui` holds shared shadcn primitives consumed via `transpilePackages`. `apps/web/styles/globals.css` is the single theme source (Tailwind v4 `@theme` + shadcn CSS-variable tokens carrying the indigo/green identity). Auth pages call a Better Auth React client pointed at Fastify `/api/auth/*`.

**Tech Stack:** Next.js 15, React 19, Tailwind v4 (`@tailwindcss/postcss`), shadcn/ui, better-auth (react client), TanStack Query, vitest.

## Global Constraints

- **DO NOT COMMIT** — the user has asked not to commit. Each task lists a commit step for completeness; **stage/verify only, and run `git commit` solely when the user authorizes.** Keep the provided messages for that moment.
- Package names are `@growthos/*` (lowercase); cross-package deps use `workspace:*`.
- **shadcn-first (D6):** every UI primitive is a shadcn component; shared ones live in `packages/ui`.
- **Theme tokens only (D6 + user):** all color/radius/shadow/font come from CSS variables in `globals.css`; **no hardcoded hex in components** — reference tokens (`bg-background`, `text-primary`, `border-border`, `text-muted-foreground`).
- **Keep identity:** primary indigo `#4F46E5`, green accent `#10B981`, Inter font.
- **Port unchanged, do not edit:** `apps/web/lib/logic/*` (6 engines + 6 `*.test.ts`) and `apps/web/lib/utils/cn.ts`.
- **Legacy is reference-only** — never edit `/legacy`; copy patterns forward.
- Better Auth client base URL = the API origin (`http://localhost:3001`), via `NEXT_PUBLIC_API_URL`.
- Confirm current shadcn-CLI + Tailwind-v4 flags via context7 at execution (both move fast).

---

## File Structure

**`packages/ui/`** (new, `@growthos/ui`)
- `package.json`, `tsconfig.json`
- `src/lib/utils.ts` — re-exports `cn`
- `src/components/*.tsx` — shadcn primitives (button, input, label, card, dialog, dropdown-menu, table, tabs, form, sonner)

**`apps/web/`** (reset internals)
- `next.config.mjs`, `postcss.config.mjs`, `package.json`, `tsconfig.json` — fresh configs
- `styles/globals.css` — Tailwind v4 + theme tokens (source of truth)
- `components.json` — shadcn config (targets `@growthos/ui`)
- `app/layout.tsx`, `components/Providers.tsx` — root shell
- `app/(marketing)/{layout.tsx,page.tsx}` + `components/marketing/*` — landing
- `app/(auth)/{layout.tsx, sign-in, sign-up, welcome, verify-email, business-info, connect-accounts, create-workspace, onboarding-complete}/page.tsx`
- `lib/auth/client.ts` — Better Auth React client
- `middleware.ts` — session-gated route protection
- **Preserved:** `lib/logic/*`, `lib/utils/cn.ts`, `vitest.config.ts`

**Docs:** `DECISIONS.md`, `CLAUDE.md` (D5 update); `docs/plan/*`, `docs/plan/linear-titles.md` (fold phases).

---

## Task 1: `packages/ui` scaffold

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/lib/utils.ts`

**Interfaces:**
- Produces: package `@growthos/ui`; export `@growthos/ui/lib/utils` → `cn(...inputs: ClassValue[]): string`.

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@growthos/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./lib/utils": "./src/lib/utils.ts",
    "./components/*": "./src/components/*.tsx"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "echo \"no lint\""
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "lucide-react": "^0.460.0",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-tabs": "^1.1.2",
    "sonner": "^1.7.1"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@growthos/config": "workspace:*",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `packages/ui/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `packages/ui/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Install + typecheck**

Run: `pnpm install && pnpm --filter @growthos/ui typecheck`
Expected: install succeeds; typecheck passes (no components yet).

- [ ] **Step 5: Commit (HELD — do not run until authorized)**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): scaffold @growthos/ui package with cn util"
```

---

## Task 2: Reset `apps/web` to a fresh Tailwind v4 scaffold

Preserve `lib/logic/*`, `lib/utils/cn.ts`, `vitest.config.ts`. Remove old `app/`, `components/`, `styles/`, `tailwind.config.ts`, and the stale `lib/{api,hooks,mock-data}` (deferred to later slices — legacy holds the reference).

**Files:**
- Delete: `apps/web/app/**`, `apps/web/components/**`, `apps/web/tailwind.config.ts`
- Create: `apps/web/next.config.mjs`, `apps/web/postcss.config.mjs`, `apps/web/styles/globals.css`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx` (temp), `apps/web/components/Providers.tsx`, `apps/web/lib/auth/client.ts`
- Modify: `apps/web/package.json`, `apps/web/tsconfig.json`

**Interfaces:**
- Produces: themed Tailwind v4 build; `Providers` wrapping TanStack Query; token classes (`bg-background`, `text-primary`, …).

- [ ] **Step 1: Remove old visual layer + deferred libs**

```bash
cd apps/web
rm -rf app components tailwind.config.ts lib/api lib/hooks lib/mock-data
mkdir -p app components lib/auth styles
```
(Keep `lib/logic`, `lib/utils`.)

- [ ] **Step 2: Rewrite `apps/web/package.json`**

```json
{
  "name": "@growthos/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@growthos/ui": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "better-auth": "1.4.21",
    "zustand": "^5.0.2",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.9.0",
    "vitest": "^2.1.8"
  }
}
```

> Note: `better-auth` pinned `1.4.21` to match `apps/api` (avoids the version-skew that broke the CLI). `zustand` bumped to v5 (React 19). `lib/logic` tests need only vitest.

- [ ] **Step 3: Create `apps/web/postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 4: Create `apps/web/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@growthos/ui"],
};

export default nextConfig;
```

- [ ] **Step 5: Overwrite `apps/web/tsconfig.json`** (keep `@/*`, add `@growthos/ui` resolution via node)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Create `apps/web/styles/globals.css`** (the theme — source of truth)

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;

  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #4f46e5;
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;
  --secondary-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #10b981;
  --accent-foreground: #ffffff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e5e7eb;
  --input: #e5e7eb;
  --ring: #4f46e5;
}

.dark {
  --background: #0b1220;
  --foreground: #f8fafc;
  --card: #0f172a;
  --card-foreground: #f8fafc;
  --popover: #0f172a;
  --popover-foreground: #f8fafc;
  --primary: #818cf8;
  --primary-foreground: #0b1220;
  --secondary: #1e293b;
  --secondary-foreground: #f8fafc;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #10b981;
  --accent-foreground: #0b1220;
  --destructive: #ef4444;
  --destructive-foreground: #f8fafc;
  --border: #1e293b;
  --input: #1e293b;
  --ring: #818cf8;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
}
```

- [ ] **Step 7: Create `apps/web/components/Providers.tsx`** (port TanStack Query provider)

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 8: Create `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "GrowthOS",
  description: "Unified SEO + Google Ads + Meta Ads growth platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Create a temporary `apps/web/app/page.tsx`** (proves the theme; replaced in Task 4)

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">GrowthOS</h1>
        <p className="text-muted-foreground">Fresh frontend scaffold — theme tokens live.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 10: Install, build, and confirm ported logic tests pass**

Run: `pnpm install`
Run: `pnpm --filter @growthos/web build`
Expected: build succeeds; `/` compiles.
Run: `pnpm --filter @growthos/web test`
Expected: all 6 `lib/logic/*.test.ts` suites PASS (unchanged).

- [ ] **Step 11: Commit (HELD)**

```bash
git add apps/web pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "feat(web): reset apps/web to fresh Next 15 + Tailwind v4 scaffold with theme tokens"
```

---

## Task 3: Add shadcn primitives to `packages/ui`

Use the shadcn CLI to generate canonical component source into `packages/ui`, then fix the `cn` import to `@growthos/ui/lib/utils`. Confirm current flags via context7 first.

**Files:**
- Create: `apps/web/components.json`
- Create: `packages/ui/src/components/{button,input,label,card,dialog,dropdown-menu,table,tabs,form,sonner}.tsx`

**Interfaces:**
- Produces (representative signatures later tasks rely on):
  - `@growthos/ui/components/button` → `Button` (props: `variant?: "default"|"secondary"|"outline"|"ghost"|"destructive"|"link"; size?: "default"|"sm"|"lg"|"icon"; asChild?: boolean` + button attrs), `buttonVariants`
  - `@growthos/ui/components/input` → `Input`
  - `@growthos/ui/components/label` → `Label`
  - `@growthos/ui/components/card` → `Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter`
  - `@growthos/ui/components/sonner` → `Toaster`; toasts via `import { toast } from "sonner"`

- [ ] **Step 1: Create `apps/web/components.json`** (aliases point at `@growthos/ui`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@growthos/ui/components",
    "utils": "@growthos/ui/lib/utils",
    "ui": "@growthos/ui/components"
  }
}
```

- [ ] **Step 2: Generate the primitives**

Run (from `apps/web`): `pnpm dlx shadcn@latest add button input label card dialog dropdown-menu table tabs form sonner`
- If the CLI cannot write to the `@growthos/ui` alias in this monorepo layout, instead run `pnpm dlx shadcn@latest add <name>` to a temp dir and move each file into `packages/ui/src/components/`.
- In every generated file, ensure the util import is `import { cn } from "@growthos/ui/lib/utils";`.

- [ ] **Step 3: Add radix/sonner deps if the CLI didn't**

Run: `pnpm --filter @growthos/ui add @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-tabs class-variance-authority sonner react-hook-form @hookform/resolvers zod`

- [ ] **Step 4: Typecheck packages/ui**

Run: `pnpm --filter @growthos/ui typecheck`
Expected: PASS.

- [ ] **Step 5: Smoke-render a primitive** — update `apps/web/app/page.tsx` to use `Button`

```tsx
import { Button } from "@growthos/ui/components/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Button>GrowthOS</Button>
    </main>
  );
}
```

Run: `pnpm --filter @growthos/web build`
Expected: build succeeds; the shadcn Button compiles and Tailwind scans `packages/ui`.

> Ensure Tailwind v4 scans `packages/ui`: add `@source "../../packages/ui/src";` near the top of `apps/web/styles/globals.css` if utility classes from `packages/ui` are missing in the build.

- [ ] **Step 6: Commit (HELD)**

```bash
git add packages/ui apps/web/components.json apps/web/app/page.tsx apps/web/styles/globals.css pnpm-lock.yaml
git commit -m "feat(ui): add shadcn primitives to @growthos/ui"
```

---

## Task 4: Landing page (`app/(marketing)`)

**Files:**
- Create: `apps/web/app/(marketing)/layout.tsx`, `apps/web/app/(marketing)/page.tsx`
- Create: `apps/web/components/marketing/{SiteHeader,Hero,Features,HowItWorks,PricingTeaser,SocialProof,SiteFooter}.tsx`
- Delete: `apps/web/app/page.tsx` (root now lives in the marketing group)

**Interfaces:**
- Consumes: `Button` from `@growthos/ui/components/button`.
- Produces: `/` renders the marketing page.

- [ ] **Step 1: Create the marketing layout** `app/(marketing)/layout.tsx`

```tsx
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Create the section components** (`components/marketing/*`)

Build each as a shadcn/token-styled section — no hardcoded hex, tokens only. Representative `Hero.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@growthos/ui/components/button";

export function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        One platform for SEO, Google Ads &amp; Meta Ads growth
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        {/* PLACEHOLDER COPY — user supplies final marketing copy */}
        GrowthOS unifies your channels into a single insight loop.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </section>
  );
}
```

`SiteHeader` (logo placeholder + nav + Sign in / Get started), `Features` (three cards: SEO / Google Ads / Meta Ads using `Card`), `HowItWorks`, `PricingTeaser`, `SocialProof`, `SiteFooter` follow the same token-only pattern with placeholder copy.

- [ ] **Step 3: Create `app/(marketing)/page.tsx`**

```tsx
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PricingTeaser } from "@/components/marketing/PricingTeaser";
import { SocialProof } from "@/components/marketing/SocialProof";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <SocialProof />
      <PricingTeaser />
    </>
  );
}
```

- [ ] **Step 4: Remove the temp root page**

```bash
rm apps/web/app/page.tsx
```

- [ ] **Step 5: Build + render check**

Run: `pnpm --filter @growthos/web build`
Expected: build succeeds; `/` is static.
Run (manual): `pnpm --filter @growthos/web dev` → open `http://localhost:3000/` → landing renders, CTAs link to `/sign-up` and `/sign-in`.

- [ ] **Step 6: Commit (HELD)**

```bash
git add apps/web/app apps/web/components/marketing
git commit -m "feat(web): public marketing landing page at /"
```

---

## Task 5: Better Auth React client

**Files:**
- Create: `apps/web/lib/auth/client.ts`, `apps/web/.env.local`, `apps/web/.env.example`

**Interfaces:**
- Produces: `authClient`; named exports `signIn`, `signUp`, `signOut`, `useSession`, and `authClient.organization.create(...)`.

- [ ] **Step 1: Create `apps/web/lib/auth/client.ts`**

```ts
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

- [ ] **Step 2: Create `apps/web/.env.local` and `.env.example`**

```bash
# .env.local  (gitignored)
NEXT_PUBLIC_API_URL=http://localhost:3001
```
```bash
# .env.example
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @growthos/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit (HELD)**

```bash
git add apps/web/lib/auth apps/web/.env.example
git commit -m "feat(web): better-auth react client pointed at apps/api"
```

---

## Task 6: Sign-in + sign-up pages (wired to Neon)

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`, `apps/web/app/(auth)/sign-in/page.tsx`, `apps/web/app/(auth)/sign-up/page.tsx`

**Interfaces:**
- Consumes: `signIn`, `signUp` from `@/lib/auth/client`; `Card*`, `Input`, `Label`, `Button` from `@growthos/ui`.

- [ ] **Step 1: Create `app/(auth)/layout.tsx`** (centered card shell)

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(auth)/sign-up/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth/client";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from "@growthos/ui/components/card";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) { setError(error.message ?? "Sign up failed"); return; }
    router.push("/welcome");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start your GrowthOS workspace.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link className="text-primary" href="/sign-in">Sign in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/sign-in/page.tsx`** (same shape, `signIn.email({ email, password })`, redirect to `/welcome` on success, link to `/sign-up`).

- [ ] **Step 4: Build**

Run: `pnpm --filter @growthos/web build`
Expected: PASS.

- [ ] **Step 5: End-to-end verify (manual, both servers up)**

Run API: `pnpm --filter @growthos/api dev` (needs `apps/api/.env`)
Run web: `pnpm --filter @growthos/web dev`
Open `http://localhost:3000/sign-up` → submit → redirected to `/welcome`.
Verify a new row in Neon:
```bash
cd packages/db && pnpm exec tsx -e "import('dotenv/config').then(async()=>{const {db,schema}=await import('./src/client.js');console.log((await db.select().from(schema.user)).length)})"
```
Expected: user count incremented.

- [ ] **Step 6: Commit (HELD)**

```bash
git add apps/web/app/\(auth\)
git commit -m "feat(web): sign-in + sign-up wired to better-auth"
```

---

## Task 7: Welcome + verify-email pages

**Files:**
- Create: `apps/web/app/(auth)/welcome/page.tsx`, `apps/web/app/(auth)/verify-email/page.tsx`

- [ ] **Step 1: `welcome/page.tsx`** — post-signup landing; greets the session user (`useSession`) and links to `/business-info` to start onboarding. Token-styled, `Card` + `Button`.
- [ ] **Step 2: `verify-email/page.tsx`** — static "check your inbox" screen (email verification backend deferred); `Button` to resend is a no-op placeholder clearly commented.
- [ ] **Step 3: Build** — `pnpm --filter @growthos/web build` → PASS.
- [ ] **Step 4: Commit (HELD)** — `git commit -m "feat(web): welcome + verify-email pages"`

---

## Task 8: Onboarding pages

**Files:**
- Create: `apps/web/app/(auth)/business-info/page.tsx`, `connect-accounts/page.tsx`, `create-workspace/page.tsx`, `onboarding-complete/page.tsx`

**Interfaces:**
- Consumes: `authClient.organization.create` (create-workspace); shadcn form primitives.

- [ ] **Step 1: `business-info/page.tsx`** — form (business name, website, category, monthly budget); on submit, store in client state (Zustand) and `router.push("/connect-accounts")`. Backend persistence deferred (M2) — comment it.
- [ ] **Step 2: `connect-accounts/page.tsx`** — grid of channel cards (Google Ads, GSC, Meta, Shopify) each with a "Connect" button that is a placeholder (OAuth is M2); "Skip for now" → `/create-workspace`.
- [ ] **Step 3: `create-workspace/page.tsx`** — real: name + slug form → `await authClient.organization.create({ name, slug })` → on success `router.push("/onboarding-complete")`. Show `error.message` on failure. This writes `workspaces` + owner `workspace_members` in Neon (verified in P1.2).
- [ ] **Step 4: `onboarding-complete/page.tsx`** — success screen; primary button links to `/growth-hub` (dashboard, built in a later slice — leave the link, it 404s until then; comment it).
- [ ] **Step 5: Build** — `pnpm --filter @growthos/web build` → PASS.
- [ ] **Step 6: Verify create-workspace (manual)** — signed in, submit the form; confirm a `workspaces` row appears in Neon (reuse the query from Task 6 Step 5 against `schema.workspaces`).
- [ ] **Step 7: Commit (HELD)** — `git commit -m "feat(web): onboarding flow (business-info, connect-accounts, create-workspace, complete)"`

---

## Task 9: Session-gated middleware

**Files:**
- Create: `apps/web/middleware.ts`

**Interfaces:**
- Consumes: Better Auth `get-session` endpoint on the API via `better-auth/client`'s `betterFetch`.

- [ ] **Step 1: Create `apps/web/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

const PROTECTED = ["/business-info", "/connect-accounts", "/create-workspace", "/onboarding-complete"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const { data: session } = await betterFetch("/api/auth/get-session", {
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  if (!session) {
    const url = new URL("/sign-in", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/business-info/:path*", "/connect-accounts/:path*", "/create-workspace/:path*", "/onboarding-complete/:path*"],
};
```

> `@better-fetch/fetch` ships as a better-auth dependency; if unresolved, add it: `pnpm --filter @growthos/web add @better-fetch/fetch`.

- [ ] **Step 2: Build** — `pnpm --filter @growthos/web build` → PASS.
- [ ] **Step 3: Verify (manual)** — logged out, visit `/create-workspace` → redirected to `/sign-in`; logged in → renders.
- [ ] **Step 4: Commit (HELD)** — `git commit -m "feat(web): session-gated middleware for onboarding routes"`

---

## Task 10: Full verification

- [ ] **Step 1: Whole-monorepo build** — Run: `pnpm build` → Expected: api + web + db + ui all green.
- [ ] **Step 2: Logic tests** — Run: `pnpm --filter @growthos/web test` → Expected: 6 suites PASS.
- [ ] **Step 3: Typecheck** — Run: `pnpm typecheck` → Expected: PASS.
- [ ] **Step 4: Manual smoke** — both servers up; `/` landing, `/sign-up` → Neon user, `/create-workspace` → Neon workspace, logged-out `/create-workspace` → redirect. Toggle `.dark` on `<html>` → theme flips via tokens.

---

## Task 11: Docs reconciliation

**Files:**
- Modify: `docs/blueprint/DECISIONS.md` (D5), `CLAUDE.md` (frontend sections), `docs/plan/M1-platform-spine/README.md`, `docs/plan/M1-platform-spine/progress.md`, `docs/plan/PROGRESS.md`, `docs/plan/linear-titles.md`
- Create: `docs/plan/M1-platform-spine/P1.7-frontend-rebuild-slice1/{plan.md,progress.md}` (or repurpose P1.5/P1.6/P1.4a)

- [ ] **Step 1: Update D5** in `DECISIONS.md` to the rebuilt-fresh-in-slices wording (from spec §9); add a dated note that it supersedes the carry-forward decision.
- [ ] **Step 2: Update `CLAUDE.md`** — the `apps/web` "carried forward verbatim" and "Tailwind v3 + ad-hoc" lines become "rebuilt fresh on Next 15 / React 19 / Tailwind v4 / shadcn; `packages/ui` holds shared primitives; theme tokens in `globals.css`."
- [ ] **Step 3: Reconcile `docs/plan`** — fold P1.5 (shadcn), P1.6 (landing), P1.4a (login) into a **P1.7 Frontend rebuild — Slice 1** phase (or mark those three as absorbed); keep P1.3 + P1.4b. Update M1 README/progress + master PROGRESS + `linear-titles.md` accordingly.
- [ ] **Step 4: Commit (HELD)** — `git commit -m "docs: reverse D5 (fresh frontend rebuild) and reconcile plan"`

---

## Notes on TDD for this slice

Most of Slice 1 is scaffolding + UI, where the effective "tests" are `build`, `typecheck`, the ported `lib/logic` vitest suites, and manual browser + Neon-row checks (each task's verify step). The one place with real unit tests is the ported logic engines — Task 2 Step 10 asserts they still pass unchanged. Component/page unit tests are deferred to later slices where interactive behavior warrants them.
