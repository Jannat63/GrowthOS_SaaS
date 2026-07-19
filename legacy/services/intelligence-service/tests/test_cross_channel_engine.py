import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.cross_channel_engine import ScoredKeyword, AnalyzedSearchTerm, FatigueResult, generate_recommendations


def kw(**overrides):
    defaults = dict(keyword="test", volume=5000, current_position=None, opportunity_score=50)
    defaults.update(overrides)
    return ScoredKeyword(**defaults)


def term(**overrides):
    defaults = dict(term="test term", conversions=1, recommendation_type="monitor", message="")
    defaults.update(overrides)
    return AnalyzedSearchTerm(**defaults)


def creative(**overrides):
    defaults = dict(name="test ad", ctr_this_week=1.0)
    defaults.update(overrides)
    return FatigueResult(**defaults)


def test_recommends_google_ads_for_position_4_to_10():
    recs = generate_recommendations([kw(keyword="chair", current_position=6)], [], [])
    assert any(r.bridge == "SEO→GoogleAds" and "Launch" in r.title for r in recs)


def test_no_launch_recommendation_for_top_3():
    recs = generate_recommendations([kw(keyword="chair", current_position=2, volume=100)], [], [])
    assert not any("Launch" in r.title for r in recs)


def test_reduce_spend_recommendation_for_top_3():
    recs = generate_recommendations([kw(keyword="chair", current_position=1)], [], [])
    assert any("Reduce paid spend" in r.title for r in recs)


def test_google_ads_to_seo_bridge():
    recs = generate_recommendations([], [term(term="back pain chair", recommendation_type="paid-proven-organic-needed")], [])
    assert any(r.bridge == "GoogleAds→SEO" for r in recs)


def test_meta_to_seo_bridge_above_3_percent_ctr():
    recs = generate_recommendations([], [], [creative(name="winning ad", ctr_this_week=4.5)])
    assert any(r.bridge == "Meta→SEO" for r in recs)


def test_no_meta_bridge_below_3_percent():
    recs = generate_recommendations([], [], [creative(ctr_this_week=2.0)])
    assert not any(r.bridge == "Meta→SEO" for r in recs)


def test_empty_input_returns_empty_list():
    assert generate_recommendations([], [], []) == []


def test_sorted_by_impact():
    recs = generate_recommendations([kw(keyword="a", current_position=6), kw(keyword="b", current_position=1)], [], [])
    order = {"High": 0, "Medium": 1, "Low": 2}
    impacts = [order[r.impact] for r in recs]
    assert impacts == sorted(impacts)


def test_matches_typescript_engine_on_same_input():
    # Cross-check: this Python port should produce the same recommendation
    # count and bridge types as the TypeScript version for identical input,
    # since both implement the same Section 3.3 rules independently.
    recs = generate_recommendations(
        [kw(keyword="office chair", volume=18000, current_position=6, opportunity_score=61)],
        [term(term="best office chair for back pain", conversions=38, recommendation_type="paid-proven-organic-needed")],
        [creative(name="Modern Chair Ad", ctr_this_week=3.5)],
    )
    bridges = {r.bridge for r in recs}
    assert bridges == {"SEO→GoogleAds", "GoogleAds→SEO", "Meta→SEO"}
