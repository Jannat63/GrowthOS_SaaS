# GrowthOS — Modular Packages & Super Admin: Implementation Document

Research-and-design document only, per your instruction — no code was written for this. Everything
below is grounded in the actual current codebase (file/table names throughout are real, not
illustrative), plus current SaaS industry practice on modular billing and admin-tier design.

---

## 1. What's changing, in plain terms

**Today:** every customer buys one of three tiers (Starter/Growth/Scale). Every tier includes
*every* tool (SEO, Google Ads, Meta Ads) — the tiers only differ by usage limits (how many
keywords, how many workspaces, how many teammates).

**What you're asking for:** flip the axis. A customer should be able to buy just the SEO toolset,
just the Meta toolset, just the Google Ads toolset, or all of them together — each with its own
price — instead of always getting everything.

**Plus:** a platform-wide Super Admin layer that sits above all of this — able to see and manage
every customer, every workspace, every purchased module, and handle support conversations. Nothing
like this exists in the app today; workspace roles (owner/admin/manager/viewer/client) are scoped
to a single workspace and grant no cross-workspace visibility at all.

These are two genuinely separate systems (billing/access vs. platform administration) and I've
treated them as such below, but they share one piece of infrastructure — an audit log — so I've
called that out once rather than twice.

---

## 2. Part A — Modular Packages & Per-Module Billing

### 2.1 Recommended package structure

Three purchasable **Channel Modules**, plus a **Full Suite** bundle:

| Module | What's included |
|---|---|
| **SEO** | Rank Tracker, Organic Traffic, Site Audit, Core Web Vitals, Keyword Clustering, Schema Markup, Internal Links, Content Pipeline |
| **Google Ads** | Campaign Insights, RSA Generator, Budget Planner, Google Ads Search Terms tools |
| **Meta Ads** | Campaign Insights, Ad Copy Studio, Funnel Planner, Creative Queue, Creative Fatigue monitor |
| **Full Suite** | All three modules, at a bundled discount — and this is the tier where the *cross-channel* features (see 2.2) reach their full value |

This maps cleanly onto how the codebase already thinks about connected platforms — see
`apps/web/lib/hooks/useDataProvenance.ts`'s `MODULE_PLATFORMS` map, which already groups every
page by which platform(s) it depends on (`seo` → Search Console, `googleAds` → Google Ads,
`metaAds`/`fatigue` → Meta). That map is effectively the seed of the new entitlement system — it
already knows which pages belong to which module, it's just never been used to *gate* anything.

**Why this grouping and not a finer one:** Creative Queue and the Fatigue Monitor are Meta-specific
today (their data comes from Meta creative performance), so they belong inside the Meta module
rather than as a separate purchase — a customer with no Meta connection has nothing for those pages
to show. Content Pipeline is SEO-rooted (it turns organic-traffic signal into content briefs) so it
sits in SEO. If Google Ads-side creative tooling is added later, the same logic would put it in the
Google Ads module.

### 2.2 The cross-channel problem (read this before deciding on pricing)

Growth Hub, Intelligence, Recommendations, Analytics, Attribution, and Automation aren't
channel-specific — they're *bridges* between channels (e.g. `paid_to_organic` needs both Google Ads
**and** Search Console data; `blendedMER` needs both Google Ads **and** Meta Ads spend). A customer
who buys only the Meta module literally cannot generate a `paid_to_organic` recommendation — the
inputs it needs don't exist in their account.

Two ways to handle this, and this is a real product decision, not an engineering one:

- **Option A (recommended): these pages are available to everyone, and gracefully show only what
  the owned modules support.** A Meta-only customer's Growth Hub shows Meta stats and Meta-only
  recommendations; cross-channel bridge recommendations simply don't appear because their inputs
  aren't there. This costs little to build — the "not connected" empty-state pattern already exists
  throughout the app (e.g. every `ChannelColumn` on Growth Hub already renders "Not connected" for
  an unowned platform) — it just needs to also account for "not entitled," not only "not connected."
- **Option B: these pages are Full-Suite-exclusive.** Simpler to reason about, but it means a
  Meta-only customer gets no dashboard/growth-hub-style home at all — just the raw Meta tool pages.
  Feels more like a set of disconnected tools than a product.

