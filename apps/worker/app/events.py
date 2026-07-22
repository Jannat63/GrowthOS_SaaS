"""Cross-process real-time event bus (worker side).

Mirrors ``apps/api/src/ws/events.ts``: publish a ``{workspaceId, event}`` envelope onto the
shared Redis ``ws:events`` channel. The Fastify API subscribes and fans each event out to
the workspace's connected WebSocket clients. Best-effort — a publish failure never breaks
the job that emitted it.
"""
import json
import logging
from typing import Any

log = logging.getLogger("worker.events")

WS_CHANNEL = "ws:events"


async def publish_event(redis: Any, workspace_id: str, event: dict[str, Any]) -> None:
    """Publish one real-time event to a workspace. Swallows its own errors."""
    try:
        payload = json.dumps({"workspaceId": workspace_id, "event": event})
        await redis.publish(WS_CHANNEL, payload)
    except Exception:  # never let real-time delivery break a job
        log.warning("failed to publish ws event for workspace %s", workspace_id, exc_info=True)
