from typing import Optional

# Category -> channel-mix weights (must sum to 100). Deterministic templates (D4).
_MIX = {
    "ecommerce": {"seo": 35, "google_ads": 35, "meta_ads": 30},
    "saas": {"seo": 50, "google_ads": 35, "meta_ads": 15},
    "local_services": {"seo": 40, "google_ads": 45, "meta_ads": 15},
    "content": {"seo": 60, "google_ads": 20, "meta_ads": 20},
    "other": {"seo": 45, "google_ads": 35, "meta_ads": 20},
}
_RATIONALE = {
    "seo": "Compounding organic demand capture",
    "google_ads": "Immediate high-intent traffic",
    "meta_ads": "Audience discovery and retargeting",
}


def generate_strategy(category: str, budget: Optional[int]) -> dict:
    mix = _MIX.get(category, _MIX["other"])
    channel_mix = [
        {"channel": ch, "allocationPct": pct, "rationale": _RATIONALE[ch]}
        for ch, pct in mix.items()
    ]
    band = "lean" if (budget or 0) < 2000 else "growth" if (budget or 0) < 10000 else "scale"
    plan = [
        {"phase": "Weeks 1-4: Foundation", "focus": "Technical SEO fixes + campaign setup",
         "milestones": ["Fix crawl issues", "Launch 1 Google Ads campaign", "Install tracking"]},
        {"phase": "Weeks 5-8: Momentum", "focus": "Content + creative testing",
         "milestones": ["Publish 4 briefs", "Test 3 ad creatives", "First MER read"]},
        {"phase": "Weeks 9-12: Scale", "focus": f"Reallocate to winners ({band} budget)",
         "milestones": ["Double down on best channel", "Add lookalikes", "90-day review"]},
    ]
    return {
        "summary": f"A {band}-budget, {category or 'general'} growth plan balancing SEO, Google Ads, and Meta.",
        "channelMix": channel_mix,
        "ninetyDayPlan": plan,
    }
