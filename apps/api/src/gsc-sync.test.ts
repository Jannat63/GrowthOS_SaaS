import { describe, expect, it } from 'vitest'
import { toKeywordRows, toOrganicRows, type GscRow } from './gsc-sync.js'

const rows: GscRow[] = [
  { keys: ['best office chair'], clicks: 42, impressions: 900, ctr: 0.046, position: 6.4 },
  { keys: ['ergonomic chair'], clicks: 18, impressions: 400, ctr: 0.045, position: 9.8 },
]

describe('GSC → ClickHouse transforms', () => {
  it('maps query rows to keyword_rankings (rounded position)', () => {
    const out = toKeywordRows('ws1', '2026-07-17', rows)
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      workspace_id: 'ws1',
      keyword: 'best office chair',
      date: '2026-07-17',
      position: 6, // rounded from 6.4
      device: 'desktop',
    })
    expect(out[1]!.position).toBe(10) // rounded from 9.8
  })

  it('maps page rows to organic_traffic (sessions=0, avg_position fractional)', () => {
    const pageRows: GscRow[] = [{ keys: ['https://x.com/chairs'], clicks: 30, impressions: 800, ctr: 0.037, position: 4.2 }]
    const out = toOrganicRows('ws1', '2026-07-17', pageRows)
    expect(out[0]).toMatchObject({
      workspace_id: 'ws1',
      page_url: 'https://x.com/chairs',
      sessions: 0,
      clicks: 30,
      impressions: 800,
      avg_position: 4.2,
    })
  })
})
