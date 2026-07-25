import pytest
from app.dispatch import dispatch, UnknownJobType

pytestmark = pytest.mark.asyncio


async def test_echo_returns_payload():
    result = await dispatch("echo", {"hello": "world"}, "job-1", "ws-1")
    assert result == {"echoed": {"hello": "world"}}


async def test_unknown_type_raises():
    with pytest.raises(UnknownJobType):
        await dispatch("nope", {}, "job-1", "ws-1")
