/**
 * The GrowthOS mark, as data rather than as markup.
 *
 * `components/brand/LogoMark.tsx` is the mark for the app, where CSS variables resolve and the
 * ember follows the theme. Generated images (`opengraph-image`, `apple-icon`) are rendered by
 * Satori outside any document: there is no stylesheet, no `var(--primary)`, and no component
 * tree to inherit from. They get the same geometry with the ember written out.
 *
 * Kept here rather than inlined at each call site so the three surfaces cannot drift apart the way
 * the pre-rebrand blue square did — it stayed on `#1e40af` through an entire rebrand because
 * nothing pointed at it.
 */

/** Light-theme `--primary`. The mark's fixed colour wherever a theme cannot reach it. */
export const BRAND_EMBER = "#ce4218";
/** `--ink`: the cold graphite the brand's dark surfaces are built on. */
export const BRAND_INK = "#0b0f14";
/** The dark theme's ember. On an ink ground the light value is too dense to read as a
 *  highlight, which is the same reason globals.css lifts it in `.dark`. */
export const BRAND_EMBER_ON_INK = "#ff6b41";

const GLYPH = `
  <path d="M16 9 L23 21 L9 21 Z" fill="none" stroke="#ffffff" stroke-opacity="0.5"
        stroke-width="1.75" stroke-linejoin="round"/>
  <circle cx="16" cy="9" r="3" fill="#ffffff"/>
  <circle cx="23" cy="21" r="3" fill="#ffffff"/>
  <circle cx="9" cy="21" r="3" fill="#ffffff"/>`;

function dataUri(inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${inner}</svg>`;
  // Satori loads an <img> by URL, and a raw `#` in a data URI is read as a fragment — which is why
  // the whole document is percent-encoded rather than merely wrapped.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The circuit alone, white and transparent-backed, for placing on a field of your own. */
export const MARK_DATA_URI = dataUri(GLYPH);

/** The full tile: the circuit on ember, corners rounded as the app draws it. */
export const MARK_TILE_DATA_URI = dataUri(
  `<rect width="32" height="32" rx="9" fill="${BRAND_EMBER}"/>${GLYPH}`
);
