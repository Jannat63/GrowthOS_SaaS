# Blog CMS — design

**Date:** 2026-09-03
**Status:** approved, building
**Surfaces:** `packages/db`, `packages/types`, `apps/api`, `apps/web` (admin console + marketing)

## The problem

Blog posts are MDX files in `apps/web/content/blog/`, read with `fs` at build time by `lib/blog.ts`,
rendered by `next-mdx-remote/rsc` through the hand-written component map in
`components/marketing/MdxContent.tsx`, and enumerated again by `app/sitemap.ts`. Publishing means a
commit and a deploy.

The blog must become something the Super Admin console posts and manages. That makes the database the
source of truth, and all four of those files change.

## Decisions

### D-B1 — The body is a document, not HTML

The editor is **Tiptap 3** (headless ProseMirror, React 19). The post body is stored as a
**ProseMirror JSON document** in a `jsonb` column, never as an HTML string.

*Rejected: storing HTML.* Rendering it on the public site requires `dangerouslySetInnerHTML` — a
permanent stored-XSS surface on the highest-traffic public page — and it lets post styling escape the
design system, because the prose carries whatever markup the editor emitted instead of the
token-based type scale the marketing site already uses.

Instead a React walker (`components/marketing/PostBody.tsx`) renders the JSON into **exactly the
elements `MdxContent` emits today** — the same `mt-12 scroll-mt-24 font-display text-2xl` h2, the
same `leading-[1.75] text-muted-foreground` paragraph. Three consequences, all of them the point:

1. No `dangerouslySetInnerHTML` anywhere in the app.
2. Published prose is on-brand by construction, not by an author's discipline.
3. **The toolbar is derived from the renderer's capability.** Tiptap's schema is configured to
   exactly the node set the renderer can display: `h2`, `h3`, `paragraph`, `bulletList`,
   `orderedList`, `listItem`, `bold`, `italic`, `link`, `blockquote`, `code`, `codeBlock`,
   `horizontalRule`, `image`. No `h1` — the post title is the h1. No tables, no colours, no font
   sizes. A button for something the public page cannot render is a lie.

`MdxContent.tsx` and its two dependencies (`gray-matter`, `next-mdx-remote`) are removed once the
three existing posts are migrated.

### D-B2 — Public pages stay statically rendered; SEO improves

Two **public, unauthenticated** endpoints — `GET /api/v1/blog` and `GET /api/v1/blog/:slug` — return
only rows where `published_at IS NOT NULL AND published_at <= now()`.

`lib/blog.ts` keeps its three-function shape and swaps its reader for `fetch` with
`next: { revalidate: 300 }`. `generateStaticParams` fetches the slug list at build;
`dynamicParams` stays on, so a post published after a deploy renders on first request.

**On-demand revalidation:** publishing or unpublishing from the console calls
`POST /api/revalidate` on `apps/web` with a shared secret (`REVALIDATE_SECRET`), which runs
`revalidatePath('/blog')` and `revalidatePath('/blog/[slug]', 'page')`. Publishing is therefore
immediate. Without it an operator who publishes and sees nothing publishes again.

**SEO must not regress** (explicit user constraint). Pages remain statically rendered, so crawlers
get full HTML exactly as today. The move additionally gains:

- JSON-LD `Article` structured data (headline, description, image, datePublished, dateModified,
  author) on the post page.
- `article:published_time` / `article:modified_time` OpenGraph tags.
- A real per-post OG image — the cover — instead of the site-wide default.
- `sitemap.ts` emitting true `lastModified` from `updated_at` rather than the frontmatter date.

**Failure mode:** if the API is unreachable at build or revalidate time, `lib/blog.ts` returns an
empty list and the index renders its existing "No posts yet" state; a post fetch returns `null` and
the route 404s. The marketing site must never 500 because the API blinked.

### D-B3 — Images are addresses; upload is designed but disabled

There is no blob storage in this repo. The established precedent is workspace branding, where
`logoUrl` is a plain URL field.

