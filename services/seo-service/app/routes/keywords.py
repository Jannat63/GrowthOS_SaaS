from fastapi import APIRouter
from typing import List
from app.scoring import KeywordInput, ScoredKeyword, score_keyword

router = APIRouter(prefix="/keywords", tags=["keywords"])

@router.post("/research", response_model=List[ScoredKeyword])
def research_keywords(keywords: List[KeywordInput]):
    """
    Real scoring logic runs here. In production this endpoint would first call
    DataForSEO API for volume/difficulty/CPC data (Section 5.1.3), then score.
    For now it scores whatever KeywordInput payload the caller provides.
    """
    scored = [score_keyword(k) for k in keywords]
    return sorted(scored, key=lambda k: k.opportunity_score, reverse=True)

@router.get("/rankings")
def get_rankings(workspace_id: str):
    """
    Placeholder — production version reads from ClickHouse `keyword_rankings` table
    (see db/clickhouse/schema/001_analytics_schema.sql), populated by the daily
    Scrapy rank-tracking cluster described in Section 7.2.2.
    """
    return {"workspace_id": workspace_id, "note": "Not yet connected to ClickHouse or the rank-tracking crawler."}
