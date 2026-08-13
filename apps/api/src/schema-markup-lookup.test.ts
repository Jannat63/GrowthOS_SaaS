import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { generateSchemaMarkup } from './schema-markup-lookup.js'

// Integration: requires Neon (dev stack up) — same as billing.test.ts.
describe('generateSchemaMarkup (DB-backed lookup)', () => {
  const ws = 'test-schema-markup-ws'

  afterAll(async () => {
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws))
  })

  it('pulls the workspace name/website/category into the generated markup', async () => {
    await db
      .insert(schema.workspaces)
      .values({
        id: ws,
        name: 'Acme Furniture',
        slug: ws,
        createdAt: new Date(),
        websiteUrl: 'https://acme.example',
        businessCategory: 'Home & Office Furniture',
      })
      .onConflictDoNothing()

    const result = await generateSchemaMarkup(ws, '/products/desk-lamp')
    expect(result.detectedType).toBe('Product')
    expect(result.jsonLd.url).toBe('https://acme.example/products/desk-lamp')
    expect(result.jsonLd.brand).toEqual({ '@type': 'Brand', name: 'Acme Furniture' })
  })

  it('falls back to sensible defaults for an unknown workspace rather than throwing', async () => {
    const result = await generateSchemaMarkup('no-such-workspace', '/about')
    expect(result.detectedType).toBe('WebPage')
    expect(result.jsonLd.url).toBe('/about') // no website on file — falls back to the bare path
  })
})
