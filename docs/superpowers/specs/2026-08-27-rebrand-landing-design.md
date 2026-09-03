# Rebrand ("Signal") + landing page redesign — design

**Date:** 2026-08-27
**Status:** implemented
**Slice:** P1.6b (reopens `docs/plan/M1-platform-spine/P1.6-landing-page/`)
**Supersedes:** the placeholder brand in `2026-07-05-frontend-rebuild-design.md` §2/§5 and the
"indigo/green/ink" identity in `2026-07-11-frontend-rebuild-slice-2-design.md`.

## Why

`P1.6-landing-page/plan.md:9-10` shipped the landing page with an explicit caveat — *"Copy + brand
are placeholders now; the user swaps in real headlines, colors, and logo later"* — and left the
subphase *"Placeholder brand tokens (logo, colors) in `globals.css` — clearly marked for the user to
swap"* unticked. This is that swap, plus the page rebuild the placeholder copy always implied.

The audit that triggered it found six concrete problems:

1. **The product was never shown.** Not one screenshot, UI fragment, or data view on the page. The
   main reason a visitor could not tell what GrowthOS *is*.
2. **Un-chosen palette.** Indigo `#4f46e5` was inherited from `/legacy` and labelled a placeholder.
3. **No band rhythm.** Five background values in arbitrary order; alignment flipped from left
   (Features, HowItWorks) to centre (PricingTeaser, CTASection) mid-page.
4. **Credibility holes.** `SocialProof.tsx` shipped the literal string `Placeholder Name · Head of
   Growth, Placeholder Co.`; `StatStrip.tsx` asserted `47` / `31%` / `2.4×` with no referent.
5. **Dead links.** About, Blog, Careers, Security were `href="#"` — they scrolled to top, which
   reads as broken rather than unbuilt. No FAQ anywhere.
6. **The thesis was buried.** The insight loop — the whole differentiator — was a small faint dashed
   circle in a corner.

## The brand: "Signal"

### Where the identity lives

`BrandingProvider.tsx:17-27` overrides `--primary` per workspace for white-labelling, via an inline
style that beats both `:root` and `.dark`. **The identity therefore cannot be hue-dependent.** It
lives in the ink surface family, the typography, and the Exchange signature — none of which a tenant
can repaint. `--primary` is the *action* colour; no layout may depend on its specific hue to stay
legible.

Consequence for future work: any new token that must move *with* the brand colour has to be added to
that `useEffect`, or it silently desyncs under white-labelling. `--ring` was exactly this bug and is
now set alongside `--primary`.

### Colour

Warm accent in a category that is uniformly blue and violet. The load-bearing reason, beyond
differentiation: it leaves green free to mean "up" in a chart instead of competing with the brand,
which matters for a data product.

| Token | Light | Dark |
|---|---|---|
| `--background` / `--foreground` | `#fafaf9` / `#0b0f14` | `#0b0f14` / `#f4f5f7` |
| `--card` | `#ffffff` | `#141b24` |
| `--primary` | `#ce4218` | `#ff6b41` |
| `--primary-foreground` | `#ffffff` | `#1a0a04` |
| `--success` | `#0e9f6e` | `#34d399` |
| `--warning` | `#a16207` | `#facc15` |
| `--destructive` | `#be123c` | `#fb7185` |
| `--border` / `--input` | `#e7e5e1` | `#222c38` |

**The semantic shifts are mandatory, not cosmetic.** A warm primary crowds the status hues, so
`--warning` was pushed firmly yellow (an orange amber next to ember reads as brand chrome, not
caution) and `--destructive` pushed to rose (ember already owns orange-red). This is the standing
cost of the warm accent — do not quietly revert either one.

`--primary` was deepened from the `#d8451f` display swatch to `#ce4218` to clear 4.5:1 on white; it
is used as `text-primary` for eyebrows, not only as a button fill.

**Ink** (the half white-labelling cannot touch): `--ink` `#0b0f14`, `--ink-2` `#141b24`, **`--ink-3`
`#1c242f` (new)**, `--ink-foreground` `#f4f5f7`, `--ink-muted` `#9aa6b4`, `--ink-border` `#232e3b`.
In dark mode ink goes *below* `--background` (`#05080b`) so night bands still separate from the page
they sit on.

