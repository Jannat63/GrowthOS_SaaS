import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { SchemaMarkupResponse, SchemaMarkupType } from '@growthos/types'
import { buildSchemaMarkup, type BusinessInfo } from './schema-markup.js'

/** Looks up the workspace's business info, then builds the schema markup (see schema-markup.ts). */
export async function generateSchemaMarkup(
  workspaceId: string,
  pageUrl: string,
  typeOverride?: SchemaMarkupType,
): Promise<SchemaMarkupResponse> {
  const [row] = await db
    .select({
      name: schema.workspaces.name,
      websiteUrl: schema.workspaces.websiteUrl,
      businessCategory: schema.workspaces.businessCategory,
    })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1)

  const business: BusinessInfo = {
    name: row?.name ?? 'Your Business',
    websiteUrl: row?.websiteUrl ?? null,
    businessCategory: row?.businessCategory ?? null,
  }
  return buildSchemaMarkup(pageUrl, business, typeOverride)
}
