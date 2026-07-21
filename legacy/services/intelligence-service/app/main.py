import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.db import check_connection

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app = FastAPI(title="GrowthOS — Intelligence Service", version="0.1.0")
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
    return response

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "intelligence-service", "database_connected": check_connection()}
