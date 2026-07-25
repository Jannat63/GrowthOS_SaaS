import { describe, expect, it } from 'vitest'
import { computeInternalLinkRecommendations } from './internal-links.js'
import type { KeywordRanking, OrganicPage } from '@growthos/types'

function page(pageUrl: string, clicks: number): OrganicPage {
  return { pageUrl, clicks, impressions: clicks * 20, ctr: 5, avgPosition: 8 }
}

function keyword(k: string, position: number): KeywordRanking {
  return { keyword: k, position, previousPosition: position, change: 0, best: position, series: [] }
}

describe('computeInternalLinkRecommendations', () => {
  it('returns nothing when fewer than 2 pages exist (nothing to link from)', () => {
    const result = computeInternalLinkRecommendations(
      [page('/only-page', 100)],
      [keyword('only page', 6)],
    )
    expect(result.recommendations).toEqual([])
    expect(result.summary).toEqual({ opportunities: 0, highPriority: 0 })
  })

  it('recommends a link for a keyword in striking distance (position 4-15) that matches a page', () => {
    const pages = [page('/blog/home-office-guide', 500), page('/products/standing-desk', 50)]
    const keywords = [keyword('standing desk converter', 8)]
    const result = computeInternalLinkRecommendations(pages, keywords)

    expect(result.recommendations).toHaveLength(1)
    const rec = result.recommendations[0]!
    expect(rec.targetPage).toBe('/products/standing-desk')
    expect(rec.sourcePage).toBe('/blog/home-office-guide') // highest-clicks page other than the target
    expect(rec.anchorText).toBe('standing desk converter')
    expect(rec.currentPosition).toBe(8)
  })

  it('ignores keywords outside the striking-distance band (top 3 or beyond page 2)', () => {
    const pages = [page('/blog/a', 500), page('/products/standing-desk', 50)]
    const alreadyTop3 = computeInternalLinkRecommendations(pages, [keyword('standing desk converter', 2)])
    const tooFarOut = computeInternalLinkRecommendations(pages, [keyword('standing desk converter', 20)])
    expect(alreadyTop3.recommendations).toEqual([])
    expect(tooFarOut.recommendations).toEqual([])
  })

  it('skips a keyword that shares no meaningful token with any tracked page', () => {
    const pages = [page('/blog/a', 500), page('/products/standing-desk', 50)]
    const result = computeInternalLinkRecommendations(pages, [keyword('mechanical keyboard', 7)])
    expect(result.recommendations).toEqual([])
  })

  it('never recommends a page link to itself', () => {
    // Only one page matches the keyword's tokens, and it's also the single highest-clicks page —
    // there's no *other* page to source the link from, so no recommendation should be made.
    const pages = [page('/products/standing-desk', 500)]
    const result = computeInternalLinkRecommendations(pages, [keyword('standing desk converter', 8)])
    expect(result.recommendations).toEqual([])
  })

  it('recommends at most one link per target page, keeping only its best-ranked matching keyword', () => {
    const pages = [page('/blog/a', 500), page('/products/standing-desk', 50)]
    const keywords = [
      keyword('standing desk converter', 12),
      keyword('standing desk', 6), // better position, same target page — should win
    ]
    const result = computeInternalLinkRecommendations(pages, keywords)
    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0]!.keyword).toBe('standing desk')
    expect(result.recommendations[0]!.currentPosition).toBe(6)
  })

  it('bands priority correctly: <=6 high, 7-10 medium, 11-15 low', () => {
    const pages = [
      page('/blog/hub', 500),
      page('/products/desk-lamp', 10),
      page('/products/office-chair', 20),
      page('/products/keyboard-tray', 30),
    ]
    const r = computeInternalLinkRecommendations(pages, [
      keyword('desk lamp', 5),
      keyword('office chair', 9),
      keyword('keyboard tray', 14),
    ])
    const byTarget = Object.fromEntries(r.recommendations.map((rec) => [rec.targetPage, rec.priority]))
    expect(byTarget['/products/desk-lamp']).toBe('high')
    expect(byTarget['/products/office-chair']).toBe('medium')
    expect(byTarget['/products/keyboard-tray']).toBe('low')
    expect(r.summary).toEqual({ opportunities: 3, highPriority: 1 })
  })

  it('sorts recommendations by current position, best first', () => {
    const pages = [page('/blog/hub', 500), page('/products/desk-lamp', 10), page('/products/office-chair', 20)]
    const r = computeInternalLinkRecommendations(pages, [keyword('office chair', 14), keyword('desk lamp', 5)])
    expect(r.recommendations.map((x) => x.targetPage)).toEqual(['/products/desk-lamp', '/products/office-chair'])
  })
})
