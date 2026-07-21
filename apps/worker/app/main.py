import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.consumer import run_consumer

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    stop = asyncio.Event()
    task = asyncio.create_task(run_consumer(stop))
    yield
    stop.set()
    await task


app = FastAPI(title="GrowthOS Worker", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "worker"}
