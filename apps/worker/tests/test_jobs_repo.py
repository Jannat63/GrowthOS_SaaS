import json
import pytest
from app.jobs import get_pool, mark_processing, mark_complete, mark_failed

pytestmark = pytest.mark.asyncio


async def _make_job(pool) -> str:
    return await pool.fetchval(
        "INSERT INTO background_jobs (workspace_id, type) VALUES ('test-ws', 'echo') RETURNING id"
    )


async def test_lifecycle_complete():
    pool = await get_pool()
    job_id = await _make_job(pool)
    try:
        await mark_processing(pool, job_id)
        row = await pool.fetchrow("SELECT status, started_at FROM background_jobs WHERE id = $1", job_id)
        assert row["status"] == "processing" and row["started_at"] is not None

        await mark_complete(pool, job_id, "test-ws", {"echoed": True})
        row = await pool.fetchrow("SELECT status, result, completed_at FROM background_jobs WHERE id = $1", job_id)
        assert row["status"] == "complete"
        assert json.loads(row["result"]) == {"echoed": True}
        assert row["completed_at"] is not None
    finally:
        await pool.execute("DELETE FROM background_jobs WHERE id = $1", job_id)


async def test_lifecycle_failed():
    pool = await get_pool()
    job_id = await _make_job(pool)
    try:
        await mark_failed(pool, job_id, "test-ws", "boom")
        row = await pool.fetchrow("SELECT status, error FROM background_jobs WHERE id = $1", job_id)
        assert row["status"] == "failed" and row["error"] == "boom"
    finally:
        await pool.execute("DELETE FROM background_jobs WHERE id = $1", job_id)
