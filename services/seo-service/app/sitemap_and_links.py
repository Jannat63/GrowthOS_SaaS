"""
Sitemap Generator + Internal Link Optimizer — Section 4.1.3.
Both are real, free — the internal link optimizer works directly off the
real crawler's output (app/crawler.py), no paid API needed.
"""
from typing import List, Dict
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

from app.crawler import PageAuditResult


def generate_sitemap_xml(urls: List[str]) -> str:
    urlset = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for url in urls:
        url_elem = SubElement(urlset, "url")
        loc = SubElement(url_elem, "loc")
        loc.text = url
    rough_string = tostring(urlset, "utf-8")
    return minidom.parseString(rough_string).toprettyxml(indent="  ")


def generate_robots_txt(sitemap_url: str, disallow_paths: List[str] = None) -> str:
    disallow_paths = disallow_paths or ["/admin", "/cart", "/checkout"]
    lines = ["User-agent: *"]
    lines += [f"Disallow: {path}" for path in disallow_paths]
    lines.append("")
    lines.append(f"Sitemap: {sitemap_url}")
    return "\n".join(lines)


def find_orphaned_pages(crawl_results: List[PageAuditResult]) -> List[str]:
    """
    A page is orphaned if no other crawled page links to it — Section 4.1.3's
    "Internal Link Optimizer" orphan-page detection, computed directly from
    the real crawl graph rather than a paid link-index API.
    """
    all_urls = {r.url for r in crawl_results}
    linked_to = set()
    for r in crawl_results:
        linked_to.update(r.internal_links)

    return sorted(all_urls - linked_to - {crawl_results[0].url if crawl_results else None})


def compute_link_equity_distribution(crawl_results: List[PageAuditResult]) -> Dict[str, int]:
    """Counts how many internal links point to each page — a simple proxy for internal PageRank."""
    incoming_counts: Dict[str, int] = {r.url: 0 for r in crawl_results}
    for r in crawl_results:
        for link in r.internal_links:
            if link in incoming_counts:
                incoming_counts[link] += 1
    return incoming_counts