**Channel tokens (new).** `--channel-seo` / `--channel-google` / `--channel-meta`, light values
text-safe on white (`#047857` / `#1d4ed8` / `#6d28d9`), lifted in dark (`#34d399` / `#60a5fa` /
`#a78bfa`). Structural, not decorative: the six bridges are the product, so a channel keeps one
colour everywhere it appears. The retired brand indigo lives on as Meta's hue — a real job rather
than a default.

**Elevation (new).** `--elev-1..5` defined per theme and mapped into `--shadow-*` through
`@theme inline`. Previously no shadow tokens existed and all 26 `shadow-*` usages silently used
Tailwind stock values. The indirection is required: a literal in `@theme` would bake the light
shadow into dark mode. Dark elevation carries a hairline rim, because a drop shadow alone reads as
nothing on a dark surface.

`--radius` tightened `0.75rem → 0.625rem`. `--radius-3xl` added (`rounded-3xl` in `CTASection` was
escaping the scale).

### Typography

Three roles, replacing a two-role system whose display face (Space Grotesk) is the most-defaulted
choice in this category.

- **Display — Archivo** (500/600/700). Wide, flat-sided, signage-like; suits a routing board. Swapped
  in behind the existing `--font-display` token, so all ~140 `font-display` usages inherited it with
  no per-file edits.
- **Body — Inter**, unchanged.
- **Data — JetBrains Mono (new).** `--font-mono` previously had no token at all and fell back to the
  stock stack. Load-bearing here: metric values, channel codes, eyebrows, and bridge notation.

### Signature — "The Exchange"

`LoopDiagram.tsx` (a vague orbital ring) was replaced by `ExchangeBoard.tsx`: three channel stations
and **six directed bridges** — a complete directed graph on three vertices, which is precisely what
`docs/blueprint/PRD.md` §1.3 defines and what P3.4's 19 rules implement. The drawing and the product
agree.

Arc geometry is computed, not hand-placed: each ordered pair bows along the right-hand perpendicular
so A→B and B→A occupy separate lanes, endpoints are pulled off the node discs by a clearance radius,
and arrowheads are derived from the quadratic Bézier's tangent at t=1. Node labels are SVG `<text>`
so they scale with the viewBox; only the icons are HTML overlay, well inside the clearance radius.

A signal packet travels one bridge at a time on a 3.2s cycle with a live readout beneath; hovering
holds the current bridge, and the six progress ticks are real tab controls. Under
`prefers-reduced-motion` the cycle stops and all six edges render lit — verified: 6 edges at 0.85
opacity, 0 animated packets.

**Numbering discipline.** The six bridges are deliberately unnumbered — they are a set, running
concurrently in both directions, so `01/02/03` would assert an order that does not exist.
`HowItWorks` *is* numbered, because connect → score → ship genuinely is a sequence.

## Landing page structure

Composition pattern kept: `app/(marketing)/page.tsx` remains a pure import-and-render file.

| Section | File | Band |
|---|---|---|
| Hero + Exchange | `Hero.tsx`, `ExchangeBoard.tsx` | background |
| The problem | `TheProblem.tsx` *(new)* | **ink** |
| Six bridges | `SixBridges.tsx` *(new)* | background |
| Product surfaces | `ProductSurfaces.tsx` *(new)* | muted |
| How it works | `HowItWorks.tsx` | background |
| Who it's for | `WhoItsFor.tsx` *(new)* | muted |
| Pricing | `PricingTeaser.tsx` | background |
| FAQ | `FAQ.tsx` *(new)* | background |
| Final CTA | `CTASection.tsx` | background + ink slab |

Bands now alternate on purpose. Pricing was deliberately left on plain background: `WhoItsFor`
directly above is already muted, and two adjacent bands of the same tone read as one long section.

**Deleted:** `StatStrip.tsx` (invented figures), `SocialProof.tsx` (placeholder testimonial),
`Features.tsx` (superseded by SixBridges + ProductSurfaces), `LoopDiagram.tsx` (superseded by
ExchangeBoard).

