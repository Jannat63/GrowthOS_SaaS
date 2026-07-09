"""
Real Full Site Audit crawler — Section 4.1.3.
Actually fetches pages over HTTP and inspects them. No paid API required.
This is a genuine, working implementation, not a mock — it just doesn't
scale to 100,000 pages like the blueprint's production target (Section 5.1.3);
it crawls a bounded set synchronously, suitable for a single site's homepage
+ linked pages up to `max_pages`.
"""
import re
from urllib.parse import urljoin, urlparse
from dataclasses import dataclass, field
from typing import List, Optional

import requests
from bs4 import BeautifulSoup

USER_AGENT = "GrowthOS-SiteAuditBot/0.1 (+https://github.com/yourname/growthos)"
REQUEST_TIMEOUT = 8


@dataclass
class PageAuditResult:
    url: str
    status_code: Optional[int]
    title: Optional[str]
    meta_description: Optional[str]
    h1_count: int
    word_count: int
    has_canonical: bool
    internal_links: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)


def _same_domain(base: str, candidate: str) -> bool:
    return urlparse(base).netloc == urlparse(candidate).netloc


def audit_page(url: str) -> PageAuditResult:
    issues = []
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
    except requests.RequestException as e:
        return PageAuditResult(
            url=url, status_code=None, title=None, meta_description=None,
            h1_count=0, word_count=0, has_canonical=False,
            issues=[f"Request failed: {e.__class__.__name__}"],
        )

    if resp.status_code >= 400:
        issues.append(f"{resp.status_code} error")

    soup = BeautifulSoup(resp.text, "html.parser")

    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else None
    if not title:
        issues.append("Missing title tag")
    elif len(title) > 60:
        issues.append("Title tag too long (>60 chars)")

    meta_desc_tag = soup.find("meta", attrs={"name": "description"})
    meta_description = meta_desc_tag.get("content") if meta_desc_tag else None
    if not meta_description:
        issues.append("Missing meta description")

    h1_tags = soup.find_all("h1")
    if len(h1_tags) == 0:
        issues.append("Missing H1 tag")
    elif len(h1_tags) > 1:
        issues.append(f"Multiple H1 tags ({len(h1_tags)})")

    body_text = soup.get_text(separator=" ", strip=True)
    word_count = len(re.findall(r"\w+", body_text))
    if word_count < 300:
        issues.append(f"Thin content ({word_count} words)")

    canonical_tag = soup.find("link", attrs={"rel": "canonical"})
    has_canonical = canonical_tag is not None
    if not has_canonical:
        issues.append("Missing canonical tag")

    images_without_alt = [img for img in soup.find_all("img") if not img.get("alt")]
    if images_without_alt:
        issues.append(f"{len(images_without_alt)} images missing alt text")

    internal_links = []
    for a in soup.find_all("a", href=True):
        full_url = urljoin(url, a["href"])
        full_url = full_url.split("#")[0]  # strip fragment — #anchor isn't a separate page
        if full_url and _same_domain(url, full_url) and full_url not in internal_links:
            internal_links.append(full_url)

    return PageAuditResult(
        url=url, status_code=resp.status_code, title=title, meta_description=meta_description,
        h1_count=len(h1_tags), word_count=word_count, has_canonical=has_canonical,
        internal_links=internal_links, issues=issues,
    )


def crawl_site(start_url: str, max_pages: int = 20) -> List[PageAuditResult]:
    """Breadth-first crawl starting from start_url, staying on the same domain."""
    visited = set()
    queue = [start_url]
    results = []

    while queue and len(visited) < max_pages:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        result = audit_page(url)
        results.append(result)

        for link in result.internal_links:
            if link not in visited and link not in queue:
                queue.append(link)

    return results
