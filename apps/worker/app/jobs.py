import json
from typing import Any, Optional
from urllib.parse import urlsplit, urlunsplit
import asyncpg
from app.config import settings

_pool: Optional[asyncpg.Pool] = None


def _clean_dsn(url: str) -> str:
    # asyncpg doesn't understand libpq query params (sslmode, channel_binding) — drop them and
    # pass TLS via the ssl=... arg instead. Neon requires TLS.
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=_clean_dsn(settings.database_url), ssl=True, min_size=1, max_size=4
        )
    return _pool


async def mark_processing(pool: asyncpg.Pool, job_id: str) -> None:
    await pool.execute(
        "UPDATE background_jobs SET status='processing', started_at=now() WHERE id=$1", job_id
    )


async def mark_complete(pool: asyncpg.Pool, job_id: str, result: dict[str, Any]) -> None:
    await pool.execute(
        "UPDATE background_jobs SET status='complete', result=$2::jsonb, completed_at=now() WHERE id=$1",
        job_id, json.dumps(result),
    )


async def mark_failed(pool: asyncpg.Pool, job_id: str, error: str) -> None:
    await pool.execute(
        "UPDATE background_jobs SET status='failed', error=$2, completed_at=now() WHERE id=$1",
        job_id, error,
    )


async def mark_progress(pool: asyncpg.Pool, job_id: str, progress: int) -> None:
    await pool.execute("UPDATE background_jobs SET progress=$2 WHERE id=$1", job_id, progress)


async def set_onboarding_step(pool: asyncpg.Pool, workspace_id: str, step: str) -> None:
    await pool.execute("UPDATE workspaces SET onboarding_step=$2 WHERE id=$1", workspace_id, step)


async def upsert_onboarding_analysis(
    pool: asyncpg.Pool, workspace_id: str, crawl: dict, strategy: dict
) -> None:
    await pool.execute(
        """
        INSERT INTO onboarding_analyses (workspace_id, crawl_summary, strategy, generated_at, updated_at)
        VALUES ($1, $2::jsonb, $3::jsonb, now(), now())
        ON CONFLICT (workspace_id)
        DO UPDATE SET crawl_summary=EXCLUDED.crawl_summary, strategy=EXCLUDED.strategy,
                      generated_at=now(), updated_at=now()
        """,
        workspace_id, json.dumps(crawl), json.dumps(strategy),
    )
