"""
Long-Tail Keyword Finder — Section 4.1.1, without a paid keyword database.
Generates realistic long-tail variations using common search modifier
patterns. Won't have real search volume data (that needs DataForSEO or
similar, a paid API) — but the variations themselves are genuinely useful
starting points for content planning, for free.
"""
from typing import List

PREFIXES = ["best", "cheap", "top rated", "affordable", "how to choose"]
SUFFIXES = ["for beginners", "reviews", "near me", "for small business", "under $100", "vs", "guide"]
QUESTION_FORMS = ["what is", "how does", "why is", "when should you use"]


def generate_long_tail_variations(seed_keyword: str) -> List[str]:
    variations = []
    for prefix in PREFIXES:
        variations.append(f"{prefix} {seed_keyword}")
    for suffix in SUFFIXES:
        variations.append(f"{seed_keyword} {suffix}")
    for question in QUESTION_FORMS:
        variations.append(f"{question} {seed_keyword}")
    return variations
