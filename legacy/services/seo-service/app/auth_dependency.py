import os
import jwt
from fastapi import Header, HTTPException, Depends

from app.db import SessionLocal

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"


def get_workspace_id_from_token(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    workspace_id = payload.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=401, detail="Token missing workspace context.")
    return workspace_id


def get_db(workspace_id: str = Depends(get_workspace_id_from_token)):
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
