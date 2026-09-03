# M6 — Platform Operations & Public Surface

Status: 🟨 In progress  ·  Updated: 2026-09-04

**Recorded retrospectively, and that is the first thing worth recording.** Every phase below was
built between 2026-08-27 and 2026-09-04 without a plan document, because none of it belonged to a
milestone: M5 closed as "Launch & Monetization" and none of M1–M5 owned a platform console, a blog,
or the public site beyond a landing page. So this milestone was opened *after* the work, and the
subphases have no `plan.md` — writing one now would be fiction dressed as a specification, which is
the exact failure M4 P4.2 already recorded ("a plan written from the roadmap rather than the code is
not yet a specification").

The lesson is cheap and worth keeping: **two surfaces a launch actually needs — the one staff
operate the product from, and the one customers arrive on — were absent from a roadmap that had
five milestones and a go-live checklist.**

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| P6.1 | Admin console | [x] | Directories, overview, account file, audit log. Migrations `0018`–`0019`. |
| P6.2 | Staff security | [x] | Two-factor, step-up re-auth, super-admin alerting. Migrations `0020`–`0021`. |
| P6.3 | Blog CMS | [x] | DB-backed posts + a Tiptap editor in the console. Migration `0022`. |
| P6.4 | Public site & SEO | [x] | Legal pages, per-page metadata, cookie consent, loading/error states. |
| — | Test coverage | [ ] | **`apps/api` has no test file for either `admin.ts` or `blog.ts`.** See below. |

## The open item, stated plainly

**P6.1 and P6.3 shipped without route tests.** Every other surface in this codebase that touches
customer data has them — `collaboration.test.ts`, `invitations.test.ts`, `webhooks.test.ts`,
`public-api.test.ts` — and the admin console is the surface where the absence matters most, because
it is the one place where one account's session reaches another account's data. The authorization
is real (`requirePlatformRole` on every route, `requireStepUp` on the sensitive ones, audit rows
written before the response) but it is unverified by anything except manual use.

This is the M6 backlog. It is not blocked on anything external.

## P6.1 — Admin console

`/admin`, and `apps/api/src/routes/admin.ts` behind it. A platform console: every customer at once,
rather than one workspace at a time.

- **Roles** in `apps/api/src/guards.ts` — `support_agent` (reads) and `super_admin` (writes), ranked
  so a route asks for a minimum rather than an exact match.
- **Directories** for workspaces and accounts, with an account file per person. These first shipped
  rendering the first fifty rows over a `total` of several hundred and calling that the platform —
  the API had supported `limit`/`offset` the whole time and nothing sent them. Search, filter chips
  and sort all query the whole table, not the loaded page, because "which accounts are past due"
  answered with "the past-due ones on page one" is worse than not offering the filter.
- **The overview** was rebuilt three times. It began as four figures on an empty screen; it now
  carries a funnel, channel mix, return, and outcomes over a selectable date range.
- **The audit log**, readable — `admin-audit.ts` records one row per write, always, and collapses
  repeated reads. A repeated write is a different event even when it looks identical; collapsing two
  plan overrides would hide that someone did it twice.
- **Design**: the console is not a dark-painted dashboard. It reuses the dashboard's rail rather
  than growing a second navigation system, and colour follows one rule (`components/admin/tone.ts`)
  — colour says what needs a human and nothing else. Ember belongs to the operator's own actions, so
  it is never a state; gold marks "not the normal state"; there is no green on a healthy row.

**Two real defects found and fixed on the way in:** the overview counted customers who had been
deleted, and a super admin had to create a customer workspace before they could reach the console at
all — platform staff own no workspace, and routing on membership sent them into customer onboarding
with no link to the console they had signed in for.

## P6.2 — Staff security

Two-factor authentication (Better Auth's plugin, migrations `0020`/`0021`), step-up
re-authentication (`admin-stepup.ts`), and super-admin alerting on sensitive actions
(`admin-alerts.ts`).

The console **walls a new operator until their profile is complete and 2FA is on**, and both walls
hide the console's own navigation while up — there is no way past them other than through. Changing
another account's billing or access then requires re-authenticating at the moment of the action,
not merely holding a session.

`0021` exists because `0020` created the `twoFactor` table missing half the plugin's fields; the
schema was written from memory rather than from the plugin's own definition.

## P6.3 — Blog CMS

`packages/db/src/schema/blog.ts` (migration `0022`), `apps/api/src/blog.ts`, `routes/blog.ts` for
the public read side, and a writing surface at `/admin/blog`.

- **Posts store ProseMirror JSON, not HTML** (`jsonb body`). Nothing author-supplied is ever
  injected as markup, which removes the stored-XSS surface entirely rather than sanitising it, and
  published prose is rendered by a React walker through the site's own type scale.
- **The editor is the preview**, structurally: `.prose-signal` in `globals.css` is one stylesheet
  read by both the Tiptap editor and the published page, because a contenteditable cannot use a
  React component map and two stylesheets would drift.
- **Publishing gates on completeness** — title, description and a non-empty body — but **saving
  asks for nothing.** A draft is allowed to be unfinished; the first version demanded a description
  before the first sentence was written, which put the requirement on the wrong verb.
- **Publishing invalidates the public cache** by calling the web app's `/api/revalidate`
  (`blog-revalidate.ts`), so a post appears without a redeploy. Unconfigured is a supported state:
  the call is skipped and the blog picks the change up on its five-minute cycle.
- Seeded with five SEO posts (`apps/api/scripts/seed-blog.ts`), idempotent by slug.

## P6.4 — Public site & SEO

- **Legal pages** — privacy, terms, cookie policy — checked against what actually ships rather than
  copy-edited. **The Terms claimed GrowthOS could adjust campaigns and execute actions
  automatically, in three places.** Every OAuth scope requested is read-only and the only automation
  adapters are the content queue and a dry run, so the Terms granted a capability that does not
  exist and that the security page explicitly denies. Corrected. The privacy policy said nothing
  about platform staff opening a workspace — the access a customer would most want disclosed, and
  the one the audit log already records; now stated, with the sub-processors named and the actual
  security measures in place of "industry-standard measures".
  **Unfilled placeholders (entity, jurisdiction, contact addresses, effective date) are gathered in
  `apps/web/lib/legal.tsx` and render as visible gold gaps. They must be filled before launch.**
- **Per-page SEO** — `apps/web/lib/seo.ts`. Canonical URLs existed on exactly one route before this;
  every other page let a tracking parameter mint a competing copy of itself. Also found and fixed:
  declaring `openGraph` on a page replaces the root layout's wholesale, image included, so every
  page below the homepage was shipping `summary_large_image` with no image in it.
- **The favicon and share card were still the pre-rebrand blue** (`#1e40af`), unrelated to the
  navbar's mark — they had survived an entire rebrand because nothing pointed at them.
  `lib/brand-mark.ts` is now the single source for the surfaces a stylesheet cannot reach.
- **Cookie consent that actually gates the SDK.** `Providers` called `initAnalytics()` on mount, so
  PostHog set its cookies before anyone was asked anything. `startAnalytics()` is now reachable only
  through the consent layer; the banner is not modal, Decline is one click of equal size, and no
  banner appears without an analytics key because then there is no optional cookie to consent to.
  8 unit tests (`lib/consent.test.ts`) cover the branches a browser makes hard to see — a corrupted
  value and blocked storage both read as unanswered, so analytics stays off.
- **Loading and error states.** Four auth pages fell back to `null` through their Suspense boundary,
  so the whole screen was blank until the chunk arrived. A failure in any dashboard route escaped to
  the root boundary, which is full-screen, so a broken chart took the sidebar and the navigation
  with it. `global-error.tsx` did not exist, leaving a root-layout failure on Next's unstyled page.
- **Form rejections went only to a toast** — dismissed on a timer, at the top of the viewport,
  nowhere near the field, and unreachable afterwards. Now stated inline with `role="alert"`.

## Log

- 2026-08-27 → 2026-09-04 — all four phases built. See `git log` between `dd44599` and `c565cbd`.
- 2026-09-04 — milestone opened retrospectively; `README.md` updated to document the console and the
  public site, neither of which it mentioned.
