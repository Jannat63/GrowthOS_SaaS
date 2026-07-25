import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import jwt
from app.routes.features import _try_get_workspace_id
from app.auth_dependency import JWT_SECRET, JWT_ALGORITHM


def _make_token(workspace_id="test-workspace-123"):
    return jwt.encode({"sub": "user-1", "workspace_id": workspace_id}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def test_extracts_workspace_id_from_valid_token():
    token = _make_token("workspace-abc")
    result = _try_get_workspace_id(f"Bearer {token}")
    assert result == "workspace-abc"


def test_returns_none_for_missing_authorization():
    assert _try_get_workspace_id(None) is None


def test_returns_none_for_malformed_header():
    assert _try_get_workspace_id("NotBearer sometoken") is None


def test_returns_none_for_invalid_token():
    assert _try_get_workspace_id("Bearer garbage.invalid.token") is None


def test_returns_none_for_token_signed_with_wrong_secret():
    bad_token = jwt.encode({"sub": "user-1", "workspace_id": "ws-1"}, "wrong-secret", algorithm=JWT_ALGORITHM)
    assert _try_get_workspace_id(f"Bearer {bad_token}") is None
