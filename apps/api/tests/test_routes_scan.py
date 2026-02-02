from __future__ import annotations

from fastapi.testclient import TestClient

from app.core import config
from app.main import create_app


def test_scan_rejects_disallowed_download_host_returns_422(monkeypatch):
    monkeypatch.setenv("SCAN_ALLOWED_DOWNLOAD_HOSTS", "photos.google.com")
    config.get_settings.cache_clear()
    try:
        client = TestClient(create_app())
        payload = {
            "photoItems": [
                {
                    "id": "photo-1",
                    "createTime": "2024-01-01T00:00:00Z",
                    "downloadUrl": "https://example.com/file.jpg",
                }
            ]
        }

        response = client.post("/api/scan", json=payload)

        assert response.status_code == 422
        assert "not allowed" in response.json()["detail"]
    finally:
        config.get_settings.cache_clear()
