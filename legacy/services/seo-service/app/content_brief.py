"""
Content Brief Generator — Section 4.1.2, without an LLM.
The blueprint's version calls Claude to generate briefs (Section 7.2.3).
This version uses deterministic rules based on keyword characteristics —
genuinely useful structural guidance, just not prose generation. Honest
tradeoff: it won't write your headings for you, but it tells you exactly
what structure and length to aim for, which is most of what a brief needs.
"""
from typing import List, Dict


def classify_intent(keyword: str) -> str:
    kw = keyword.lower()
    commercial_signals = ["best", "top", "review", "vs", "comparison", "buy"]
    transactional_signals = ["price", "cheap", "discount", "deal", "for sale", "buy"]
    navigational_signals = ["login", "sign in", "official", "website"]

    if any(s in kw for s in transactional_signals):
        return "transactional"
    if any(s in kw for s in navigational_signals):
        return "navigational"
    if any(s in kw for s in commercial_signals):
        return "commercial"
    return "informational"


def suggest_word_count(difficulty: int, intent: str) -> int:
    base = 800 + (difficulty * 15)  # harder keywords need more comprehensive content
    if intent == "commercial":
        base += 400  # comparison/review content tends to run longer
    return round(base / 50) * 50  # round to nearest 50


def _strip_leading_modifiers(keyword: str) -> str:
    """Strips leading 'best'/'top' so templates don't produce 'the best best X'."""
    words = keyword.split()
    while words and words[0].lower() in ("best", "top"):
        words = words[1:]
    return " ".join(words) if words else keyword


def suggest_heading_structure(keyword: str, intent: str) -> List[str]:
    clean_keyword = _strip_leading_modifiers(keyword)
    title_case = clean_keyword.title()
    if intent == "commercial":
        return [
            f"What Makes a Good {title_case}?",
            f"Top {title_case} Options Compared",
            "Key Features to Look For",
            "Pricing Breakdown",
            "Our Recommendation",
            "Frequently Asked Questions",
        ]
    if intent == "transactional":
        return [
            f"{title_case}: What You Need to Know Before Buying",
            "Price Ranges Explained",
            "Where to Buy",
            "Frequently Asked Questions",
        ]
    return [
        f"What Is {title_case}?",
        f"Why {title_case} Matters",
        "How It Works",
        "Common Mistakes to Avoid",
        "Frequently Asked Questions",
    ]


def suggest_faq_questions(keyword: str) -> List[str]:
    clean_keyword = _strip_leading_modifiers(keyword)
    return [
        f"What is the best {clean_keyword}?",
        f"How much does {clean_keyword} cost?",
        f"How do I choose {clean_keyword}?",
        f"Is {clean_keyword} worth it?",
    ]


def generate_content_brief(keyword: str, difficulty: int = 50) -> Dict:
    intent = classify_intent(keyword)
    return {
        "targetKeyword": keyword,
        "searchIntent": intent,
        "recommendedWordCount": suggest_word_count(difficulty, intent),
        "headingStructure": suggest_heading_structure(keyword, intent),
        "faqQuestions": suggest_faq_questions(keyword),
        "metaTitleSuggestion": f"{keyword.title()} — Complete Guide (2026)"[:60],
        "metaDescriptionSuggestion": (
            f"Everything you need to know about {_strip_leading_modifiers(keyword)}. "
            f"Compare options, pricing, and expert recommendations."
        )[:155],
    }