**`ProductSurfaces.tsx` is the fix for problem #1** — four hand-built panels (recommendation queue,
Blended MER, content pipeline, fatigue monitor) mirroring surfaces that have actually shipped. Built
from tokens rather than captured as screenshots: they re-tone with the theme for free, cannot drift
against a UI change, and carry no image weight. Every panel is labelled `SAMPLE`, matching the
`DataSourceBadge` convention for seeded data.

**Logo.** The mark was hand-rolled markup pasted into six files (SiteHeader, SiteFooter,
LoopDiagram, Sidebar ×2, AuthShell ×2, OnboardingShell), so the brand could drift in six places
independently. Now one `components/brand/LogoMark.tsx` — three stations and the circuit between
them — consumed everywhere. Sidebar keeps its white-label `logoUrl` override.

## Honesty constraints applied

These are product commitments, not copy preferences. Re-check them before changing marketing text.

- **GEO / AI-citation tracking removed from every marketing surface** (landing teaser *and*
  `/pricing`'s comparison table). `PLAN_LIMITS[p].geoTracking` is `true` on Growth/Scale and billing
  enforces it, but the feature is deferred on paid API access (M4 P4.4b). Both sites carry a comment
  pointing at P4.4b and an explicit instruction **not** to "fix" this by editing `PLAN_LIMITS`, which
  is the billing contract.
- **No AI image/video claims** (P4.2b deferred). **No "performance prediction"** — it is a
  *scorecard*, retrospective, graded against the workspace's own median. **No live ad-platform
  writes** (P4.3b blocked on Google developer token + Meta App Review); connections are read-only.
- **No claim that an LLM writes the copy.** Per D4 the Anthropic API is unused; generation is
  deterministic and template-driven. Positioning-level "AI-powered" is fine; mechanism claims are not.
- **Placeholder testimonial and unsourced stats deleted rather than replaced.** Pre-launch, honest
  absence beats fabricated proof.
- **Trial contradiction resolved.** The landing page promised a 14-day trial on all three tiers while
  `/pricing` said Growth only. Both now say the trial runs on Growth-tier features, matching the PRD.
- **`/security` states plainly that GrowthOS holds no SOC 2 / ISO 27001 certification.**

## New routes

- **Blog** — greenfield; no MDX infrastructure existed anywhere in the repo. `gray-matter` +
  `next-mdx-remote/rsc`, local MDX in `apps/web/content/blog/`, read by `lib/blog.ts`. Three seed
  posts from the blueprint's sourced research (zero-click search, creative fatigue, blended MER).
  Prose styling is a component map in `MdxContent.tsx` rather than `@tailwindcss/typography`, whose
  own colour scale would need overriding token by token to respect the theme.
- **`/faq`** — shares `faq-data.ts` with the landing section; landing shows the first six.
- **`/about`**, **`/security`** — real pages. **Careers dropped** rather than shipped empty.
- **`not-found.tsx`**, **`sitemap.ts`**, **`robots.ts`** — none existed. Robots disallows the
  authed product routes.
- Every footer and nav href now resolves; zero `href="#"` remain.

## Verification performed

- `pnpm --filter @growthos/web build` clean; `pnpm typecheck` clean across all 9 workspace tasks.
- Landing page + dashboard walked in **both themes** via Chrome DevTools MCP at 1440 and 375.
  Recharts series reading `var(--color-*)` re-tone correctly; `DataSourceBadge` gold stays clearly
  distinct from ember.
- Focus ring confirmed as ember `rgb(206,66,24)` with background-coloured offset under real keyboard
  `:focus-visible`.
- `prefers-reduced-motion` verified by stubbing `matchMedia` at document start.
- FAQ accordion: 10 items, opens on click, panel content renders.
- All routes return 200 (`/growth-hub` 307s to auth as designed); `/nonexistent` returns the new 404.
- 23 web tests, 218 logic tests passing.

**Known unrelated failure:** `pnpm lint` exits 1 because no ESLint config exists anywhere in the
repo, so `next lint` drops into its interactive setup prompt. Pre-existing; untouched here.
