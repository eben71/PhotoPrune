from __future__ import annotations

from urllib.error import HTTPError

from fastapi.testclient import TestClient

from app.core import config
from app.engine import downloads
from app.engine.schemas import CostEstimate, ScanResult, StageMetrics
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
        detail = response.json()["detail"]
        assert "not allowed" in detail
        assert "downloadUrl host" in detail
    finally:
        config.get_settings.cache_clear()


def test_scan_accepts_photo_items_alias(monkeypatch):
    config.get_settings.cache_clear()

    def fake_run_scan(*_, **__):
        return ScanResult(
            runId="run-1",
            inputCount=1,
            stageMetrics=StageMetrics(timingsMs={}, counts={}),
            costEstimate=CostEstimate(
                totalCost=0.0,
                downloadCost=0.0,
                hashCost=0.0,
                comparisonCost=0.0,
            ),
            groupsExact=[],
            groupsVerySimilar=[],
            groupsPossiblySimilar=[],
        )

    monkeypatch.setattr("app.api.routes.run_scan", fake_run_scan)
    try:
        client = TestClient(create_app())
        payload = {
            "photoItems": [
                {
                    "id": "x",
                    "createTime": "2025-01-01T00:00:00Z",
                }
            ]
        }

        response = client.post("/api/scan", json=payload)

        assert response.status_code == 200
    finally:
        config.get_settings.cache_clear()


def test_scan_accepts_picker_payload_alias(monkeypatch):
    config.get_settings.cache_clear()

    def fake_run_scan(*_, **__):
        return ScanResult(
            runId="run-2",
            inputCount=0,
            stageMetrics=StageMetrics(timingsMs={}, counts={}),
            costEstimate=CostEstimate(
                totalCost=0.0,
                downloadCost=0.0,
                hashCost=0.0,
                comparisonCost=0.0,
            ),
            groupsExact=[],
            groupsVerySimilar=[],
            groupsPossiblySimilar=[],
        )

    monkeypatch.setattr("app.api.routes.run_scan", fake_run_scan)
    try:
        client = TestClient(create_app())
        payload = {
            "pickerPayload": {
                "mediaItems": [
                    {
                        "mediaFile": {
                            "id": "picker-1",
                            "createTime": "2025-01-01T00:00:00Z",
                        }
                    }
                ]
            }
        }

        response = client.post("/api/scan", json=payload)

        assert response.status_code == 200
    finally:
        config.get_settings.cache_clear()


def test_openapi_scan_request_uses_external_aliases():
    config.get_settings.cache_clear()
    try:
        client = TestClient(create_app())
        response = client.get("/openapi.json")

        assert response.status_code == 200
        body = response.json()
        schema = body["components"]["schemas"]["ScanRequest"]
        properties = schema["properties"]
        assert "photoItems" in properties
        assert "pickerPayload" in properties
        assert "consentConfirmed" in properties
    finally:
        config.get_settings.cache_clear()


def test_scan_rejects_host_docker_internal_with_guidance(monkeypatch):
    config.get_settings.cache_clear()
    try:
        client = TestClient(create_app())
        payload = {
            "photoItems": [
                {
                    "id": "photo-1",
                    "createTime": "2024-01-01T00:00:00Z",
                    "downloadUrl": "https://host.docker.internal/file.jpg",
                }
            ]
        }

        response = client.post("/api/scan", json=payload)

        assert response.status_code == 422
        detail = response.json()["detail"]
        assert "host.docker.internal" in detail
        assert "https://host.docker.internal" not in detail
    finally:
        config.get_settings.cache_clear()


def test_scan_network_failure_returns_422_without_url(monkeypatch):
    monkeypatch.setenv("SCAN_ALLOWED_DOWNLOAD_HOSTS", "photos.google.com")
    config.get_settings.cache_clear()

    def fake_urlopen(*_, **__):
        raise HTTPError(
            url="https://photos.google.com/file.jpg",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

    monkeypatch.setattr(downloads.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(downloads, "_reject_private_addresses", lambda _: None)
    try:
        client = TestClient(create_app())
        payload = {
            "photoItems": [
                {
                    "id": "photo-1",
                    "createTime": "2024-01-01T00:00:00Z",
                    "downloadUrl": "https://photos.google.com/file.jpg",
                }
            ]
        }

        response = client.post("/api/scan", json=payload)

        assert response.status_code == 422
        detail = response.json()["detail"]
        expected_detail = (
            "Download failed for host 'photos.google.com' with status 404. "
            "Regenerate fixtures without obfuscating downloadUrl host."
        )
        assert detail == expected_detail
        assert "https://photos.google.com/file.jpg" not in detail
    finally:
        config.get_settings.cache_clear()
