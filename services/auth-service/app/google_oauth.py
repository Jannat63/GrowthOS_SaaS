"""
Google OAuth sign-in — standard authorization code flow.

SETUP REQUIRED before this works:
1. Go to console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (type: Web application)
3. Add authorized redirect URI: <your API gateway URL>/api/auth/google/callback
   (for local dev: http://localhost:8000/api/auth/google/callback)
4. Set env vars on auth-service: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
5. Set FRONTEND_URL env var (where to redirect back to after login, e.g. http://localhost:3000)

Until those env vars are set, /auth/google/login returns a clear error instead of
crashing — so the rest of the app keeps working without Google OAuth configured.
"""
import os
import uuid
from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DBSession

from app.db import SessionLocal, User, Workspace, WorkspaceMember
from app.security import create_access_token
from app.routes import _issue_session_and_token

router = APIRouter(prefix="/auth/google", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/login")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=501,
            detail="Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on auth-service.",
        )
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/callback")
def google_callback(code: str):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured on this server.")

    # Exchange the authorization code for tokens
    token_res = httpx.post(GOOGLE_TOKEN_URL, data={
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    })
    if token_res.status_code != 200:
        raise HTTPException(status_code=401, detail="Google token exchange failed.")
    access_token = token_res.json()["access_token"]

    # Fetch the user's Google profile
    profile_res = httpx.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
    profile = profile_res.json()
    email = profile["email"]
    full_name = profile.get("name", email.split("@")[0])

    db: DBSession = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # First time signing in with Google — create the account + workspace,
            # same as a normal sign-up, just without a password (password_hash stays null;
            # sign_in() already rejects login attempts with no password_hash set).
            user = User(id=uuid.uuid4(), email=email, full_name=full_name, password_hash=None)
            db.add(user)
            workspace = Workspace(id=uuid.uuid4(), name=f"{full_name}'s Workspace", type="ecommerce")
            db.add(workspace)
            db.flush()
            db.add(WorkspaceMember(id=uuid.uuid4(), workspace_id=workspace.id, user_id=user.id, role="owner", joined_at=datetime.utcnow()))
            db.commit()
            workspace_id = workspace.id
        else:
            membership = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).first()
            workspace_id = membership.workspace_id

        jwt_token = _issue_session_and_token(db, user.id, workspace_id)
    finally:
        db.close()

    # Redirect back to the frontend with the token as a query param — the frontend's
    # /auth/google/complete page (to be added) reads it and calls storeSession().
    return RedirectResponse(f"{FRONTEND_URL}/auth/google/complete?token={jwt_token}")
