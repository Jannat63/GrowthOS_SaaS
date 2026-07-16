import json
import pytest
from app.jobs import get_pool
from app.consumer import process_one

pytestmark = pytest.mark.asyncio


async def test_onboarding_analyze_writes_strategy_and_step():
    pool = await get_pool()
    ws = "test-onb-handler"
    job_id = await pool.fetchval(
        "INSERT INTO background_jobs (workspace_id, type) VALUES ($1,'onboarding_analyze') RETURNING id", ws
    )
    await pool.execute(
        "INSERT INTO workspaces (id, name, slug, created_at) VALUES ($1,'T',$1,now()) ON CONFLICT (id) DO NOTHING",
        ws,
    )
    try:
        env = {
            "v": 1, "jobId": str(job_id), "workspaceId": ws, "type": "onboarding_analyze",
            "payload": {"websiteUrl": "https://x.com", "businessCategory": "saas", "monthlyAdBudget": 3000},
        }
        await process_one(pool, json.dumps(env))
        job = await pool.fetchrow("SELECT status FROM background_jobs WHERE id=$1", job_id)
        assert job["status"] == "complete"
        an = await pool.fetchrow("SELECT strategy FROM onboarding_analyses WHERE workspace_id=$1", ws)
        assert json.loads(an["strategy"])["channelMix"]
        step = await pool.fetchval("SELECT onboarding_step FROM workspaces WHERE id=$1", ws)
        assert step == "review"
    finally:
        await pool.execute("DELETE FROM onboarding_analyses WHERE workspace_id=$1", ws)
        await pool.execute("DELETE FROM background_jobs WHERE id=$1", job_id)
        await pool.execute("DELETE FROM workspaces WHERE id=$1", ws)
