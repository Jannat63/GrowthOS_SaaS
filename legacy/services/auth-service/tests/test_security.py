import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import jwt as pyjwt
import pytest
from app.security import hash_password, verify_password, create_access_token, decode_access_token, JWT_SECRET


def test_password_is_actually_hashed_not_plaintext():
    hashed = hash_password("MySecretPassword123")
    assert hashed != "MySecretPassword123"
    assert hashed.startswith("$2b$")  # bcrypt prefix


def test_verify_correct_password():
    hashed = hash_password("MySecretPassword123")
    assert verify_password("MySecretPassword123", hashed) is True


def test_verify_wrong_password_fails():
    hashed = hash_password("MySecretPassword123")
    assert verify_password("WrongPassword", hashed) is False


def test_same_password_produces_different_hashes():
    # bcrypt salts each hash — verifies we're not using a weak/deterministic scheme
    h1 = hash_password("SamePassword")
    h2 = hash_password("SamePassword")
    assert h1 != h2
    assert verify_password("SamePassword", h1)
    assert verify_password("SamePassword", h2)


def test_access_token_contains_correct_claims():
    token, expires_at = create_access_token("user-123", "workspace-456")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["workspace_id"] == "workspace-456"


def test_access_token_rejects_wrong_secret():
    token, _ = create_access_token("user-123", "workspace-456")
    with pytest.raises(Exception):
        pyjwt.decode(token, "wrong-secret", algorithms=["HS256"])


def test_access_token_rejects_tampered_payload():
    token, _ = create_access_token("user-123", "workspace-456")
    # Tamper with the token by flipping a character in the payload segment
    parts = token.split(".")
    tampered = parts[0] + "." + parts[1][:-2] + "xx" + "." + parts[2]
    with pytest.raises(Exception):
        decode_access_token(tampered)


def test_expired_token_is_rejected():
    # Manually craft an already-expired token using the same secret
    expired_payload = {"sub": "user-123", "workspace_id": "ws-456", "exp": int(time.time()) - 3600}
    expired_token = pyjwt.encode(expired_payload, JWT_SECRET, algorithm="HS256")
    with pytest.raises(Exception):
        decode_access_token(expired_token)
