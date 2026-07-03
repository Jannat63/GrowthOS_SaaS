"""
Real logic — ported from apps/web/lib/logic/cross-channel-engine.ts
Section 3.3 — The Three-Channel Insight Loop. This is the platform's core
differentiator: it reads scored output from SEO, Google Ads, and Meta Ads
and generates recommendations that cross channel boundaries.
"""
from pydantic import BaseModel
from typing import List, Optional, Literal

class ScoredKeyword(BaseModel):
    keyword: str
    volume: int
    current_position: Optional[int] = None
    opportunity_score: int

class AnalyzedSearchTerm(BaseModel):
    term: str
    conversions: int
    recommendation_type: str
    message: str

class FatigueResult(BaseModel):
    name: str
    ctr_this_week: float

class Recommendation(BaseModel):
    id: str
    bridge: Literal["SEO→GoogleAds", "GoogleAds→SEO", "Meta→SEO", "SEO→Meta"]
    title: str
    message: str
    impact: Literal["High", "Medium", "Low"]

def generate_recommendations(
    keywords: List[ScoredKeyword],
    search_terms: List[AnalyzedSearchTerm],
    fatigue_results: List[FatigueResult],
) -> List[Recommendation]:
    recs: List[Recommendation] = []

    # SEO -> Google Ads: positions 4-10 get a paid campaign recommendation
    for k in keywords:
        if k.current_position is not None and 4 <= k.current_position <= 10:
            recs.append(Recommendation(
                id=f"seo-to-ads-{k.keyword}", bridge="SEO→GoogleAds",
                title=f'Launch Google Ads for "{k.keyword}"',
                message=f'Ranking #{k.current_position} organically — a paid ad guarantees top placement while SEO continues climbing.',
                impact="High",
            ))

    # SEO -> Google Ads: positions 1-3 flagged to reduce paid spend
    for k in keywords:
        if k.current_position is not None and k.current_position <= 3:
            recs.append(Recommendation(
                id=f"pause-paid-{k.keyword}", bridge="SEO→GoogleAds",
                title=f'Reduce paid spend on "{k.keyword}"',
                message=f'Already ranking #{k.current_position} organically — redirect this budget elsewhere.',
                impact="Medium",
            ))

    # Google Ads -> SEO: paid-proven, organic-needed terms
    for t in search_terms:
        if t.recommendation_type == "paid-proven-organic-needed":
            recs.append(Recommendation(
                id=f"ads-to-seo-{t.term}", bridge="GoogleAds→SEO",
                title=f'Create SEO content for "{t.term}"', message=t.message, impact="High",
            ))

    # Meta -> SEO: high-CTR creative becomes a content brief
    for c in fatigue_results:
        if c.ctr_this_week > 3:
            recs.append(Recommendation(
                id=f"meta-to-seo-{c.name}", bridge="Meta→SEO",
                title=f'Turn "{c.name}" into an SEO content brief',
                message=f'{c.ctr_this_week:.1f}% CTR — proven audience resonance. Convert the hook into an organic content angle.',
                impact="Medium",
            ))

    # SEO -> Meta: high-traffic top-3 organic pages become cold-audience ad briefs
    for k in keywords:
        if k.current_position is not None and k.current_position <= 3 and k.volume > 8000:
            recs.append(Recommendation(
                id=f"seo-to-meta-{k.keyword}", bridge="SEO→Meta",
                title=f'Build a Meta cold campaign around "{k.keyword}"',
                message=f'High organic traffic ({k.volume:,}/mo) is a proven top-of-funnel creative brief for Meta.',
                impact="Medium",
            ))

    order = {"High": 0, "Medium": 1, "Low": 2}
    return sorted(recs, key=lambda r: order[r.impact])
