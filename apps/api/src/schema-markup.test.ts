import { describe, expect, it } from 'vitest'
import { buildSchemaMarkup, type BusinessInfo } from './schema-markup.js'

const business: BusinessInfo = {
  name: 'Acme Furniture',
  websiteUrl: 'https://acme.example',
  businessCategory: 'Home & Office Furniture',
}

describe('buildSchemaMarkup', () => {
  describe('type detection', () => {
    it('detects Article for /blog/ pages', () => {
      const r = buildSchemaMarkup('/blog/best-office-chair', business)
      expect(r.detectedType).toBe('Article')
      expect(r.jsonLd['@type']).toBe('BlogPosting')
    })

    it('detects Product for /products/ pages', () => {
      const r = buildSchemaMarkup('/products/ergonomic-desk', business)
      expect(r.detectedType).toBe('Product')
      expect(r.jsonLd['@type']).toBe('Product')
    })

    it('detects CollectionPage for /collections/ pages', () => {
      const r = buildSchemaMarkup('/collections/keyboards', business)
      expect(r.detectedType).toBe('CollectionPage')
    })

    it('detects FAQPage when "faq" appears in the path', () => {
      const r = buildSchemaMarkup('/support/faq', business)
      expect(r.detectedType).toBe('FAQPage')
    })

    it('falls back to WebPage for anything unrecognized', () => {
      const r = buildSchemaMarkup('/about-us', business)
      expect(r.detectedType).toBe('WebPage')
    })

    it('lets an explicit type override the detected one', () => {
      const r = buildSchemaMarkup('/blog/best-office-chair', business, 'Organization')
      expect(r.detectedType).toBe('Organization')
      expect(r.jsonLd['@type']).toBe('Organization')
    })
  })

  describe('content generation', () => {
    it('title-cases the URL slug for the name/headline', () => {
      const r = buildSchemaMarkup('/blog/best-office-chair-for-back-pain', business)
      expect(r.jsonLd.headline).toBe('Best Office Chair For Back Pain')
    })

    it('builds the full URL from the workspace website + page path', () => {
      const r = buildSchemaMarkup('/products/ergonomic-desk', business)
      expect(r.jsonLd.url).toBe('https://acme.example/products/ergonomic-desk')
    })

    it('falls back to the bare page path when no website URL is set', () => {
      const r = buildSchemaMarkup('/products/ergonomic-desk', { ...business, websiteUrl: null })
      expect(r.jsonLd.url).toBe('/products/ergonomic-desk')
    })

    it('uses the workspace name as the Product brand', () => {
      const r = buildSchemaMarkup('/products/ergonomic-desk', business)
      expect(r.jsonLd.brand).toEqual({ '@type': 'Brand', name: 'Acme Furniture' })
    })

    it('folds businessCategory into the Organization description when present', () => {
      const r = buildSchemaMarkup('/', business, 'Organization')
      expect(r.jsonLd.description).toBe('Acme Furniture — Home & Office Furniture')
      expect(r.placeholders).not.toContain('description')
    })

    it('leaves a placeholder for Organization description when no category is set', () => {
      const r = buildSchemaMarkup('/', { ...business, businessCategory: null }, 'Organization')
      expect(r.jsonLd.description).toBe('[SET_DESCRIPTION]')
      expect(r.placeholders).toContain('description')
    })
  })

  describe('placeholders', () => {
    it('flags exactly the fields it could not infer, per type', () => {
      expect(buildSchemaMarkup('/blog/x', business).placeholders.sort()).toEqual(
        ['datePublished', 'dateModified', 'image'].sort(),
      )
      expect(buildSchemaMarkup('/products/x', business).placeholders.sort()).toEqual(
        ['description', 'image', 'price', 'priceCurrency'].sort(),
      )
      expect(buildSchemaMarkup('/about-us', business).placeholders).toEqual(['description'])
    })

    it('always lists all six schema types as available, regardless of what was detected', () => {
      const r = buildSchemaMarkup('/blog/x', business)
      expect(r.availableTypes).toEqual([
        'WebPage',
        'Article',
        'Product',
        'CollectionPage',
        'FAQPage',
        'Organization',
      ])
    })
  })
})
