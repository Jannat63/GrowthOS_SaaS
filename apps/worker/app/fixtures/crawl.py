def stub_crawl(url: str) -> dict:
    # Seeded/deterministic stand-in for the real crawler (real crawl -> M3).
    return {
        "pagesCrawled": 12,
        "topKeywords": ["best moisturizer", "dry skin routine", "affordable skincare"],
        "issues": ["3 pages missing meta descriptions", "1 slow page (LCP > 3s)"],
        "seeded": True,
    }
