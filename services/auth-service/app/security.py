import os
import jwt
import hashlib
from datetime import datetime, timedelta, timezone
from passlib.hash import bcrypt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days


def _bcrypt_input_from_password(password: str) -> str:
    """Produce a stable short input for bcrypt by SHA-256 hashing the UTF-8 bytes
    and returning the hex digest (64 chars). This avoids bcrypt's 72-byte limit.
    """
    if isinstance(password, bytes):
        password = password.decode("utf-8", errors="ignore")
    pw_bytes = password.encode("utf-8", errors="ignore")
    digest = hashlib.sha256(pw_bytes).hexdigest()
    return digest


def hash_password(password: str) -> str:
    digest = _bcrypt_input_from_password(password)
    return bcrypt.hash(digest)


def verify_password(password: str, password_hash: str) -> bool:
    digest = _bcrypt_input_from_password(password)
    return bcrypt.verify(digest, password_hash)


def create_access_token(user_id: str, workspace_id: str) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    payload = {"sub": user_id, "workspace_id": workspace_id, "exp": expires_at}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
