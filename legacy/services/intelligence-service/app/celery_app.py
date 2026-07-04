"""
Scheduled task skeleton — Section 7.5: the engine runs every 4 hours.
Requires a running Redis broker (see docker-compose.yml) to actually execute.
"""
from celery import Celery
from celery.schedules import crontab

celery_app = Celery("intelligence", broker="redis://localhost:6379/0")

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
