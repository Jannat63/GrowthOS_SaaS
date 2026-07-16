import pytest
import app.jobs as jobs_mod


# asyncpg pools are bound to the event loop they were created on. pytest-asyncio gives each test
# its own loop, so close + reset the cached pool after every test to avoid cross-loop reuse.
# Production (FastAPI, single loop) keeps the singleton — this only affects tests.
@pytest.fixture(autouse=True)
async def _reset_pool():
    yield
    if jobs_mod._pool is not None:
        await jobs_mod._pool.close()
        jobs_mod._pool = None
