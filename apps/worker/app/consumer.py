import asyncio
import logging
import redis.asyncio as aioredis
from app.config import settings
from app.envelope import JobEnvelope
from app.dispatch import dispatch
from app.jobs import get_pool, mark_processing, mark_complete, mark_failed

log = logging.getLogger("worker.consumer")


async def process_one(pool, raw: str) -> None:
    try:
        env = JobEnvelope.model_validate_json(raw)
    except Exception:
        log.exception("dropping malformed envelope: %s", raw)
        return

    await mark_processing(pool, env.job_id)
    try:
        result = await dispatch(env.type, env.payload, env.job_id, env.workspace_id)
        await mark_complete(pool, env.job_id, env.workspace_id, result)
    except Exception as exc:  # one bad job never kills the loop
        log.exception("job %s failed", env.job_id)
        await mark_failed(pool, env.job_id, env.workspace_id, str(exc))


async def reclaim_orphans(redis) -> int:
    """Re-queue anything left in the processing list by a previous run.

    A worker that dies mid-job leaves its envelope in the in-flight list. On the next start those
    are pushed back onto the queue so the work resumes rather than vanishing. Safe to run at every
    boot: an empty list is a no-op, and re-processing a job whose side effects already landed is
    bounded by the handlers' own idempotency.
    """
    reclaimed = 0
    while True:
        raw = await redis.rpoplpush(settings.processing_key, settings.queue_key)
        if raw is None:
            return reclaimed
        reclaimed += 1
        log.warning("reclaimed an orphaned job from a previous run")


async def run_consumer(stop_event: asyncio.Event) -> None:
    """Drain the job queue using a reliable-queue pattern.

    The naive version used BLPOP, which removes a job the instant it is read: a crash between that
    read and the job reaching a terminal state destroyed the envelope outright — no acknowledgement,
    no retry, no dead letter. The `background_jobs` row stayed `queued` forever while the client
    polled a job that would never finish. (`enqueue.ts` claimed "a worker crash never loses a job",
    which was true of the database row and false of the work.)

    BLMOVE makes taking a job atomic with recording that it is in flight: the envelope lives in the
    processing list until it completes or fails, and `reclaim_orphans` returns anything stranded
    there when the worker next starts.
    """
    pool = await get_pool()
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)

    reclaimed = await reclaim_orphans(redis)
    if reclaimed:
        log.info("reclaimed %d orphaned job(s) from a previous run", reclaimed)

    log.info("consumer started; draining %s", settings.queue_key)
    while not stop_event.is_set():
        raw = await redis.blmove(
            settings.queue_key, settings.processing_key, timeout=1, src="RIGHT", dest="LEFT"
        )
        if raw is None:
            continue
        try:
            await process_one(pool, raw)
        finally:
            # Remove this exact envelope from the in-flight list whatever happened. `process_one`
            # already records failures as terminal, so leaving it queued would re-run a job that has
            # been reported failed. Only a crash — which skips this — should leave it recoverable.
            await redis.lrem(settings.processing_key, 1, raw)

    await redis.aclose()
