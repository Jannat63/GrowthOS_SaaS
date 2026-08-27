# P1.6 — Landing page (public marketing homepage)

Milestone: M1 · Depends on: P1.5 (shadcn) · Prerequisites: shadcn foundation · brand/copy from user

## Goal

Replace the bare `/` → `/welcome` redirect with a real **public marketing homepage** — hero, per-
channel feature sections (SEO / Google Ads / Meta Ads), how-it-works, pricing teaser, social proof,
footer — with CTAs into sign-up / sign-in. Built **shadcn-first** (D6). Copy + brand are placeholders
now; the user swaps in real headlines, colors, and logo later.

## Subphases

### P1.6a — landing page (placeholder brand) — complete

- [x] New public route group `app/(marketing)` with its own `layout.tsx` (public top nav + footer).
- [x] Landing page at `/` (replace the redirect): hero (headline, subhead, primary CTA → sign-up).
- [x] Feature sections — the three channels (SEO, Google Ads, Meta Ads) + the unified insight loop.
- [x] How-it-works + pricing teaser + social-proof sections.
- [x] Public nav (logo, section links, "Sign in" / "Get started") + footer.
- [x] Wire CTAs to `/sign-up` and `/sign-in`; keep `/welcome` for the post-auth onboarding entry.
- [x] Placeholder brand tokens (logo, colors) in `globals.css` — clearly marked for the user to swap.

### P1.6b — "Signal" rebrand + landing rebuild (2026-08-27) — complete

Spec: `docs/superpowers/specs/2026-08-27-rebrand-landing-design.md`. Reopened to make good on the
placeholder above; see `progress.md` for the itemised state.

- [x] Swap the placeholder brand for the real one — "Signal": ember on cold graphite, with channel,
      elevation, and mono tokens added. `--warning`/`--destructive` re-tuned to clear the warm primary.
- [x] Real type system — Archivo (display) + Inter (body) + JetBrains Mono (data).
- [x] Signature — the Exchange: three stations, six directed bridges, replacing the orbital ring.
- [x] Show the product — four token-built UI panels, labelled `SAMPLE`.
- [x] Honesty pass — GEO tracking pulled from all marketing surfaces (P4.4b deferred); placeholder
      testimonial and unsourced stats deleted; trial-eligibility contradiction resolved.
- [x] Missing surfaces — blog (MDX, 3 seed posts), `/faq`, `/about`, `/security`, 404, sitemap, robots.
- [x] Every footer/nav link resolves — zero `href="#"`.

## Reuse

- shadcn primitives from P1.5 / `packages/ui` (button, card, etc.) → as-is.
- `apps/web/styles/globals.css` theme tokens → extend (no hardcoded hex in components — CLAUDE.md).
- Product positioning from `docs/blueprint/PRD.md` → source for placeholder copy.

## Surface

- `apps/web/app/(marketing)/layout.tsx` + `page.tsx` — public shell + landing page.
- `apps/web/components/marketing/*` — hero, feature, pricing, footer sections (shadcn compositions).
- `apps/web/app/page.tsx` — remove the `/welcome` redirect (root now renders the landing page).

## Verification

- Visiting `/` renders the full marketing page (not a redirect); CTAs land on `/sign-up` / `/sign-in`.
- Responsive (mobile + desktop); light/dark via shadcn tokens; `pnpm --filter @growthos/web build` green.
