import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routes import router
from app.google_oauth import router as google_router
from app.db import check_connection

# Rate limiter: keyed by client IP. Applied per-endpoint in routes.py —
# sign-in and sign-up get tight limits since they're brute-force targets.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="GrowthOS — Auth Service", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: only the frontend origin may call this service directly. In
# production behind api-gateway this is a second layer of defense, not
# the only one — the gateway should also restrict origins.
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(router)
app.include_router(google_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "auth-service", "database_connected": check_connection()}
