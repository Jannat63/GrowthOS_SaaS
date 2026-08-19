import { z } from 'zod'

/**
 * Shared `limit`/`offset` parsing for list endpoints (see CLAUDE.md's API contract: "List endpoints
 * paginate via limit/offset and return a total").
 *
 * On the default: it is deliberately equal to MAX_LIMIT rather than a small page size. The problem
 * being fixed is unbounded queries — a workspace's recommendations grow forever and were being
 * selected in full on every dashboard load. A small default would also silently truncate screens
 * that render the whole list today, trading an unbounded query for missing data, which is worse.
 * Every paginated response carries a real `total`, so a caller can tell when it is seeing a partial
 * set, and `offset` is there for when those screens grow a "load more".
 *
 * Invalid values fall back to the defaults rather than 400ing: a bad `?limit=` on a read is not
 * worth failing a dashboard over.
 */

export const MAX_LIMIT = 100

export interface Page {
  limit: number
  offset: number
}

const pageQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})

export function parsePage(query: unknown, defaultLimit: number = MAX_LIMIT): Page {
  const parsed = pageQuerySchema.safeParse(query)
  if (!parsed.success) return { limit: defaultLimit, offset: 0 }
  return { limit: parsed.data.limit ?? defaultLimit, offset: parsed.data.offset ?? 0 }
}

/** The standard list envelope every paginated endpoint returns. */
export interface Paged<T> {
  data: T[]
  total: number
}
