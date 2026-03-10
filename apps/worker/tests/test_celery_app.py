import os
import app.celery_app as celery_app


def test_celery_app_configured():
    assert celery_app.app.main == "photoprune_worker"
    assert celery_app.broker_url == os.getenv("REDIS_URL", "redis://redis:6379/0")
    assert celery_app.backend_url == os.getenv("REDIS_URL", "redis://redis:6379/0")
