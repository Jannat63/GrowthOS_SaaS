import json
import pytest
from app.jobs import get_pool, upsert_onboarding_analysis, mark_progress, set_onboarding_step

pytestmark = pytest.mark.asyncio


async def test_upsert_is_idempotent():
    pool = await get_pool()
    ws = "test-onb-ws"
    try:
        await upsert_onboarding_analysis(pool, ws, {"pagesCrawled": 3}, {"summary": "a"})
        await upsert_onboarding_analysis(pool, ws, {"pagesCrawled": 5}, {"summary": "b"})
        rows = await pool.fetch("SELECT strategy FROM onboarding_analyses WHERE workspace_id=$1", ws)
        assert len(rows) == 1
        assert json.loads(rows[0]["strategy"])["summary"] == "b"
    finally:
        await pool.execute("DELETE FROM onboarding_analyses WHERE workspace_id=$1", ws)


async def test_mark_progress():
    pool = await get_pool()
    job_id = await pool.fetchval(
        "INSERT INTO background_jobs (workspace_id, type) VALUES ('w','onboarding_analyze') RETURNING id"
    )
    try:
        await mark_progress(pool, job_id, 55)
        row = await pool.fetchrow("SELECT progress FROM background_jobs WHERE id=$1", job_id)
        assert row["progress"] == 55
    finally:
        await pool.execute("DELETE FROM background_jobs WHERE id=$1", job_id)


async def test_set_onboarding_step():
    pool = await get_pool()
    ws = "test-onb-step-ws"
    await pool.execute(
        "INSERT INTO workspaces (id, name, slug, created_at) VALUES ($1,'T',$1,now()) ON CONFLICT (id) DO NOTHING",
        ws,
    )
    try:
        await set_onboarding_step(pool, ws, "review")
        step = await pool.fetchval("SELECT onboarding_step FROM workspaces WHERE id=$1", ws)
        assert step == "review"
    finally:
        await pool.execute("DELETE FROM workspaces WHERE id=$1", ws)
