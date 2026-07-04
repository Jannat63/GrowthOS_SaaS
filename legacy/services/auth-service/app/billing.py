"""
Stripe billing — checkout session creation + webhook handling.

SETUP REQUIRED before this works:
1. Create a Stripe account (dashboard.stripe.com), get your API keys (test mode first).
2. Create 3 Products with recurring Prices matching the blueprint's plans
   (Starter $79/mo, Growth $199/mo, Scale $399/mo) — note each Price ID.
3. Set env vars on auth-service: STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER,
   STRIPE_PRICE_GROWTH, STRIPE_PRICE_SCALE
4. Create a webhook endpoint in the Stripe dashboard pointing to
   <your gateway>/api/auth/billing/webhook, subscribe to at least:
   checkout.session.completed, customer.subscription.updated,
   customer.subscription.deleted. Set STRIPE_WEBHOOK_SECRET from that.

Until STRIPE_SECRET_KEY is set, /billing/checkout returns a clear 501
instead of crashing.
"""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from app.db import get_db, Subscription, Workspace
from app.security import decode_access_token

router = APIRouter(prefix="/billing", tags=["billing"])

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

PLAN_PRICE_ENV = {
    "starter": "STRIPE_PRICE_STARTER",
    "growth": "STRIPE_PRICE_GROWTH",
    "scale": "STRIPE_PRICE_SCALE",
}


def get_workspace_id_from_token(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    workspace_id = payload.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=401, detail="Token missing workspace context.")
    return workspace_id


class CheckoutRequest(BaseModel):
    plan: str  # "starter" | "growth" | "scale"


@router.post("/checkout")
def create_checkout_session(
    payload: CheckoutRequest,
    workspace_id: str = Depends(get_workspace_id_from_token),
    db: DBSession = Depends(get_db),
):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Stripe not configured — set STRIPE_SECRET_KEY on auth-service.")
    if payload.plan not in PLAN_PRICE_ENV:
        raise HTTPException(status_code=400, detail=f"Unknown plan '{payload.plan}'.")

    price_id = os.getenv(PLAN_PRICE_ENV[payload.plan])
    if not price_id:
        raise HTTPException(status_code=501, detail=f"No Stripe Price ID configured for plan '{payload.plan}'.")

    import stripe
    stripe.api_key = STRIPE_SECRET_KEY

    workspace = db.query(Workspace).filter(Workspace.id == uuid.UUID(workspace_id)).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{FRONTEND_URL}/workspace-billing?checkout=success",
        cancel_url=f"{FRONTEND_URL}/workspace-billing?checkout=cancelled",
        client_reference_id=workspace_id,
        metadata={"workspace_id": workspace_id, "plan": payload.plan},
    )
    return {"checkoutUrl": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: DBSession = Depends(get_db)):
    if not STRIPE_SECRET_KEY or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=501, detail="Stripe webhook not configured.")

    import stripe
    stripe.api_key = STRIPE_SECRET_KEY

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature.")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        workspace_id = session["metadata"]["workspace_id"]
        plan = session["metadata"]["plan"]

        existing = db.query(Subscription).filter(Subscription.workspace_id == uuid.UUID(workspace_id)).first()
        if existing:
            existing.plan = plan
            existing.status = "active"
            existing.stripe_customer_id = session.get("customer")
            existing.stripe_subscription_id = session.get("subscription")
        else:
            db.add(Subscription(
                id=uuid.uuid4(),
                workspace_id=uuid.UUID(workspace_id),
                plan=plan,
                status="active",
                stripe_customer_id=session.get("customer"),
                stripe_subscription_id=session.get("subscription"),
            ))
        db.commit()

    elif event["type"] == "customer.subscription.deleted":
        stripe_sub_id = event["data"]["object"]["id"]
        sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == stripe_sub_id).first()
        if sub:
            sub.status = "cancelled"
            db.commit()

    return {"received": True}


@router.get("/current")
def get_current_subscription(
    workspace_id: str = Depends(get_workspace_id_from_token),
    db: DBSession = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.workspace_id == uuid.UUID(workspace_id)).first()
    if not sub:
        return {"plan": "starter", "status": "trialing"}
    return {"plan": sub.plan, "status": sub.status}
