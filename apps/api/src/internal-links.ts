import { getKeywordRankings, getOrganicTraffic } from './seo.js'
import type {
  InternalLinkRecommendation,
  InternalLinkRecommendationsResponse,
  KeywordRanking,
  OrganicPage,
} from '@growthos/types'

/**
 * Internal link optimizer (SEO extras). No crawled link graph exists in this app (that needs
 * DataForSEO or a real crawler), so this works off two things already tracked: keyword rankings
 * and per-page organic traffic. The heuristic is the standard "striking distance" one real SEO
 * tools use for this exact recommendation — a keyword ranking positions 4-15 is close enough to
 * page 1's top results that a few well-placed internal links (from a page that already has
 * authority, i.e. traffic) is often what pushes it over. Anchor text = the keyword itself.
 */

const STOPWORDS = new Set([
  'the', 'for', 'and', 'with', 'best', 'top', 'a', 'an', 'of', 'to', 'in', 'on', 'your', 'you',
])

const STRIKING_DISTANCE_MIN = 4
const STRIKING_DISTANCE_MAX = 15

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/^https?:\/\/[^/]+/, '')
      .split(/[\s/\-_?#.]+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  )
}

/** Best-matching tracked page for a keyword, by token overlap between the keyword and the page's URL slug. Null if no page shares any meaningful token. */
function bestMatchingPage(keyword: string, pages: OrganicPage[]): OrganicPage | null {
  const kTokens = tokenize(keyword)
  if (kTokens.size === 0) return null
  let best: { page: OrganicPage; score: number } | null = null
  for (const page of pages) {
    const pTokens = tokenize(page.pageUrl)
    const overlap = [...kTokens].filter((t) => pTokens.has(t)).length
    if (overlap === 0) continue
    const score = overlap / kTokens.size
    if (!best || score > best.score) best = { page, score }
  }
  return best?.page ?? null
}

function priorityFor(position: number): InternalLinkRecommendation['priority'] {
  if (position <= 6) return 'high'
  if (position <= 10) return 'medium'
  return 'low'
}

/** Pure — no I/O. Given already-fetched pages + keywords, compute the recommendations. Testable without ClickHouse. */
export function computeInternalLinkRecommendations(
  pages: OrganicPage[],
  keywords: KeywordRanking[],
): InternalLinkRecommendationsResponse {
  if (pages.length < 2) {
    // Nothing to link FROM — need at least one other page besides the target.
    return { recommendations: [], summary: { opportunities: 0, highPriority: 0 } }
  }

  const byClicksDesc = [...pages].sort((a, b) => b.clicks - a.clicks)
  const byPositionAsc = [...keywords].sort((a, b) => a.position - b.position)
  const seenTargets = new Set<string>()
  const recommendations: InternalLinkRecommendation[] = []

  for (const kw of byPositionAsc) {
    if (kw.position < STRIKING_DISTANCE_MIN || kw.position > STRIKING_DISTANCE_MAX) continue
    const target = bestMatchingPage(kw.keyword, pages)
    if (!target) continue
    if (seenTargets.has(target.pageUrl)) continue // one recommendation per target page — since keywords are sorted by position first, its best-ranked matching keyword always wins

    const source = byClicksDesc.find((p) => p.pageUrl !== target.pageUrl)
    if (!source) continue

    seenTargets.add(target.pageUrl)
    recommendations.push({
      targetPage: target.pageUrl,
      sourcePage: source.pageUrl,
      keyword: kw.keyword,
      anchorText: kw.keyword,
      currentPosition: kw.position,
      priority: priorityFor(kw.position),
      reason: `"${kw.keyword}" ranks #${kw.position} — within striking distance of page 1's top results. A contextual link from your highest-traffic page can help close the gap.`,
    })
  }

  recommendations.sort((a, b) => a.currentPosition - b.currentPosition)
  const highPriority = recommendations.filter((r) => r.priority === 'high').length
  return { recommendations, summary: { opportunities: recommendations.length, highPriority } }
}

export async function getInternalLinkRecommendations(
  workspaceId: string,
): Promise<InternalLinkRecommendationsResponse> {
  const [traffic, rankings] = await Promise.all([
    getOrganicTraffic(workspaceId),
    getKeywordRankings(workspaceId),
  ])
  return computeInternalLinkRecommendations(traffic.pages, rankings.keywords)
}
