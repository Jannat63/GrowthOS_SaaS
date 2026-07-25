from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Dict

from app.features import (
    generate_rsa_headlines, generate_rsa_descriptions,
    calculate_target_cpa, calculate_minimum_roas,
    allocate_budget, detect_wasted_spend,
)

router = APIRouter(prefix="/google-ads", tags=["google-ads"])


class RSARequest(BaseModel):
    keyword: str
    audience: str = "Professionals"


@router.post("/creatives/rsa-headlines")
def rsa_headlines(req: RSARequest):
    return {
        "headlines": generate_rsa_headlines(req.keyword, req.audience),
        "descriptions": generate_rsa_descriptions(req.keyword),
    }


class CPARequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    product_margin: float
    target_profit_margin_pct: float = 20.0


@router.post("/bidding/target-cpa")
def target_cpa(req: CPARequest):
    return {"targetCpa": calculate_target_cpa(req.product_margin, req.target_profit_margin_pct)}


class ROASRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    product_price: float
    cost_of_goods: float


@router.post("/bidding/minimum-roas")
def minimum_roas(req: ROASRequest):
    return {"minimumRoas": calculate_minimum_roas(req.product_price, req.cost_of_goods)}


class BudgetRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    total_budget: float
    business_stage: str = "growth"


@router.post("/budget/allocate")
def budget_allocate(req: BudgetRequest):
    return {"allocation": allocate_budget(req.total_budget, req.business_stage)}


class Campaign(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    name: str
    clicks: int
    conversions: int
    cost: float
    quality_score: int = 10


class WastedSpendRequest(BaseModel):
    campaigns: List[Campaign]


@router.post("/budget/wasted-spend")
def wasted_spend(req: WastedSpendRequest):
    campaigns_dict = [c.model_dump(by_alias=False) for c in req.campaigns]
    return {"findings": detect_wasted_spend(campaigns_dict)}
