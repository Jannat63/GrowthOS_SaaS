import pytest
from pydantic import ValidationError
from app.envelope import JobEnvelope


def test_parses_valid_envelope():
    env = JobEnvelope.model_validate_json(
        '{"v":1,"jobId":"j1","workspaceId":"w1","type":"echo","payload":{"a":1}}'
    )
    assert env.job_id == "j1"
    assert env.type == "echo"
    assert env.payload == {"a": 1}


def test_rejects_wrong_version():
    with pytest.raises(ValidationError):
        JobEnvelope.model_validate_json(
            '{"v":2,"jobId":"j1","workspaceId":"w1","type":"echo","payload":{}}'
        )
