from fastapi import FastAPI
from app.routes import search_terms

app = FastAPI(title="GrowthOS — Google Ads Service", version="0.1.0")
app.include_router(search_terms.router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "google-ads-service"}
