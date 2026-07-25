from fastapi import APIRouter
from typing import List
from app.search_terms import SearchTerm, AnalyzedSearchTerm, analyze_search_term

router = APIRouter(prefix="/google-ads", tags=["google-ads"])

@router.post("/search-terms", response_model=List[AnalyzedSearchTerm])
def analyze_terms(terms: List[SearchTerm]):
    """
    Real bridge-rule logic. In production, `terms` is pulled every 4 hours from the
    Google Ads API Search Terms Report (Section 7.3.2) instead of being posted directly.
    Requires GOOGLE_ADS_CLIENT_ID / DEVELOPER_TOKEN once API access is approved.
    """
    analyzed = [analyze_search_term(t) for t in terms]
    return sorted(analyzed, key=lambda t: t.conversions, reverse=True)

@router.get("/campaigns")
def list_campaigns(workspace_id: str):
    return {"workspace_id": workspace_id, "note": "Not yet connected to live Google Ads API — requires OAuth + developer token approval."}