I'd steer toward Option A, but this changes what "buying only Meta" actually feels like to a
customer, so it's worth deciding deliberately rather than by default.

### 2.3 Data model changes

**New table: `workspace_entitlements`** (replaces the module-access half of what `subscriptions`
currently implies via `plan`):

```
workspace_entitlements
  id                uuid primary key
  workspace_id      text not null           -- app-layer enforced, same convention as every other table here
  module            text not null           -- 'seo' | 'google_ads' | 'meta_ads' | 'full_suite'
  status            text not null           -- 'active' | 'canceled' | 'past_due'
  stripe_subscription_item_id  text unique  -- which Stripe line item grants this
  current_period_end  timestamptz
  created_at        timestamptz default now()
  updated_at        timestamptz default now()

  unique (workspace_id, module)
```

A workspace's entitlements are just the set of rows here with `status = 'active'`. `full_suite`
being present is equivalent to having all three individual modules — check for it explicitly in the
authorization helper (see 2.5) rather than writing four rows per Full Suite purchase.

**`subscriptions` table:** keep it. It still tracks the Stripe customer/subscription relationship
and billing period at the *subscription* level (dunning, trial, cancellation) — `plan` becomes
less meaningful (a workspace's "plan" is now the set of modules it owns, not a single tier) but
`stripeCustomerId`, `status`, `currentPeriodEnd` etc. are still exactly what the billing-lifecycle
code (`checkTrialsEndingSoon`, portal sessions, dunning emails) needs and shouldn't be duplicated.

**`PLAN_LIMITS` (packages/types):** this needs to become per-module rather than per-tier. Concretely:
`trackedKeywords` and `contentBriefs` limits belong to the SEO module; `adSpendLimit` and campaign
counts split across Google Ads/Meta Ads; `teamMembers` and `workspaces` remain workspace-wide
(they're not channel-specific). Recommend restructuring this into something like:

```ts
WORKSPACE_LIMITS = { teamMembers, workspaces }               // unchanged, workspace-wide
MODULE_LIMITS = {
  seo:        { trackedKeywords, contentBriefsPerMonth },
  google_ads: { adSpendVisibilityLimit },
  meta_ads:   { adSpendVisibilityLimit, aiCreativesPerMonth },
}
```
with `whiteLabel`, `apiAccess`, `geoTracking` becoming either Full-Suite-only perks or their own
small add-ons (a business decision — see §5).

### 2.4 Stripe architecture

Stripe already supports exactly this shape: **one Subscription per workspace, with up to 20
Subscription Items on it** — each module purchase is its own SubscriptionItem, all billed together
on one invoice. This avoids the far messier alternative of one Stripe Subscription *per module* per
customer (multiple invoices, multiple payment retries, multiple places dunning can independently
fail).

- **New Stripe Products/Prices:** `price_seo`, `price_google_ads`, `price_meta_ads`,
  `price_full_suite` (env vars: `STRIPE_PRICE_SEO`, `STRIPE_PRICE_GOOGLE_ADS`,
  `STRIPE_PRICE_META_ADS`, `STRIPE_PRICE_FULL_SUITE`, replacing today's
  `STRIPE_PRICE_STARTER/GROWTH/SCALE`).
- **Checkout:** `createCheckoutSession` (`apps/api/src/billing.ts`) currently builds a
  single-line-item session. It needs to accept a list of selected modules and build one line item
  per module (or a single Full Suite line item if that's what's selected).
- **Adding a module later** (a Meta-only customer decides to add SEO): this should **update the
  existing subscription** (`stripe.subscriptionItems.create` against the existing subscription ID)
  rather than create a second subscription — this is what keeps billing as one invoice, one
  renewal date, one dunning flow. Stripe prorates this automatically.
- **Removing a module:** `stripe.subscriptionItems.del(...)`. Decide up front whether this takes
  effect immediately or at period end — immediate is simpler to reason about but forfeits the
  remainder of what was paid; at-period-end is what most SaaS products do (`cancel_at_period_end`
  equivalent, but per-item — Stripe doesn't have a single "cancel this item at period end" flag,
  so this actually means scheduling the removal via a `Subscription Schedule` rather than deleting
  the item immediately. Worth a small time-boxed spike before committing to it).
- **Webhook handling** (`handleWebhookEvent`, same file): today it updates one `subscriptions` row
  per `customer.subscription.updated` event. It needs to also walk `event.data.object.items.data`
  and upsert one `workspace_entitlements` row per subscription item, matching each item's `price.id`
  back to a module via a small `PRICE_TO_MODULE` lookup (the mirror image of today's
  `PLAN_STRIPE_PRICE` map).

### 2.5 Enforcement (the actual gating)

New guard, same shape as the existing ones in `apps/api/src/guards.ts`:

```ts
export async function requireModuleAccess(workspaceId: string, module: Module): Promise<void> {
  const entitled = await hasModuleAccess(workspaceId, module) // checks workspace_entitlements, 'full_suite' counts as all
  if (!entitled) throw new AppError('INTEGRATION_NOT_CONNECTED', `The ${module} module isn't part of this workspace's plan.`)
  // (or a new, more accurate error code — MODULE_NOT_PURCHASED — see 2.6)
}
```

Called at the top of every module-specific route (`/seo/*`, `/google-ads/*`, `/meta-ads/*`) right
alongside the existing `requireWorkspaceMember` call — same pattern, second check.

**Frontend:** the Sidebar's existing `NAV_GROUPS` (`apps/web/components/layout/Sidebar.tsx`) already
groups by module (`Channels: SEO / Google Ads / Meta Ads`). Add an `entitled: boolean` per group,
computed from the workspace's entitlements (fetched once, cached like `useWorkspace` already is).
An unentitled module's nav items render in a locked state (already has a visual precedent — the
`ready: false` "Soon" badge pattern already used for not-yet-built pages) linking to an upsell/
upgrade page rather than 404ing when someone types the URL directly — the API-level guard in 2.5
is still what actually protects the data; the UI treatment is just about not looking broken.

### 2.6 New error code

Add `MODULE_NOT_PURCHASED` to `ERROR_STATUS` (`packages/types/src/index.ts`) — 402, same status as
`PLAN_LIMIT_REACHED` but a distinct code, since "you're on a plan that doesn't include this" and
"you're over your plan's usage limit" are different situations that deserve different upsell copy
on the frontend.

### 2.7 Migration path for anyone already subscribed

If there are any real Starter/Growth/Scale subscribers before this ships (worth confirming — the
production-readiness review found billing was still in Stripe test mode, so this may be moot), the
honest options are: **(a)** grandfather everyone existing onto `full_suite` at their current price
(simplest, no one feels a downgrade), or **(b)** map each tier to a specific starting module set
you choose. Either way this is a one-time backfill script, not something the live app needs to
handle dynamically.

---

## 3. Part B — Account-Level Division: The Super Admin Layer

### 3.1 Two different admin needs, worth naming separately

Your message describes two things that are related but shouldn't be the same permission level:

1. **Full platform control** — every user, every workspace, every module, billing overrides,
   ability to comp/revoke access.
2. **Customer support** — needs to see enough to help someone (their workspace, their connection
   status, their recent activity) but has no real reason to edit billing or delete accounts.

Recommend two roles, not one undifferentiated "admin":

| Role | Can do |
|---|---|
| `super_admin` | Everything — view/edit any workspace, any user, any entitlement; issue refunds/comps; impersonate a user; manage other admin accounts |
| `support_agent` | View any workspace (read-only) + the support inbox; can impersonate a user for troubleshooting (logged); cannot change billing, cannot delete workspaces/users |

This isn't just caution for its own sake — it's what limits the blast radius the day a support
contractor's account is compromised or a support agent makes a mistake, and it's the standard
shape this takes at every SaaS company doing it well.

### 3.2 Where this lives: same app or a separate one

This is the single biggest architecture decision in this whole document, so I'm laying out both
options plainly rather than picking silently.

**Option A — Separate admin application** (its own subdomain, e.g. `admin.growthos.app`; its own
Next.js app in the monorepo, e.g. `apps/admin`, sharing `packages/db`/`packages/types` with the
rest). This is what most mature platforms do (internal ops tools are almost never bolted onto the
customer-facing app) because:
  - The customer-facing app's JS bundle never ships any "view any customer's data" code at all —
    nothing to find in dev tools, nothing to accidentally expose via a bug in that app.
  - A compromised customer session can't reach admin functionality no matter what — it's a
    completely different login, different cookie, arguably a different auth provider config.
  - It can enforce stricter rules (mandatory MFA, IP allowlisting, shorter session timeout) without
    forcing those same restrictions on regular customers.

  Cost: a second app to build, deploy, and maintain — meaningfully more work than Option B.

**Option B — A protected route group in the existing app** (`apps/web/app/(admin)/*`), gated by a
`platformRole` check in addition to normal auth. Much less work — reuses the existing design
system, auth session, deployment. The risk is real but manageable at small scale: it does mean the
"god mode" code ships in the same bundle as the customer app, and a bug in the route-guard logic is
a much bigger deal than a bug in a normal page.

**My recommendation:** start with Option B to get this live quickly, but treat it as a known,
written-down trade-off you'll revisit — not a permanent decision made by default. Whichever you
pick, the guard and data model below are identical.

### 3.3 Data model

**Extend the `user` table** with a platform-level role. Because `packages/db/src/schema/auth.ts` is
generated by Better Auth's own tooling, don't hand-edit that file directly — Better Auth supports
custom fields on the user table via its `additionalFields` config (confirm the exact current API
against Better Auth's own docs when this is implemented; this detail may have moved since my
training data), which is what keeps a future regeneration of that file from silently dropping the
column.

```
user.platformRole   text nullable   -- null | 'support_agent' | 'super_admin'
```

**New table: `admin_audit_log`** — this is the one piece of infrastructure I'd consider genuinely
non-negotiable, not a nice-to-have, given the level of access involved:

```
admin_audit_log
  id             uuid primary key
  actor_user_id  text not null        -- who did it
  action         text not null        -- 'workspace.view' | 'entitlement.grant' | 'user.impersonate' | 'subscription.override' | ...
  target_type    text not null        -- 'workspace' | 'user' | 'subscription'
  target_id      text not null
  metadata       jsonb                -- before/after values where relevant
  created_at     timestamptz default now()
```

Every super-admin/support-agent action that touches a customer's data or account gets a row here —
including read access to sensitive views (viewing a customer's billing details is itself worth
logging, not just changes). This is what makes "who looked at my account and why" an answerable
question later, which matters both for your own trust with customers and for basic operational
hygiene.

### 3.4 New guard

```ts
export async function requirePlatformRole(userId: string, minRole: 'support_agent' | 'super_admin') {
  const [u] = await db.select({ role: schema.user.platformRole }).from(schema.user).where(eq(schema.user.id, userId))
  if (!u?.role) throw new AppError('FORBIDDEN', 'Admin access required.')
  if (minRole === 'super_admin' && u.role !== 'super_admin') throw new AppError('FORBIDDEN', 'Super admin access required.')
  await logAdminAction(userId, 'route.access', ...) // see 3.3
}
```

Every admin route calls this instead of (not in addition to) `requireWorkspaceMember` — an admin
route by definition isn't scoped to a workspace the caller is a member of.

### 3.5 Super Admin feature set (recommended scope for a first version)

- **Workspace/user directory** — search and list every workspace and every user, with their
  current entitlements, subscription status, and connected platforms at a glance.
- **Entitlement overrides** — manually grant/revoke a module for a workspace (comps, manual fixes
  when Stripe and the app disagree, extending a trial). Every override writes to
  `admin_audit_log` with a required reason field — don't allow an override without one.
- **Impersonation** — "view as this user" for support/debugging, time-boxed (auto-expires, e.g.
  after 30 minutes) and loudly logged. This is standard practice, but it's also the single
  highest-risk feature in this list, so it deserves its own confirmation step in the UI ("You are
  about to view this account as [email]. This will be logged.") rather than being one click away.
- **Billing visibility** — read access to each workspace's Stripe subscription state (via your own
  `subscriptions`/`workspace_entitlements` tables, not a live Stripe API call per page load).
- **Platform health** — aggregate numbers: active workspaces per module, trial conversion rate,
  MRR by module — genuinely useful for you, and a natural home for metrics you'd otherwise have to
  pull from Stripe's dashboard by hand.
- **Support inbox** — see Part C below.

### 3.6 Explicitly out of scope for a first version

Don't build these yet, even though "control everything" invites scope creep toward them:
- Editing a customer's actual campaign/creative data on their behalf (as opposed to their
  account/billing state) — too much risk for too little benefit early on.
