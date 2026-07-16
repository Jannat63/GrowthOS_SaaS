from app.strategy import generate_strategy
from app.fixtures.crawl import stub_crawl


def test_stub_crawl_is_deterministic_and_seeded():
    a = stub_crawl("https://example.com")
    b = stub_crawl("https://example.com")
    assert a == b
    assert a["seeded"] is True and a["pagesCrawled"] > 0


def test_strategy_allocations_sum_to_100():
    for cat in ["ecommerce", "saas", "local_services", "content", "unknown-x"]:
        s = generate_strategy(cat, 3000)
        assert sum(c["allocationPct"] for c in s["channelMix"]) == 100
        assert len(s["ninetyDayPlan"]) >= 1
        assert s["summary"]


def test_unknown_category_falls_back():
    assert generate_strategy("nope", None)["channelMix"]  # no raise, non-empty
