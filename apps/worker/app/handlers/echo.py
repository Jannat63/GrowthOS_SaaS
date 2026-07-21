from typing import Any


async def handle(payload: dict[str, Any]) -> dict[str, Any]:
    # Dummy job proving the pipe end-to-end. No feature logic (that starts P2.2).
    return {"echoed": payload}
