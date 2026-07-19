import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.features import (
    generate_rsa_headlines, calculate_target_cpa, calculate_minimum_roas,
    allocate_budget, detect_wasted_spend,
)


def test_all_rsa_headlines_within_character_limit():
    headlines = generate_rsa_headlines("office chair")
    assert all(len(h) <= 30 for h in headlines)
    assert len(headlines) > 0


def test_target_cpa_leaves_room_for_profit():
    cpa = calculate_target_cpa(product_margin=50, target_profit_margin_pct=20)
    assert cpa < 50  # must be less than full margin to leave profit room
    assert cpa == 40.0


def test_minimum_roas_calculation():
    roas = calculate_minimum_roas(product_price=100, cost_of_goods=40)
    assert roas == 2.5


def test_minimum_roas_handles_zero_cost():
    assert calculate_minimum_roas(product_price=100, cost_of_goods=0) == 0.0


def test_budget_allocation_sums_to_total():
    allocation = allocate_budget(10000, "growth")
    assert sum(allocation.values()) == 10000


def test_budget_allocation_defaults_for_unknown_stage():
    allocation = allocate_budget(10000, "nonexistent_stage")
    assert sum(allocation.values()) == 10000  # falls back to "growth" split


def test_wasted_spend_flags_zero_conversions():
    findings = detect_wasted_spend([
        {"name": "Bad Campaign", "clicks": 200, "conversions": 0, "cost": 450, "qualityScore": 8}
    ])
    assert len(findings) == 1
    assert findings[0]["severity"] == "High"


def test_wasted_spend_flags_low_quality_score():
    findings = detect_wasted_spend([
        {"name": "Low QS", "clicks": 100, "conversions": 5, "cost": 300, "qualityScore": 2}
    ])
    assert any("Quality Score" in f["issue"] for f in findings)


def test_wasted_spend_no_findings_for_healthy_campaign():
    findings = detect_wasted_spend([
        {"name": "Good Campaign", "clicks": 500, "conversions": 60, "cost": 800, "qualityScore": 9}
    ])
    assert findings == []
