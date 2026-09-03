from typing import Any, Awaitable, Callable
from app.handlers import echo, onboarding, site_audit

Handler = Callable[..., Awaitable[dict[str, Any]]]


class UnknownJobType(Exception):
    pass


# Each handler is called as handler(payload, job_id, workspace_id).
async def _echo(payload: dict[str, Any], job_id: str, workspace_id: str) -> dict[str, Any]:
    return await echo.handle(payload)


HANDLERS: dict[str, Handler] = {
    "echo": _echo,
    "onboarding_analyze": onboarding.handle,
    "site_audit": site_audit.handle,
}


async def dispatch(job_type: str, payload: dict[str, Any], job_id: str, workspace_id: str) -> dict[str, Any]:
    handler = HANDLERS.get(job_type)
    if handler is None:
        raise UnknownJobType(f"no handler registered for '{job_type}'")
    return await handler(payload, job_id, workspace_id)
