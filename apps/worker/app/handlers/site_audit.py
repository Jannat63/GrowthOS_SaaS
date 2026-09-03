import asyncio
from dataclasses import asdict
from typing import Any

from app.crawler import crawl_site
from app.jobs import get_pool, mark_progress

DEFAULT_MAX_PAGES = 20
HARD_MAX_PAGES = 50  # a real crawl against a real domain — cap it regardless of what's requested


async def handle(payload: dict[str, Any], job_id: str, workspace_id: str) -> dict[str, Any]:
    """Real site audit: crawls the given URL over real HTTP and inspects each page.

    No third-party API, no fixture data — `crawl_site` makes genuine outbound requests. This is
    the one part of the job worth calling out: it's a blocking, potentially slow (up to
    ~8s x max_pages worst case) network operation, so it runs in a thread rather than on the
    worker's event loop.
    """
    pool = await get_pool()
    url = payload.get("url", "")
    max_pages = min(int(payload.get("maxPages", DEFAULT_MAX_PAGES)), HARD_MAX_PAGES)

    await mark_progress(pool, job_id, 10)
    pages = await asyncio.to_thread(crawl_site, url, max_pages)
    await mark_progress(pool, job_id, 90)

    page_results = [asdict(p) for p in pages]
    total_issues = sum(len(p["issues"]) for p in page_results)
    healthy_pages = sum(1 for p in page_results if not p["issues"])

    return {
        "startUrl": url,
        "pagesCrawled": len(page_results),
        "totalIssues": total_issues,
        "healthyPages": healthy_pages,
        "pages": page_results,
    }
