// Channel slugs (`google_ads`, `meta_ads`, …) are the storage and API form. Anything a person
// reads — report prose, the PDF, dashboard tables — goes through `channelLabel()` so the raw slug
// never reaches the screen. It lives here rather than in the web app because the leak that prompted
// it was in generated prose (`intelligence.ts`), which the API renders into a PDF as well.
//
// One map on purpose: this was previously copy-pasted into each page that rendered a channel and
// the copies had already drifted ("Organic" vs. "Organic Search").
export const CHANNEL_LABELS: Record<string, string> = {
  seo: 'SEO',
  organic: 'Organic Search',
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  google_search_console: 'Search Console',
  email: 'Email',
  direct: 'Direct',
  referral: 'Referral',
}

// An unmapped slug still has to render as something readable, and Title Case alone would turn
// `seo_content` into "Seo Content" — so the acronyms this product uses are spelled out.
const ACRONYMS: Record<string, string> = {
  seo: 'SEO',
  roas: 'ROAS',
  ctr: 'CTR',
  cpa: 'CPA',
  cpc: 'CPC',
  mer: 'MER',
  ppc: 'PPC',
  gsc: 'GSC',
}

/** Human-readable name for a channel slug. Unknown slugs fall back to Title Case. */
export function channelLabel(slug: string): string {
  if (!slug) return slug
  const known = CHANNEL_LABELS[slug]
  if (known) return known
  return slug
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
