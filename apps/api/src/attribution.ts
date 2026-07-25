import {
  attributeAll,
  ATTRIBUTION_MODELS,
  type AttributionModel,
  type ChannelCredit,
  type ConversionPath,
} from '@growthos/logic'
import { conversionPaths as seedPaths } from '@growthos/logic/fixtures'
import { getClickhouse } from './analytics.js'

export interface AttributionResponse {
  models: Record<AttributionModel, ChannelCredit[]>
  channels: string[]
}

// The attribution touchpoint table isn't in the base ClickHouse init (added in M4) — create it on
// demand so the feature works whenever ClickHouse is up, without a container reload.
async function ensureTable(): Promise<void> {
  await getClickhouse().command({
    query: `
      CREATE TABLE IF NOT EXISTS conversion_paths (
        workspace_id String,
        conversion_id String,
        touch_order UInt16,
        channel String,
        conversion_value Float64
      ) ENGINE = MergeTree()
      ORDER BY (workspace_id, conversion_id, touch_order)`,
  })
}

function seedRows(workspaceId: string): Record<string, unknown>[] {
  return seedPaths.flatMap((p) =>
    p.touchpoints.map((tp) => ({
      workspace_id: workspaceId,
      conversion_id: p.id,
      touch_order: tp.order,
      channel: tp.channel,
      conversion_value: p.conversionValue,
    })),
  )
}

async function ensureConversionPathsSeed(workspaceId: string): Promise<void> {
  await ensureTable()
  const rs = await getClickhouse().query({
    query: 'SELECT count() AS c FROM conversion_paths WHERE workspace_id = {ws:String}',
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { c: string }[]
  if (row && Number(row.c) > 0) return
  await getClickhouse().insert({
    table: 'conversion_paths',
    values: seedRows(workspaceId),
    format: 'JSONEachRow',
  })
}

/** Cross-channel attribution (M4 P4.1): every model's per-channel credit over the workspace's
 * conversion paths. Seeded until real multi-touch data flows from connected channels. */
export async function getAttribution(workspaceId: string): Promise<AttributionResponse> {
  await ensureConversionPathsSeed(workspaceId)
  const rs = await getClickhouse().query({
    query: `
      SELECT conversion_id AS id, toUInt16(touch_order) AS touchOrder, channel,
        toFloat64(conversion_value) AS conversionValue
      FROM conversion_paths
      WHERE workspace_id = {ws:String}
      ORDER BY conversion_id, touch_order`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const rows = (await rs.json()) as {
    id: string
    touchOrder: number
    channel: string
    conversionValue: number
  }[]

  // Reconstruct paths by grouping touchpoints on conversion_id.
  const byId = new Map<string, ConversionPath>()
  for (const r of rows) {
    const path = byId.get(r.id) ?? { id: r.id, conversionValue: Number(r.conversionValue), touchpoints: [] }
    path.touchpoints.push({ channel: r.channel, order: Number(r.touchOrder) })
    byId.set(r.id, path)
  }
  const paths = [...byId.values()]

  const models = attributeAll(paths)
  // Consistent channel set across models (linear touches every channel).
  const channels = [...new Set(models.linear.map((c) => c.channel))].sort()
  return { models, channels }
}

export { ATTRIBUTION_MODELS }
