import type { SchemaMarkupResponse, SchemaMarkupType } from '@growthos/types'

/**
 * Schema markup generator (SEO extras). Unlike the blueprint's DataForSEO-gated tools, this needs
 * no external API — it works off the page URL's own structure plus the workspace's business info
 * (name, website, category) already collected during onboarding. The output is a JSON-LD starter
 * template, not a finished document: fields the tool can't infer (price, publish date, image URL,
 * ...) are left as `[SET_...]` placeholders, same pattern most schema-generator tools use — you
 * fill in what only you know, the tool handles the boilerplate and gets the @type right.
 *
 * Deliberately has NO @growthos/db import — packages/db throws at import time if DATABASE_URL
 * isn't set, which would make this pure template logic untestable without Postgres. The DB-backed
 * lookup (workspace name/website/category) lives in schema-markup-lookup.ts instead.
 */

const ALL_TYPES: SchemaMarkupType[] = [
  'WebPage',
  'Article',
  'Product',
  'CollectionPage',
  'FAQPage',
  'Organization',
]

const TYPE_HINTS: Array<{ prefix: RegExp; type: SchemaMarkupType }> = [
  { prefix: /^\/(blog|news|articles?|guides?)\//i, type: 'Article' },
  { prefix: /^\/(products?)\//i, type: 'Product' },
  { prefix: /^\/(collections?|category|categories)\//i, type: 'CollectionPage' },
  { prefix: /faq/i, type: 'FAQPage' },
]

function detectType(pageUrl: string): SchemaMarkupType {
  for (const hint of TYPE_HINTS) {
    if (hint.prefix.test(pageUrl)) return hint.type
  }
  return 'WebPage'
}

/** "/blog/best-office-chair-for-back-pain" → "Best Office Chair For Back Pain" */
function titleFromSlug(pageUrl: string): string {
  const last = pageUrl.split('/').filter(Boolean).pop() ?? ''
  const words = last
    .replace(/\.\w+$/, '')
    .split(/[-_]+/)
    .filter(Boolean)
  if (words.length === 0) return 'Untitled Page'
  return words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ')
}

export interface BusinessInfo {
  name: string
  websiteUrl: string | null
  businessCategory: string | null
}

/** Pure — no I/O. The actual template-building logic, kept separate from the DB lookup so it's testable without Postgres. */
export function buildSchemaMarkup(
  pageUrl: string,
  business: BusinessInfo,
  typeOverride?: SchemaMarkupType,
): SchemaMarkupResponse {
  const type = typeOverride ?? detectType(pageUrl)
  const name = titleFromSlug(pageUrl)
  const origin = (business.websiteUrl ?? '').replace(/\/$/, '')
  const fullUrl = origin ? `${origin}${pageUrl}` : pageUrl
  const placeholders: string[] = []
  const organizationRef = {
    '@type': 'Organization',
    name: business.name,
    ...(origin ? { url: origin } : {}),
  }

  let jsonLd: Record<string, unknown>

  switch (type) {
    case 'Article': {
      placeholders.push('datePublished', 'dateModified', 'image')
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: name,
        url: fullUrl,
        author: organizationRef,
        publisher: organizationRef,
        datePublished: '[SET_DATE_PUBLISHED — e.g. 2026-01-15]',
        dateModified: '[SET_DATE_MODIFIED]',
        image: '[SET_IMAGE_URL]',
      }
      break
    }
    case 'Product': {
      placeholders.push('description', 'image', 'price', 'priceCurrency')
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        url: fullUrl,
        description: '[SET_DESCRIPTION]',
        image: '[SET_IMAGE_URL]',
        brand: { '@type': 'Brand', name: business.name },
        offers: {
          '@type': 'Offer',
          url: fullUrl,
          priceCurrency: '[SET_CURRENCY — e.g. USD]',
          price: '[SET_PRICE]',
          availability: 'https://schema.org/InStock',
        },
      }
      break
    }
    case 'CollectionPage': {
      placeholders.push('description')
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        url: fullUrl,
        description: '[SET_DESCRIPTION]',
      }
      break
    }
    case 'FAQPage': {
      placeholders.push('mainEntity')
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: '[SET_QUESTION_1]',
            acceptedAnswer: { '@type': 'Answer', text: '[SET_ANSWER_1]' },
          },
        ],
      }
      break
    }
    case 'Organization': {
      placeholders.push('logo', 'sameAs')
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: business.name,
        url: origin || fullUrl,
        logo: '[SET_LOGO_URL]',
        description: business.businessCategory
          ? `${business.name} — ${business.businessCategory}`
          : '[SET_DESCRIPTION]',
        sameAs: ['[SET_SOCIAL_PROFILE_URL]'],
      }
      if (!business.businessCategory) placeholders.push('description')
      break
    }
    default: {
      placeholders.push('description')
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name,
        url: fullUrl,
        description: '[SET_DESCRIPTION]',
      }
    }
  }

  return { pageUrl, detectedType: type, availableTypes: ALL_TYPES, jsonLd, placeholders }
}
