import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.budget_and_reports import recommend_budget_reallocation, generate_weekly_report


def test_recommends_shift_from_worst_to_best_channel():
    perf = [
        {"channel": "Google Ads", "spend": 18000, "revenue": 45000},
        {"channel": "SEO", "spend": 4000, "revenue": 60000},
    ]
    recs = recommend_budget_reallocation(perf)
    assert len(recs) == 1
    assert recs[0]["fromChannel"] == "Google Ads"
    assert recs[0]["toChannel"] == "SEO"


def test_no_recommendation_when_roas_is_similar():
    perf = [
        {"channel": "Google Ads", "spend": 18000, "revenue": 45000},
        {"channel": "Meta Ads", "spend": 18000, "revenue": 48000},
    ]
    assert recommend_budget_reallocation(perf) == []


def test_no_recommendation_with_single_channel():
    assert recommend_budget_reallocation([{"channel": "SEO", "spend": 1000, "revenue": 5000}]) == []


def test_weekly_report_calculates_correct_blended_roas():
    perf = [
        {"channel": "Google Ads", "spend": 10000, "revenue": 20000},
        {"channel": "Meta Ads", "spend": 10000, "revenue": 40000},
    ]
    report = generate_weekly_report("2026-05-06", perf, [])
    assert report["blendedRoas"] == 3.0  # 60000 / 20000


def test_weekly_report_identifies_top_performer_in_summary():
    perf = [
        {"channel": "Google Ads", "spend": 10000, "revenue": 20000},
        {"channel": "SEO", "spend": 1000, "revenue": 50000},
    ]
    report = generate_weekly_report("2026-05-06", perf, [])
    assert "SEO" in report["summary"]