The cover image and inline images store a **URL string**. The field accepts both an absolute
`https://…` URL and a **site-relative `/blog/…` path**, so an image committed to
`apps/web/public/blog/` works with no vendor, no signup and no cost. A live thumbnail renders either
way, so there is no guessing whether the address resolved.

The upload affordance is **built and visibly disabled**, labelled *Coming soon*, next to the URL
field. Whatever ships later (Cloudflare R2 is the cheap option: 10 GB, free egress, but it wants a
card on file) produces a URL and writes to the same column — **no schema change, no re-migration**.

### D-B4 — Audited, but no step-up

Every other console write demands a reason plus a password (`requireStepUp`) and emails all super
admins (`alertSuperAdmins`). That is correct for changing a customer's billing state: invisible to
them, effectively irreversible.

A blog post is the opposite — visible to the entire internet the moment it ships, and reversible in
one click. Demanding a password on every save would have an operator typing it repeatedly during a
writing session, which trains exactly the reflex that makes step-up worthless where it matters.

Therefore:

- `super_admin` for all writes; `support_agent` may read the list and open a post.
- Every write is audit-logged: `blog.create`, `blog.update`, `blog.publish`, `blog.unpublish`,
  `blog.feature`, `blog.delete`. Reads are logged as `blog.list` / `blog.view` and collapse under
  the existing repeat window.
- No `requireStepUp`, no `alertSuperAdmins`.
- **A published post cannot be deleted, only unpublished.** Breaking a live URL becomes a deliberate
  two-step act without needing a password. Delete is available on drafts.

`AdminTargetType` gains `'blog_post'`.

### D-B5 — One timestamp carries all three publish states

`published_at` is nullable: **null = draft, future = scheduled, past = live**. The public query is
`published_at <= now()`, so scheduling costs nothing — no cron, no worker job, no status enum that
can disagree with the timestamp.

`featured` is guarded by a **partial unique index** (`... (featured) WHERE featured`), so the
database enforces "at most one pinned post" rather than the UI hoping.

## Data model

`blog_posts` (`packages/db/src/schema/blog.ts`):

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `slug` | text unique not null | the public URL segment |
| `title` | text not null | rendered as the page h1 |
| `description` | text not null | the dek, and the meta description |
| `body` | jsonb not null | ProseMirror document |
| `plain_text` | text not null | projection of `body`, written on save |
| `word_count` | integer not null | derived on save; reading time = ceil(words / 220) |
| `tag` | text not null | single tag, as today |
| `cover_image_url` | text | absolute URL or `/blog/…` path |
| `cover_image_alt` | text | |
| `author_name` | text not null | defaults to the writing admin's name |
| `author_role` | text | |
| `author_avatar_url` | text | |
| `featured` | boolean not null default false | partial unique index |
| `published_at` | timestamptz | null = draft, future = scheduled, past = live |
| `created_by_user_id` | text | **no FK** — same rule as `admin_audit_log`: authorship outlives the account |
| `created_at` / `updated_at` | timestamptz | |

Indexes: unique `slug`; `(published_at desc)`; partial unique on `featured`.

`plain_text` and `word_count` are computed on write so the list endpoint never walks a document.

## API surface

Public (no auth, rate-limited by the existing global limiter):

- `GET /api/v1/blog` → `{ data: BlogPostSummary[], total }`, published only, newest first,
  featured first.
- `GET /api/v1/blog/:slug` → `BlogPost`, published only, else 404.

Admin (`requirePlatformRole`):

- `GET /api/v1/admin/blog` — all posts including drafts; `filter` = `draft|scheduled|published`,
  `sort` = `updated|published|title`; paginated by `parsePage`.
- `GET /api/v1/admin/blog/:id`
- `POST /api/v1/admin/blog` — create (super_admin)
- `PATCH /api/v1/admin/blog/:id` — update (super_admin)
- `POST /api/v1/admin/blog/:id/publish` — body `{ publishedAt?: ISO }`; absent = now (super_admin)
- `POST /api/v1/admin/blog/:id/unpublish` (super_admin)
- `POST /api/v1/admin/blog/:id/feature` — body `{ featured: boolean }` (super_admin)
- `DELETE /api/v1/admin/blog/:id` — **refuses if published** (super_admin)

