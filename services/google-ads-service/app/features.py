"""
Google Ads features without an LLM — Section 4.2.
RSA headlines use combinatorial templating (no AI). CPA/ROAS calculator and
budget allocator are real math from unit economics. Wasted Spend Detector
and Quality Score Monitor are real rule-based analysis over campaign data.
"""
from typing import List, Dict


# ---- RSA Headline Generator (Section 4.2.2) ----
HEADLINE_TEMPLATES = [
    "{keyword} — Shop Now",
    "Premium {keyword}",
    "{keyword} | Free Shipping",
    "Top-Rated {keyword}",
    "{keyword} Starting at Great Prices",
    "Shop {keyword} Today",
    "{keyword} — 30-Day Returns",
    "Best {keyword} for {audience}",
    "{keyword}: Built to Last",
    "Get Your {keyword} Now",
    "{keyword} — Highly Rated",
    "Discover {keyword}",
    "{keyword} Sale — Limited Time",
    "Why Choose Our {keyword}?",
    "{keyword} Made Simple",
]


def generate_rsa_headlines(keyword: str, audience: str = "Professionals", count: int = 15) -> List[str]:
    headlines = []
    for template in HEADLINE_TEMPLATES[:count]:
        headline = template.format(keyword=keyword.title(), audience=audience)
        if len(headline) <= 30:  # Google Ads RSA headline character limit
            headlines.append(headline)
    return headlines


DESCRIPTION_TEMPLATES = [
    "Shop our full range of {keyword} with fast, free shipping on every order.",
    "Find the perfect {keyword} for your needs. Compare options and save today.",
    "Trusted by thousands. Explore {keyword} backed by our satisfaction guarantee.",
    "Quality {keyword} at prices that make sense. Order now and save.",
]


def generate_rsa_descriptions(keyword: str, count: int = 4) -> List[str]:
    return [t.format(keyword=keyword) for t in DESCRIPTION_TEMPLATES[:count]]


# ---- Target CPA / ROAS Calculator (Section 4.2.3) ----
def calculate_target_cpa(product_margin: float, target_profit_margin_pct: float = 20.0) -> float:
    """Breakeven CPA is the full margin; target CPA leaves room for target profit."""
    breakeven_cpa = product_margin
    target_cpa = breakeven_cpa * (1 - target_profit_margin_pct / 100)
    return round(target_cpa, 2)


def calculate_minimum_roas(product_price: float, cost_of_goods: float) -> float:
    """Minimum ROAS needed to break even, given price and cost of goods."""
    if cost_of_goods <= 0:
        return 0.0
    margin_ratio = product_price / cost_of_goods
    return round(margin_ratio, 2)


# ---- Budget Allocator (Section 4.2.3) ----
def allocate_budget(total_budget: float, business_stage: str = "growth") -> Dict[str, float]:
    """
    Recommends a budget split across campaign types based on funnel stage
    goals — mirrors the blueprint's Section 4.2.3 Budget Allocator logic.
    """
    splits = {
        "new": {"search": 0.60, "pmax": 0.20, "display": 0.10, "demand_gen": 0.10},
        "growth": {"search": 0.45, "pmax": 0.35, "display": 0.10, "demand_gen": 0.10},
        "scale": {"search": 0.35, "pmax": 0.40, "display": 0.15, "demand_gen": 0.10},
    }
    split = splits.get(business_stage, splits["growth"])
    return {channel: round(total_budget * pct, 2) for channel, pct in split.items()}


# ---- Wasted Spend Detector (Section 4.2.3) ----
def detect_wasted_spend(campaigns: List[Dict]) -> List[Dict]:
    """
    campaigns: [{"name": str, "clicks": int, "conversions": int, "cost": float, "qualityScore": int}]
    Flags campaigns burning budget without converting, or with low Quality Score inflating CPC.
    """
    findings = []
    for c in campaigns:
        conversion_rate = c["conversions"] / c["clicks"] if c["clicks"] > 0 else 0
        cost_per_click = c["cost"] / c["clicks"] if c["clicks"] > 0 else 0

        if c["clicks"] > 50 and c["conversions"] == 0:
            findings.append({
                "campaign": c["name"],
                "issue": "Zero conversions despite significant clicks",
                "wastedSpend": c["cost"],
                "severity": "High",
            })
        elif conversion_rate < 0.005 and c["cost"] > 100:
            findings.append({
                "campaign": c["name"],
                "issue": f"Very low conversion rate ({conversion_rate:.2%})",
                "wastedSpend": round(c["cost"] * 0.5, 2),  # rough estimate of the inefficient portion
                "severity": "Medium",
            })

        if c.get("qualityScore", 10) <= 3:
            findings.append({
                "campaign": c["name"],
                "issue": f"Low Quality Score ({c['qualityScore']}/10) inflating CPC",
                "wastedSpend": round(cost_per_click * c["clicks"] * 0.3, 2),
                "severity": "Medium",
            })

    return findings
