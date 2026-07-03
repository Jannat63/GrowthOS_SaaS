import hashlib
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel, EmailStr, ConfigDict
from pydantic.alias_generators import to_camel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db import get_db, User, Session as SessionRow, Workspace, WorkspaceMember
from app.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class SignUpRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    full_name: str
    email: EmailStr
    password: str
    workspace_name: str = "My Workspace"


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    token: str
    user_id: str
    workspace_id: str
    full_name: str
    email: str


def _issue_session_and_token(db: DBSession, user_id: uuid.UUID, workspace_id: uuid.UUID) -> str:
    token, expires_at = create_access_token(str(user_id), str(workspace_id))
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    db.add(SessionRow(id=uuid.uuid4(), user_id=user_id, token_hash=token_hash, expires_at=expires_at))
    db.commit()
    return token


@router.post("/sign-up", response_model=AuthResponse)
@limiter.limit("5/hour")
def sign_up(request: Request, req: SignUpRequest, db: DBSession = Depends(get_db)):
    """
    Real signup: hashes the password with bcrypt (never stores plaintext),
    creates a real `users` row, a real `workspaces` row, links them via
    `workspace_members` as owner, and issues a real JWT backed by a
    `sessions` row — matching Section 5.1.1 (multi-workspace) and
    5.4 (OAuth 2.0 / MFA-ready auth requirements).
    """
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(id=uuid.uuid4(), email=req.email, full_name=req.full_name, password_hash=hash_password(req.password))
    db.add(user)

    workspace = Workspace(id=uuid.uuid4(), name=req.workspace_name, type="ecommerce", country="BD")
    db.add(workspace)
    db.flush()  # get IDs assigned before the FK row below

    db.add(WorkspaceMember(id=uuid.uuid4(), workspace_id=workspace.id, user_id=user.id, role="owner", joined_at=datetime.utcnow()))
    db.commit()

    token = _issue_session_and_token(db, user.id, workspace.id)
    return AuthResponse(token=token, user_id=str(user.id), workspace_id=str(workspace.id), full_name=user.full_name, email=user.email)


@router.post("/sign-in", response_model=AuthResponse)
@limiter.limit("10/minute")
def sign_in(request: Request, req: SignInRequest, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    membership = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="No workspace associated with this account.")

    token = _issue_session_and_token(db, user.id, membership.workspace_id)
    return AuthResponse(token=token, user_id=str(user.id), workspace_id=str(membership.workspace_id), full_name=user.full_name, email=user.email)


@router.get("/me")
def me(authorization: str = Header(None), db: DBSession = Depends(get_db)):
    """Validates the JWT and confirms the session is still known to the DB (real revocability check)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    session_row = db.query(SessionRow).filter(SessionRow.token_hash == token_hash).first()
    if not session_row:
        raise HTTPException(status_code=401, detail="Session revoked or not found.")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return {"userId": str(user.id), "email": user.email, "fullName": user.full_name, "workspaceId": payload["workspace_id"]}