Queries live in `apps/api/src/blog.ts`; routes split into `apps/api/src/routes/blog.ts` (public) and
a section of `apps/api/src/routes/admin.ts` (console), matching how the rest of the app is laid out.

## Frontend design (console)

**The list** is a normal console directory — same furniture as Workspaces and People, because
consistency is worth more here than novelty. State edge (`border-l-2`, the console's existing
scannable status spine): muted = draft, `--warning` gold = scheduled (the console's established "not
the normal state"), `--success` green = published. A pinned post carries an ember pin.

**The editor is the one screen in this console that is deliberately not dense.** Everything else here
is a table to be scanned; this is a page to be written, and it is built the other way round:

```
┌──────────────────────────────────────────────┬──────────────┐
│ ← Posts    Zero-click search…   ● Draft  Save│   (sticky)   │
├──────────────────────────────────────────────┼──────────────┤
│                                              │ VISIBILITY   │
│   Title — Archivo, published size            │  Draft       │
│   ────────────────────────────────           │  Publish on… │
│   The dek, published size                    │              │
│                                              │ ADDRESS      │
│   Body at the published measure (~68ch),     │ /blog/zero-… │
│   published type, published leading.         │              │
│   Select text → the toolbar appears.         │ COVER · TAG  │
│                                              │ AUTHOR       │
│                                              │ ─────────    │
│                                              │ 1,240 words  │
│                                              │ 6 min read   │
└──────────────────────────────────────────────┴──────────────┘
```

- **The editor is the preview.** Same fonts, same measure, same leading as `/blog/[slug]`. There is
  no preview tab, because a preview tab is an admission that the editor lies about what ships.
- Metadata sits in the right column so the writer faces prose, not a form.
- The toolbar is a Tiptap `BubbleMenu` on selection plus a small fixed row for block types, so the
  writing column stays clean.
- Word count and reading time show the exact figure the public page will print — the same
  `ceil(words / 220)` the API stored.
- The slug derives from the title until it is touched. Changing a **published** post's slug warns
  that live links will break.

## Public page changes

- Index: cover thumbnails, byline, and the featured post leading the list.
- Post: cover hero, byline, JSON-LD, OG article tags.
- Both keep the existing type scale and layout — this is the same design, fed differently.

## Migration

A one-off script (`apps/api/scripts/migrate-blog-mdx.ts`) parses the three `.mdx` files into
ProseMirror JSON and inserts them, preserving slug, title, description, date and tag. Then
`apps/web/content/blog/`, `lib/blog.ts`'s `fs` reader, `MdxContent.tsx`, `gray-matter` and
`next-mdx-remote` are removed.

Two sources of truth for the same posts would drift — the exact failure CLAUDE.md documents for
seeded demo figures.

## Build order

1. `packages/db` — `blog.ts` schema + generated migration
2. `packages/types` — `BlogPost`, `BlogPostSummary`, `BlogPostInput`, filters/sorts
3. `apps/api` — `blog.ts` queries, public routes, admin routes, `blog_post` audit target
4. `apps/api/scripts/migrate-blog-mdx.ts` — one-off import of the three posts
5. `apps/web` — Tiptap editor, `PostBody` renderer, admin list + editor pages, rail entry
6. `apps/web` — rewire `lib/blog.ts`, `sitemap.ts`, both blog pages; JSON-LD, cover, byline, featured
7. Remove the MDX files, `MdxContent.tsx`, and the two dependencies

## Risks

- **Installing Tiptap.** `pnpm add` broke the running dev server twice this session (once pruning
  `@better-auth/core`, once duplicating it). Stop the dev server, install, then `pnpm dedupe`.
- **The marketing blog gains a runtime dependency on the API.** Mitigated by ISR plus the
  empty-list fallback in D-B2, but it is a real change from "static files that cannot fail".
- **`apps/web` needs `REVALIDATE_SECRET` and the API needs the web origin** for on-demand
  revalidation. Absent either, publishing still lands within the 300s ISR window rather than failing.
