from typing import Any, Literal
from pydantic import BaseModel, Field


class JobEnvelope(BaseModel):
    # Mirrors the TS JobEnvelope. camelCase on the wire -> snake_case in Python via aliases.
    v: Literal[1]
    job_id: str = Field(alias="jobId")
    workspace_id: str = Field(alias="workspaceId")
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)
