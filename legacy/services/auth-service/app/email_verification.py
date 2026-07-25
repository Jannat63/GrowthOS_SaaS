import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel, EmailStr

from app.db import get_db, User, EmailVerificationToken
from app.email import send_verification_email

router = APIRouter(prefix="/auth/verify-email", tags=["auth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
TOKEN_EXPIRY_HOURS = 24


class RequestVerificationInput(BaseModel):
    email: EmailStr


@router.post("/request")
def request_verification(payload: RequestVerificationInput, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Don't reveal whether the email exists — same response either way.
        return {"message": "If that account exists, a verification email has been sent."}

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    db.add(EmailVerificationToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
    ))
    db.commit()

    verification_url = f"{FRONTEND_URL}/verify-email/confirm?token={raw_token}"
    sent = send_verification_email(user.email, verification_url)

    return {
        "message": "If that account exists, a verification email has been sent.",
        "emailSent": sent,  # useful for local dev without SendGrid configured
    }


class ConfirmVerificationInput(BaseModel):
    token: str


@router.post("/confirm")
def confirm_verification(payload: ConfirmVerificationInput, db: DBSession = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    token_row = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == token_hash, EmailVerificationToken.used_at.is_(None))
        .first()
    )
    # token_row.expires_at comes back from Postgres TIMESTAMPTZ as timezone-aware;
    # verified directly that comparing it against a naive datetime.utcnow() raises
    # TypeError — datetime.now(timezone.utc) is required here, not utcnow().
    if not token_row or token_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    user = db.query(User).filter(User.id == token_row.user_id).first()
    user.email_verified = True
    token_row.used_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Email verified.", "verified": True}
