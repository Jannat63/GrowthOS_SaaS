"""
Scheduled task skeleton — Section 7.5: the engine runs every 4 hours.
Requires a running Redis broker (see docker-compose.yml) to actually execute.
Not currently invoked by the Dockerfile (which only runs uvicorn) — this is
prepared for when the scheduler is wired up for real, at which point it
needs `celery -A app.celery_app worker --beat` run as an additional process.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Same fix as the API gateway: "localhost" only works when Redis and this
# service are on the same host. Inside Docker Compose, Redis is a separate
# container reached via its service name.
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("intelligence", broker=REDIS_URL)

celery_app.conf.beat_schedule = {
    "run-cross-channel-analysis-every-4-hours": {
        "task": "app.celery_app.run_analysis",
        "schedule": crontab(minute=0, hour="*/4"),
    },
    "generate-weekly-report-sunday-evening": {
        "task": "app.celery_app.generate_weekly_report",
        "schedule": crontab(hour=20, minute=0, day_of_week=0),
    },
}

@celery_app.task
def run_analysis():
    # TODO: fetch latest data from seo-service / google-ads-service / meta-ads-service,
    # call generate_recommendations(), persist to Postgres `recommendations` table.
    pass

@celery_app.task
def generate_weekly_report():
    # TODO: call Claude API to write the weekly Growth Intelligence Report (Section 7.5).
    pass
