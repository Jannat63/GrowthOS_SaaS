"""
Real Schema Markup Generator — Section 4.1.2.
Generates valid JSON-LD for common page types. Pure templating/logic — this
is the one blueprint feature that was never an "AI" feature to begin with,
schema markup is structured data, not generated prose.
"""
import json
from typing import List, Optional, Dict


def generate_article_schema(headline: str, author: str, date_published: str, image_url: Optional[str] = None) -> str:
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline,
        "author": {"@type": "Person", "name": author},
        "datePublished": date_published,
    }
    if image_url:
        schema["image"] = image_url
    return json.dumps(schema, indent=2)


def generate_faq_schema(qa_pairs: List[Dict[str, str]]) -> str:
    """qa_pairs: [{"question": "...", "answer": "..."}, ...]"""
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": qa["question"],
                "acceptedAnswer": {"@type": "Answer", "text": qa["answer"]},
            }
            for qa in qa_pairs
        ],
    }
    return json.dumps(schema, indent=2)


def generate_product_schema(name: str, description: str, price: float, currency: str = "USD",
                             image_url: Optional[str] = None, availability: str = "InStock") -> str:
    schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "description": description,
        "offers": {
            "@type": "Offer",
            "price": str(price),
            "priceCurrency": currency,
            "availability": f"https://schema.org/{availability}",
        },
    }
    if image_url:
        schema["image"] = image_url
    return json.dumps(schema, indent=2)


def generate_breadcrumb_schema(items: List[Dict[str, str]]) -> str:
    """items: [{"name": "Home", "url": "https://..."}, ...] in order."""
    schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": item["name"], "item": item["url"]}
            for i, item in enumerate(items)
        ],
    }
    return json.dumps(schema, indent=2)


def generate_local_business_schema(name: str, address: str, phone: str, url: str) -> str:
    schema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": name,
        "address": address,
        "telephone": phone,
        "url": url,
    }
    return json.dumps(schema, indent=2)
