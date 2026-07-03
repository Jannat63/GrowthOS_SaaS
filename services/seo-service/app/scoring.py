"""
Real logic — ported from apps/web/lib/logic/seo-scoring.ts
Composite opportunity score: Section 7.2.1 of the blueprint.
"""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional

# alias_generator=to_camel + populate_by_name means: accept camelCase JSON in
# (matching the frontend's KeywordInput type), and by default FastAPI serializes
# responses using the alias too, so output is camelCase — matching ScoredKeyword
# in apps/web/lib/logic/seo-scoring.ts exactly.

class KeywordInput(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    keyword: str
    volume: int
    difficulty: int  # 0-100, higher = harder
    current_position: Optional[int] = None
    competitor_gap_count: int
    paid_proven_conversions: int
    geo_citation_potential: int  # 0-100

class ScoredKeyword(KeywordInput):
    opportunity_score: int
    label: str

WEIGHTS = {"volume": 0.3, "difficulty": 0.2, "competitor_gap": 0.2, "paid_proof": 0.2, "geo_citation": 0.1}

def normalize(value: float, max_value: float) -> float:
    return min(value / max_value, 1) * 100

def score_keyword(k: KeywordInput) -> ScoredKeyword:
    volume_score = normalize(k.volume, 20000)
    difficulty_score = 100 - k.difficulty
    gap_score = normalize(k.competitor_gap_count, 10)
    paid_proof_score = normalize(k.paid_proven_conversions, 50)
    geo_score = k.geo_citation_potential

    score = round(
        volume_score * WEIGHTS["volume"]
        + difficulty_score * WEIGHTS["difficulty"]
        + gap_score * WEIGHTS["competitor_gap"]
        + paid_proof_score * WEIGHTS["paid_proof"]
        + geo_score * WEIGHTS["geo_citation"]
    )

    label = "Standard"
    if k.paid_proven_conversions > 0 and (k.current_position is None or k.current_position > 10):
        label = "Paid-Proven, Organic Needed"
    elif score >= 70:
        label = "High Priority"
    elif score < 40:
        label = "Low Priority"

    return ScoredKeyword(**k.model_dump(), opportunity_score=score, label=label)
