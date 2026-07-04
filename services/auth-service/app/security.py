import os
import jwt
from datetime import datetime, timedelta, timezone
from passlib.hash import bcrypt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days


def _normalize_for_bcrypt(password: str) -> str:
    """Ensure the password is a text string and truncate its UTF-8 encoded
    form to bcrypt's 72-byte limit. Returns a str that can be passed to passlib.
    """
    if isinstance(password, bytes):
        password = password.decode("utf-8", errors="ignore")
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        pw_bytes = pw_bytes[:72]
        # decode back to text; ignore partial character errors
        password = pw_bytes.decode("utf-8", errors="ignore")
    return password


def hash_password(password: str) -> str:
    pw = _normalize_for_bcrypt(password)
    return bcrypt.hash(pw)


def verify_password(password: str, password_hash: str) -> bool:
    pw = _normalize_for_bcrypt(password)
    return bcrypt.verify(pw, password_hash)


def create_access_token(user_id: str, workspace_id: str) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    payload = {"sub": user_id, "workspace_id": workspace_id, "exp": expires_at}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
