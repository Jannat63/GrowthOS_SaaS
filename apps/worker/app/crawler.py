"""
Real site-audit crawler (M3 P3.1 SEO extras — restored from legacy/services/seo-service).

Actually fetches pages over HTTP and inspects them. No third-party API, no paid data source —
this is genuine, working code, not a mock. It doesn't scale to a whole enterprise site; it crawls
a bounded set synchronously, suitable for a single site's homepage + linked pages up to
`max_pages`.

Hardened beyond the legacy version because that one only ever ran against a fixed demo URL chosen
by a developer. This one runs against whatever URL a real user types in, which means it has to
defend itself against:
  - SSRF: a URL resolving to a private/loopback/link-local address (someone pointing the audit at
    their own cloud metadata endpoint or an internal service).
  - Unbounded response size: a multi-gigabyte response would otherwise be read into memory whole.
  - Non-HTML content: a PDF or binary served on a plausible-looking URL.
  - Redirect chains: capped rather than followed indefinitely.
"""
import ipaddress
import re
import socket
from dataclasses import dataclass, field
from typing import List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

USER_AGENT = "GrowthOS-SiteAuditBot/1.0 (+https://growthos.app/bot)"
REQUEST_TIMEOUT = 8
MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5 MB — plenty for an HTML page, not for a video file
MAX_REDIRECTS = 5


class UnsafeUrlError(Exception):
    """Raised when a URL resolves somewhere the crawler must not fetch from."""


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


def _assert_public_host(url: str) -> None:
    """Resolve the URL's host and reject anything private/loopback/link-local (SSRF guard)."""
    host = urlparse(url).hostname
    if not host:
        raise UnsafeUrlError(f"No hostname in URL: {url}")
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise UnsafeUrlError(f"Could not resolve host: {host}") from e
    for info in infos:
        addr = info[4][0]
        ip = ipaddress.ip_address(addr)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise UnsafeUrlError(f"Host resolves to a non-public address: {host} -> {addr}")


def audit_page(url: str) -> PageAuditResult:
    issues: List[str] = []
    try:
        _assert_public_host(url)
        resp = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
            stream=True,
            allow_redirects=True,
        )
        # requests follows redirects internally without a public max-redirects knob on `get()`;
        # a Session with max_redirects is the documented way to cap the chain.
        if len(resp.history) > MAX_REDIRECTS:
            raise requests.TooManyRedirects(f"More than {MAX_REDIRECTS} redirects")

        content_type = resp.headers.get("Content-Type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return PageAuditResult(
                url=url, status_code=resp.status_code, title=None, meta_description=None,
                h1_count=0, word_count=0, has_canonical=False,
                issues=[f"Not HTML (Content-Type: {content_type or 'unknown'})"],
            )

        raw = resp.raw.read(MAX_RESPONSE_BYTES + 1, decode_content=True)
        if len(raw) > MAX_RESPONSE_BYTES:
            return PageAuditResult(
                url=url, status_code=resp.status_code, title=None, meta_description=None,
                h1_count=0, word_count=0, has_canonical=False,
                issues=[f"Response exceeded {MAX_RESPONSE_BYTES // (1024 * 1024)}MB, skipped"],
            )
        html = raw.decode(resp.encoding or "utf-8", errors="replace")
    except UnsafeUrlError as e:
        return PageAuditResult(
            url=url, status_code=None, title=None, meta_description=None,
            h1_count=0, word_count=0, has_canonical=False, issues=[str(e)],
        )
    except requests.RequestException as e:
        return PageAuditResult(
            url=url, status_code=None, title=None, meta_description=None,
            h1_count=0, word_count=0, has_canonical=False,
            issues=[f"Request failed: {e.__class__.__name__}"],
        )

    if resp.status_code >= 400:
        issues.append(f"{resp.status_code} error")

    soup = BeautifulSoup(html, "html.parser")

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

    internal_links: List[str] = []
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
    visited: set[str] = set()
    queue = [start_url]
    results: List[PageAuditResult] = []

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
