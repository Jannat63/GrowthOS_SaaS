# P1.6 — Progress

Status: [x]  ·  Updated: 2026-08-27

Depends on P1.5 (shadcn foundation) + brand/copy from the user. Built shadcn-first.

## P1.6a — Landing page (placeholder brand)

Delivered via Frontend Rebuild Slice 1. This file previously still read `Status: [ ]` with every row
unticked while the milestone rollup and master `PROGRESS.md` both said `[x]` — the phase file was
stale, not the rollups. Corrected below.

| Item | Status | Notes |
|------|--------|-------|
| `app/(marketing)` route group + layout (public nav + footer) | [x] | |
| Landing page at `/` (remove `/welcome` redirect) | [x] | Hero + primary CTA. |
| Feature sections (SEO / Google Ads / Meta + unified loop) | [x] | Bento grid + loop diagram. |
| How-it-works + pricing teaser + social proof | [x] | Pricing bound to `PLAN_LIMITS`. |
| CTAs → `/sign-up` and `/sign-in` | [x] | `/welcome` stays as post-auth onboarding. |
| Placeholder brand tokens in `globals.css` | [x] | Indigo/green/ink — **swapped in P1.6b**. |

## P1.6b — "Signal" rebrand + landing rebuild

Design spec: `docs/superpowers/specs/2026-08-27-rebrand-landing-design.md`.

Reopened because P1.6a shipped against an explicit placeholder (`plan.md:9-10` — *"Copy + brand are
placeholders now; the user swaps in real headlines, colors, and logo later"*). This is that swap,
plus the page rebuild the placeholder copy implied.

| Item | Status | Notes |
|------|--------|-------|
| "Signal" token set in `globals.css` | [x] | Ember `#ce4218`/`#ff6b41` on graphite ink. `--warning` → gold and `--destructive` → rose to clear the warm primary. |
| Channel identity tokens | [x] | `--channel-seo/google/meta`. Retired indigo becomes Meta's hue. |
| Elevation tokens | [x] | `--elev-1..5` per theme → `--shadow-*`. None existed before; 26 usages were on Tailwind stock. |
| Type system | [x] | Archivo (display) + Inter (body) + JetBrains Mono (data). `--font-mono` had no token before. |
| White-label sync points | [x] | `BrandingProvider` now sets `--ring` with `--primary`; `BrandingSection` default retoned; sonner `richColors` dropped; `button.tsx` rim made theme-aware; `dialog.tsx` scrim tokenised. |
| Unified `LogoMark` | [x] | Was duplicated markup in 6 files. Now `components/brand/LogoMark.tsx`. |
| Exchange signature | [x] | `ExchangeBoard.tsx` — 3 stations, 6 computed directed arcs, travelling packet, reduced-motion static fallback. Replaces `LoopDiagram`. |
| Landing rebuild | [x] | New: TheProblem, SixBridges, ProductSurfaces, WhoItsFor, FAQ. Deleted: StatStrip, SocialProof, Features, LoopDiagram. |
| Product actually shown | [x] | `ProductSurfaces.tsx` — 4 token-built panels, all labelled `SAMPLE`. |
| Honesty pass | [x] | GEO tracking pulled from landing **and** `/pricing`; placeholder testimonial + unsourced stats deleted; trial copy contradiction resolved. |
| Blog (MDX, greenfield) | [x] | `gray-matter` + `next-mdx-remote`, `content/blog/*.mdx`, 3 seed posts. |
| New routes | [x] | `/faq`, `/about`, `/security`, `not-found`, `sitemap.ts`, `robots.ts`. Careers dropped rather than faked. |
| Dead links cleared | [x] | Zero `href="#"` remain in the footer/nav. |
| Dashboard regression check | [x] | Both themes; Recharts `var(--color-*)` series correct; focus ring = ember. |

## Log

- 2026-07-05 — Added to M1 as a new frontend phase. User wants a full public marketing homepage,
  built shadcn-first (P1.5 prereq), with placeholder copy/brand to be replaced later.
- 2026-08-27 — **P1.6b.** Audit of the shipped page found the product was never shown, the palette was
  still the `/legacy` placeholder, band rhythm and alignment were arbitrary, a literal
  `Placeholder Name · Head of Growth, Placeholder Co.` testimonial was live, and four footer links
  were `href="#"`. Rebranded to "Signal" (ember on graphite), rebuilt the page around the six bridges
  as the signature, added the missing marketing routes, and pulled GEO / AI-citation tracking from
  every marketing surface since P4.4b is deferred. Build + typecheck clean; 23 web / 218 logic tests
  pass. `pnpm lint` fails for an unrelated pre-existing reason (no ESLint config in the repo).
