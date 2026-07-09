import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scoring import KeywordInput, score_keyword


def make_keyword(**overrides):
    defaults = dict(
        keyword="test", volume=10000, difficulty=50, current_position=None,
        competitor_gap_count=5, paid_proven_conversions=0, geo_citation_potential=30,
    )
    defaults.update(overrides)
    return KeywordInput(**defaults)


def test_score_within_bounds():
    result = score_keyword(make_keyword())
    assert 0 <= result.opportunity_score <= 100


def test_paid_proven_organic_needed_no_ranking():
    result = score_keyword(make_keyword(paid_proven_conversions=20, current_position=None))
    assert result.label == "Paid-Proven, Organic Needed"


def test_paid_proven_organic_needed_poor_ranking():
    result = score_keyword(make_keyword(paid_proven_conversions=20, current_position=15))
    assert result.label == "Paid-Proven, Organic Needed"


def test_not_flagged_when_already_top_10():
    result = score_keyword(make_keyword(paid_proven_conversions=20, current_position=4))
    assert result.label != "Paid-Proven, Organic Needed"


def test_lower_difficulty_scores_higher():
    easy = score_keyword(make_keyword(difficulty=10))
    hard = score_keyword(make_keyword(difficulty=90))
    assert easy.opportunity_score > hard.opportunity_score


def test_camelcase_serialization():
    # This is the exact bug found during the dress-up pass: Python defaults
    # to snake_case, but the frontend expects camelCase. Verify the fix holds.
    result = score_keyword(make_keyword())
    dumped = result.model_dump(by_alias=True)
    assert "currentPosition" in dumped
    assert "current_position" not in dumped
    assert "opportunityScore" in dumped


def test_accepts_camelcase_input():
    # Also verify the input side accepts camelCase (what the frontend actually sends)
    k = KeywordInput(**{
        "keyword": "office chair", "volume": 18000, "difficulty": 62,
        "currentPosition": 6, "competitorGapCount": 3,
        "paidProvenConversions": 42, "geoCitationPotential": 40,
    })
    assert k.current_position == 6
    assert k.competitor_gap_count == 3
