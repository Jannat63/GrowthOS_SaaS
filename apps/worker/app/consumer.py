import asyncio
import logging
import redis.asyncio as aioredis
from app.config import settings
from app.envelope import JobEnvelope
from app.dispatch import dispatch
from app.events import publish_event
from app.jobs import get_pool, mark_processing, mark_complete, mark_failed

log = logging.getLogger("worker.consumer")


async def process_one(pool, raw: str, redis=None) -> None:
    try:
        env = JobEnvelope.model_validate_json(raw)
    except Exception:
        log.exception("dropping malformed envelope: %s", raw)
        return

    await mark_processing(pool, env.job_id)
    try:
        result = await dispatch(env.type, env.payload, env.job_id, env.workspace_id)
        await mark_complete(pool, env.job_id, result)
        if redis is not None:
            # Real-time: tell the workspace's clients this job finished so they can refetch.
            await publish_event(
                redis,
                env.workspace_id,
                {"type": "job:complete", "jobId": env.job_id, "workspaceId": env.workspace_id},
            )
    except Exception as exc:  # one bad job never kills the loop
        log.exception("job %s failed", env.job_id)
        await mark_failed(pool, env.job_id, str(exc))


async def run_consumer(stop_event: asyncio.Event) -> None:
    pool = await get_pool()
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    log.info("consumer started; draining %s", settings.queue_key)
    while not stop_event.is_set():
        popped = await redis.blpop([settings.queue_key], timeout=1)
        if popped is None:
            continue
        _key, raw = popped
        await process_one(pool, raw, redis)
    await redis.aclose()
