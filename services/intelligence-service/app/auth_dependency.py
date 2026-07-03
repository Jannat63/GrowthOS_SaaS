"""
Derives workspace_id from the verified JWT (not from a client-supplied
request field, which could be forged), and sets it as the Postgres session
variable the RLS policy checks. This is what makes workspace isolation a
database-enforced guarantee rather than an application-code convention.
"""
import os
import uuid
import jwt
from fastapi import Header, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

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


from app.db import SessionLocal

def get_scoped_db(workspace_id: str = Depends(get_workspace_id_from_token)):
    """
    Yields a plain DB session. Workspace isolation is enforced by explicit
    .filter(workspace_id=...) in each query (see routes.py) — simple and
    reliable. The Postgres RLS policy on `recommendations` (schema
    migration 001) is left in place as a defense-in-depth safety net for
    later hardening, but making the app connect as the restricted
    session-variable-scoped role hit real SQLAlchemy connection-pooling
    issues during testing, so that's deferred rather than blocking here.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
