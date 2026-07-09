"""
Real logic — ported from apps/web/lib/logic/search-terms-bridge.ts
Section 7.3.2 — Search Terms Intelligence / Paid-to-Organic Bridge.
"""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, Literal

# Matches apps/web/lib/logic/search-terms-bridge.ts exactly: camelCase I/O,
# and `recommendation` as a nested {type, message} object (not flat fields),
# since that's the shape AnalyzedSearchTerm expects on the frontend.

class SearchTerm(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    term: str
    clicks: int
    conversions: int
    cost: float
    organic_position: Optional[int] = None

class RecommendationInfo(BaseModel):
    type: Literal["paid-proven-organic-needed", "reduce-bid-organic-covers", "monitor"]
    message: str

class AnalyzedSearchTerm(SearchTerm):
    conversion_rate: float
    recommendation: RecommendationInfo

def analyze_search_term(t: SearchTerm) -> AnalyzedSearchTerm:
    conversion_rate = (t.conversions / t.clicks) if t.clicks > 0 else 0
    no_organic_coverage = t.organic_position is None or t.organic_position > 10
    top3_organic = t.organic_position is not None and t.organic_position <= 3

    if t.conversions > 0 and no_organic_coverage:
        rec = RecommendationInfo(
            type="paid-proven-organic-needed",
            message=f'"{t.term}" converted {t.conversions}x via paid but has no ranking SEO content — priority content brief created.',
        )
    elif t.conversions > 0 and top3_organic:
        rec = RecommendationInfo(
            type="reduce-bid-organic-covers",
            message=f'Already ranking #{t.organic_position} organically for "{t.term}". Consider reducing bid.',
        )
    else:
        rec = RecommendationInfo(type="monitor", message=f'"{t.term}" — no action needed yet.')

    return AnalyzedSearchTerm(
        **t.model_dump(by_alias=False), conversion_rate=conversion_rate, recommendation=rec,
    )
