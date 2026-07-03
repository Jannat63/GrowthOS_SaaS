from fastapi import FastAPI
from app.routes import keywords

app = FastAPI(title="GrowthOS — SEO Service", version="0.1.0")
app.include_router(keywords.router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "seo-service"}
