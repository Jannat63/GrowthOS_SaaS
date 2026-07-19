"""
Budget Reallocation Engine + Weekly Growth Intelligence Report — Section 4.4.
Both are rule-based / templated, not LLM-generated — the blueprint's version
calls Claude for prose (Section 7.5), this version generates real, useful
output from real numbers using string templates instead. Genuinely useful,
just not free-form prose.
"""
from typing import List, Dict
from datetime import date


def recommend_budget_reallocation(channel_performance: List[Dict]) -> List[Dict]:
    """
    channel_performance: [{"channel": str, "spend": float, "revenue": float}]
    Real logic: computes each channel's ROAS, flags the worst performer and
    recommends shifting a portion of its budget to the best performer —
    Section 4.4's "Budget Reallocation Engine".
    """
    if len(channel_performance) < 2:
        return []

    scored = []
    for c in channel_performance:
        roas = c["revenue"] / c["spend"] if c["spend"] > 0 else 0
        scored.append({**c, "roas": roas})

    scored.sort(key=lambda c: c["roas"])
    worst = scored[0]
    best = scored[-1]

    if worst["channel"] == best["channel"] or best["roas"] <= worst["roas"] * 1.2:
        return []  # not enough of a gap to justify a reallocation recommendation

    shift_amount = round(worst["spend"] * 0.15, 2)  # conservative 15% shift, not all-or-nothing
    return [{
        "fromChannel": worst["channel"],
        "toChannel": best["channel"],
        "amount": shift_amount,
        "reason": (
            f"{worst['channel']} is returning {worst['roas']:.2f}x ROAS vs. "
            f"{best['channel']}'s {best['roas']:.2f}x. Shifting a portion of budget "
            f"could improve overall blended efficiency."
        ),
    }]


def generate_weekly_report(
    week_start: str,
    channel_performance: List[Dict],
    top_recommendations: List[Dict],
) -> Dict:
    """
    Generates a real, data-driven weekly report using string templates —
    Section 7.5's "Weekly Report Generation" without calling an LLM.
    """
    total_revenue = sum(c["revenue"] for c in channel_performance)
    total_spend = sum(c["spend"] for c in channel_performance)
    blended_roas = round(total_revenue / total_spend, 2) if total_spend > 0 else 0

    best_channel = max(channel_performance, key=lambda c: c["revenue"] / c["spend"] if c["spend"] > 0 else 0)
    worst_channel = min(channel_performance, key=lambda c: c["revenue"] / c["spend"] if c["spend"] > 0 else 0)

    summary_lines = [
        f"Total revenue this week: ${total_revenue:,.2f} across ${total_spend:,.2f} in spend "
        f"({blended_roas}x blended ROAS).",
        f"{best_channel['channel']} was the top performer this week.",
    ]
    if worst_channel["channel"] != best_channel["channel"]:
        summary_lines.append(f"{worst_channel['channel']} underperformed relative to other channels.")

    return {
        "weekStart": week_start,
        "generatedAt": date.today().isoformat(),
        "summary": " ".join(summary_lines),
        "blendedRoas": blended_roas,
        "totalRevenue": total_revenue,
        "totalSpend": total_spend,
        "topOpportunities": top_recommendations[:3],
        "channelBreakdown": [
            {"channel": c["channel"], "spend": c["spend"], "revenue": c["revenue"],
             "roas": round(c["revenue"] / c["spend"], 2) if c["spend"] > 0 else 0}
            for c in channel_performance
        ],
    }
