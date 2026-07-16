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
