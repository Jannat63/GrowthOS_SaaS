import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.search_terms import SearchTerm, analyze_search_term


def test_paid_proven_no_organic_coverage():
    t = SearchTerm(term="office chair", clicks=100, conversions=10, cost=50, organicPosition=None)
    result = analyze_search_term(t)
    assert result.recommendation.type == "paid-proven-organic-needed"


def test_paid_proven_beyond_position_10():
    t = SearchTerm(term="office chair", clicks=100, conversions=10, cost=50, organicPosition=25)
    result = analyze_search_term(t)
    assert result.recommendation.type == "paid-proven-organic-needed"


def test_reduce_bid_when_top_3():
    t = SearchTerm(term="office chair", clicks=100, conversions=10, cost=50, organicPosition=2)
    result = analyze_search_term(t)
    assert result.recommendation.type == "reduce-bid-organic-covers"


def test_monitor_when_no_conversions():
    t = SearchTerm(term="office chair", clicks=100, conversions=0, cost=50, organicPosition=None)
    result = analyze_search_term(t)
    assert result.recommendation.type == "monitor"


def test_conversion_rate_zero_clicks_no_crash():
    t = SearchTerm(term="office chair", clicks=0, conversions=0, cost=0, organicPosition=None)
    result = analyze_search_term(t)
    assert result.conversion_rate == 0


def test_camelcase_nested_recommendation():
    # This is the second bug found during the dress-up pass: the frontend
    # expects a nested `recommendation: {type, message}` object with
    # camelCase `organicPosition`/`conversionRate`, not flat snake_case fields.
    t = SearchTerm(term="office chair", clicks=100, conversions=10, cost=50, organicPosition=None)
    result = analyze_search_term(t)
    dumped = result.model_dump(by_alias=True)
    assert "organicPosition" in dumped
    assert "conversionRate" in dumped
    assert "recommendation" in dumped
    assert "type" in dumped["recommendation"]
    assert "message" in dumped["recommendation"]