- A permissions-builder UI for creating custom admin roles beyond the two above — two roles is
  enough until you have evidence you need more.

---

## 4. Part C — Customer Support Chat

Two real options, given the standing "no paid tools for now" preference:

### Option 1 (recommended): Self-hosted Chatwoot
Chatwoot (github.com/chatwoot/chatwoot) is MIT-licensed, free to self-host indefinitely (you pay
only for the server it runs on), and is a genuinely mature product — live chat widget, shared
inbox, and a help center — not a toy. It's a separate Ruby on Rails application (its own Postgres +
Redis + Sidekiq workers), so it runs alongside GrowthOS rather than inside it.
  - **Integration point:** embed Chatwoot's chat widget in the customer-facing app (a script tag,
    genuinely trivial), and either give your Super Admin panel a link out to Chatwoot's own agent
    dashboard, or — for tighter integration — use Chatwoot's API to surface open conversation counts
    inside the Super Admin panel itself.
  - **Honest cost:** someone has to run and maintain a second, fairly heavyweight application. Its
    own docs and third-party reviews are consistent on this: self-hosting Chatwoot at real scale is
    an ongoing maintenance task, not a set-and-forget deploy. Fine for a small team; worth
    re-evaluating if support volume grows a lot.

### Option 2: A native, minimal support-ticket feature inside GrowthOS
A `support_tickets` + `support_messages` table pair, a simple inbox view in the Super Admin panel,
and a "Contact support" form/widget in the customer app. Far less powerful (no email/WhatsApp
channels, no AI-assisted replies, you're building and maintaining the UI yourself) but it's just
more rows in the database you already run — no second application, no separate ops burden.

**My recommendation:** Option 1 if you're comfortable running one more service; Option 2 if you'd
rather everything live in one deployable app for now and can live with something more basic.
Either can be swapped for the other later without much sunk cost, since the "customer contacts
support" surface area on the customer-facing side is small either way.

---

## 5. Open decisions — these are yours to make, not mine

I've made reasonable defaults throughout, but these are genuine business calls:

1. **Exact price per module**, and whether Full Suite is a flat discount (e.g. 20% off the sum) or
   its own independently-set price.
2. **Do usage tiers still exist within a module** (e.g. "SEO Basic" vs "SEO Pro" with different
   keyword limits), or is each module a single flat price to start? Starting flat is simpler and
   easier to walk back from than the reverse.
3. **Cross-channel pages: Option A or B from §2.2.**
4. **Existing subscribers' migration** (§2.7), if applicable.
5. **Chatwoot vs. native support** (Part C).
6. **Admin app: separate deployment vs. same-app route group** (§3.2) — I'd revisit this
   specifically once you know your support-team headcount; it matters a lot more at 5 support
   agents than at 1.
7. **Immediate vs. end-of-period module removal** (§2.4) when a customer downgrades.

---

## 6. Suggested build order

1. **Schema first**: `workspace_entitlements`, `user.platformRole`, `admin_audit_log` — additive,
   nothing breaks, can ship behind the scenes before any UI exists for it.
2. **Stripe multi-product checkout + webhook updates** (§2.4) — the money-handling part, gets the
   riskiest piece done and tested early.
3. **Enforcement** (§2.5–2.6) — API guards, then Sidebar/nav gating.
4. **Super Admin MVP** (§3.5, minus impersonation) — directory + entitlement overrides + audit log.
5. **Impersonation** — deliberately last among admin features; it's the one with the least room for
   error.
6. **Support chat** (Part C) — independent of everything above; can genuinely happen in parallel
   with 1–5 if you have the bandwidth, since it doesn't touch billing or entitlements at all.
