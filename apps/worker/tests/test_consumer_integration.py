import json
import pytest
from app.jobs import get_pool
from app.consumer import process_one

pytestmark = pytest.mark.asyncio


async def test_process_one_completes_job():
    pool = await get_pool()
    job_id = await pool.fetchval(
        "INSERT INTO background_jobs (workspace_id, type) VALUES ('test-ws', 'echo') RETURNING id"
    )
    try:
        env = {"v": 1, "jobId": str(job_id), "workspaceId": "test-ws", "type": "echo", "payload": {"n": 5}}
        await process_one(pool, json.dumps(env))
        row = await pool.fetchrow("SELECT status, result FROM background_jobs WHERE id=$1", job_id)
        assert row["status"] == "complete"
        assert json.loads(row["result"]) == {"echoed": {"n": 5}}
    finally:
        await pool.execute("DELETE FROM background_jobs WHERE id=$1", job_id)


async def test_process_one_unknown_type_fails_job():
    pool = await get_pool()
    job_id = await pool.fetchval(
        "INSERT INTO background_jobs (workspace_id, type) VALUES ('test-ws', 'nope') RETURNING id"
    )
    try:
        env = {"v": 1, "jobId": str(job_id), "workspaceId": "test-ws", "type": "nope", "payload": {}}
        await process_one(pool, json.dumps(env))
        row = await pool.fetchrow("SELECT status, error FROM background_jobs WHERE id=$1", job_id)
        assert row["status"] == "failed"
        assert "no handler registered" in row["error"]
    finally:
        await pool.execute("DELETE FROM background_jobs WHERE id=$1", job_id)
