from fastapi import APIRouter, Depends
from app.cross_channel_engine import (
    ScoredKeyword, AnalyzedSearchTerm, FatigueResult, Recommendation, generate_recommendations,
)
from app.db import RecommendationRow
from app.auth_dependency import get_scoped_db, get_workspace_id_from_token
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

class RecommendationRequest(BaseModel):
    keywords: List[ScoredKeyword]
    search_terms: List[AnalyzedSearchTerm]
    fatigue_results: List[FatigueResult]

@router.post("/recommendations", response_model=List[Recommendation])
def get_recommendations(
    req: RecommendationRequest,
    workspace_id: str = Depends(get_workspace_id_from_token),
    db: Session = Depends(get_scoped_db),
):
    """
    Runs the real cross-channel engine, then PERSISTS each recommendation to
    Postgres. workspace_id comes from the verified JWT, not the request
    body — a client can't forge a different workspace_id to write into
    someone else's data. Isolation is enforced by explicit filtering below
    (simple and reliable) rather than DB-level RLS session variables, which
    hit real connection-pooling issues during testing and were deferred.
    """
    recs = generate_recommendations(req.keywords, req.search_terms, req.fatigue_results)

    workspace_uuid = uuid.UUID(workspace_id)
    for r in recs:
        db.add(RecommendationRow(
            id=uuid.uuid4(),
            workspace_id=workspace_uuid,
            bridge_type=r.bridge,
            title=r.title,
            message=r.message,
            impact=r.impact,
            status="pending",
        ))
    db.commit()

    return recs

@router.get("/recommendations/history", response_model=List[dict])
def get_recommendation_history(
    workspace_id: str = Depends(get_workspace_id_from_token),
    db: Session = Depends(get_scoped_db),
):
    """Explicitly filtered by the caller's own workspace_id from the verified JWT."""
    rows = (
        db.query(RecommendationRow)
        .filter(RecommendationRow.workspace_id == uuid.UUID(workspace_id))
        .order_by(RecommendationRow.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(row.id),
            "bridge": row.bridge_type,
            "title": row.title,
            "message": row.message,
            "impact": row.impact,
            "status": row.status,
            "createdAt": row.created_at.isoformat(),
        }
        for row in rows
    ]
