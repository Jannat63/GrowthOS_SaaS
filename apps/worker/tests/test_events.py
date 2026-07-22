import json
import pytest
from app.events import publish_event, WS_CHANNEL

pytestmark = pytest.mark.asyncio


class FakeRedis:
    def __init__(self):
        self.published: list[tuple[str, str]] = []

    async def publish(self, channel: str, payload: str) -> None:
        self.published.append((channel, payload))


class BrokenRedis:
    async def publish(self, channel: str, payload: str) -> None:
        raise RuntimeError("redis down")


async def test_publish_event_sends_envelope():
    redis = FakeRedis()
    await publish_event(redis, "ws-1", {"type": "job:complete", "jobId": "j-1", "workspaceId": "ws-1"})

    assert len(redis.published) == 1
    channel, payload = redis.published[0]
    assert channel == WS_CHANNEL
    assert json.loads(payload) == {
        "workspaceId": "ws-1",
        "event": {"type": "job:complete", "jobId": "j-1", "workspaceId": "ws-1"},
    }


async def test_publish_event_swallows_errors():
    # Best-effort: a bus failure must never propagate into the job that emitted it.
    await publish_event(BrokenRedis(), "ws-1", {"type": "job:complete"})
