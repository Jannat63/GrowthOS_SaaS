from typing import Any, Awaitable, Callable
from app.handlers import echo

Handler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


class UnknownJobType(Exception):
    pass


HANDLERS: dict[str, Handler] = {
    "echo": echo.handle,
}


async def dispatch(job_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    handler = HANDLERS.get(job_type)
    if handler is None:
        raise UnknownJobType(f"no handler registered for '{job_type}'")
    return await handler(payload)
