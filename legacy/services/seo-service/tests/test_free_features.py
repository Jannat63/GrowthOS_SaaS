import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.keyword_clustering import cluster_keywords
from app.content_brief import generate_content_brief
from app.schema_generator import generate_faq_schema
from app.long_tail import generate_long_tail_variations
from app.sitemap_and_links import generate_sitemap_xml, generate_robots_txt
import json


def test_clustering_groups_similar_keywords():
    clusters = cluster_keywords(["office chair", "best office chair", "dining table"])
    chair_cluster = next(c for c in clusters if "office chair" in c["keywords"])
    assert "best office chair" in chair_cluster["keywords"]


def test_clustering_separates_dissimilar_keywords():
    clusters = cluster_keywords(["office chair", "dining table"])
    assert len(clusters) == 2


def test_content_brief_does_not_duplicate_best_modifier():
    # Regression test for the duplication bug found during development:
    # "best office chair" should not produce "the best best office chair"
    brief = generate_content_brief("best office chair for back pain", difficulty=60)
    assert "best best" not in brief["faqQuestions"][0].lower()
    assert "Best Best" not in brief["headingStructure"][0]


def test_content_brief_respects_meta_length_limits():
    brief = generate_content_brief("ergonomic office chair", difficulty=50)
    assert len(brief["metaTitleSuggestion"]) <= 60
    assert len(brief["metaDescriptionSuggestion"]) <= 155


def test_faq_schema_produces_valid_json():
    result = generate_faq_schema([{"question": "Q?", "answer": "A"}])
    parsed = json.loads(result)  # raises if invalid
    assert parsed["@type"] == "FAQPage"


def test_long_tail_generates_variations():
    variations = generate_long_tail_variations("office chair")
    assert len(variations) > 0
    assert all("office chair" in v for v in variations)


def test_sitemap_is_valid_xml_with_correct_urls():
    xml = generate_sitemap_xml(["https://example.com/", "https://example.com/about"])
    assert "<loc>https://example.com/</loc>" in xml
    assert "<urlset" in xml


def test_robots_txt_includes_sitemap_reference():
    content = generate_robots_txt("https://example.com/sitemap.xml")
    assert "Sitemap: https://example.com/sitemap.xml" in content
