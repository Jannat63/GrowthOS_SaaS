import os
import jwt
from datetime import datetime, timedelta
from passlib.hash import bcrypt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.verify(password, password_hash)


def create_access_token(user_id: str, workspace_id: str) -> tuple[str, datetime]:
    expires_at = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    payload = {"sub": user_id, "workspace_id": workspace_id, "exp": expires_at}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
