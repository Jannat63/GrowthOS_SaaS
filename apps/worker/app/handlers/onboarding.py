from typing import Any
from app.fixtures.crawl import stub_crawl
from app.strategy import generate_strategy
from app.jobs import get_pool, mark_progress, upsert_onboarding_analysis, set_onboarding_step


async def handle(payload: dict[str, Any], job_id: str, workspace_id: str) -> dict[str, Any]:
    pool = await get_pool()
    crawl = stub_crawl(payload.get("websiteUrl", ""))
    await mark_progress(pool, job_id, 40)
    strategy = generate_strategy(payload.get("businessCategory", "other"), payload.get("monthlyAdBudget"))
    await mark_progress(pool, job_id, 80)
    await upsert_onboarding_analysis(pool, workspace_id, crawl, strategy)
    await set_onboarding_step(pool, workspace_id, "review")
    return {"strategySummary": strategy["summary"], "pagesCrawled": crawl["pagesCrawled"]}
