from fastapi import FastAPI
from app.routes import router
from app.db import check_connection

app = FastAPI(title="GrowthOS — Intelligence Service", version="0.1.0")
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "intelligence-service", "database_connected": check_connection()}
