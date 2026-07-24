from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.core import config
from app.core.config import Settings
from app.core.security import AdmissionError
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
        assert detail["category"] == "download_host"
        assert "not allowed" in detail["message"]
        assert "correlationId" in detail
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


def test_scan_preparation_uses_the_validated_app_settings(monkeypatch):
    invoked = False

    def fail_if_called(*_args, **_kwargs):
        nonlocal invoked
        invoked = True

    monkeypatch.setattr("app.api.routes.run_scan", fail_if_called)
    client = TestClient(
        create_app(
            Settings(
                environment="production",
                scan_allowed_download_hosts=["googleusercontent.com"],
                scan_max_photos=1,
            )
        )
    )
    response = client.post(
        "/api/scan",
        json={
            "photoItems": [
                {"id": "one", "createTime": "2025-01-01T00:00:00Z"},
                {"id": "two", "createTime": "2025-01-01T00:00:01Z"},
            ]
        },
    )

    assert response.status_code == 400
    assert invoked is False


def test_scan_rate_limit_returns_safe_retry_contract(monkeypatch):
    def fake_run_scan(*_, **__):
        return ScanResult(
            runId="run-rate",
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
    client = TestClient(create_app(Settings(scan_admissions_per_minute=1)))
    payload = {"photoItems": [{"id": "x", "createTime": "2025-01-01T00:00:00Z"}]}

    assert client.post("/api/scan", json=payload).status_code == 200
    limited = client.post("/api/scan", json=payload)

    assert limited.status_code == 429
    assert limited.headers["Retry-After"] == "60"
    assert limited.json()["detail"]["category"] == "scan_rate_limited"
    assert "correlationId" in limited.json()["detail"]


def test_scan_busy_returns_safe_retry_contract():
    class BusyController:
        @contextmanager
        def lease(self) -> Iterator[None]:
            raise AdmissionError(503, "scan_busy", "A scan is already running.", 1)
            yield

    app = create_app()
    app.state.scan_admission = BusyController()
    client = TestClient(app)

    response = client.post(
        "/api/scan",
        json={"photoItems": [{"id": "x", "createTime": "2025-01-01T00:00:00Z"}]},
    )

    assert response.status_code == 503
    assert response.headers["Retry-After"] == "1"
    assert response.json()["detail"]["category"] == "scan_busy"


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
                            "mimeType": "image/jpeg",
                            "filename": "picker-1.jpg",
                            "baseUrl": "https://photos.google.com/picker-1",
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


def test_scan_rejects_picker_payload_without_base_url():
    config.get_settings.cache_clear()
    try:
        client = TestClient(create_app())
        response = client.post(
            "/api/scan",
            json={
                "pickerPayload": {
                    "mediaItems": [
                        {
                            "mediaFile": {
                                "id": "picker-1",
                                "createTime": "2025-01-01T00:00:00Z",
                                "mimeType": "image/jpeg",
                            }
                        }
                    ]
                }
            },
        )

        assert response.status_code == 422
        assert "baseUrl" in str(response.json()["detail"])
    finally:
        config.get_settings.cache_clear()


def test_scan_rejects_raw_picker_payload_above_item_limit():
    config.get_settings.cache_clear()
    try:
        client = TestClient(create_app())
        response = client.post(
            "/api/scan",
            json={
                "pickerPayload": {
                    "mediaItems": [
                        {
                            "id": f"picker-{index}",
                            "createTime": "2025-01-01T00:00:00Z",
                            "mimeType": "image/jpeg",
                            "baseUrl": f"https://photos.google.com/picker-{index}",
                        }
                        for index in range(2001)
                    ]
                }
            },
        )

        assert response.status_code == 422
        assert "at most 2000 items" in str(response.json()["detail"])
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
        assert detail["category"] == "download_host"
        assert "host.docker.internal" not in str(detail)
    finally:
        config.get_settings.cache_clear()


def test_scan_network_failure_returns_422_without_url(monkeypatch):
    monkeypatch.setenv("SCAN_ALLOWED_DOWNLOAD_HOSTS", "photos.google.com")
    config.get_settings.cache_clear()

    def fail_download(*_args, **_kwargs):
        raise downloads.DownloadSecurityError(
            "download_http",
            "The selected photo could not be downloaded.",
        )

    monkeypatch.setattr(downloads.DownloadManager, "_download", fail_download)
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
        assert detail["category"] == "download_http"
        assert detail["message"] == "The selected photo could not be downloaded."
        assert "https://photos.google.com/file.jpg" not in str(detail)
    finally:
        config.get_settings.cache_clear()


def test_scan_returns_exact_group_and_partial_item_failure(monkeypatch):
    monkeypatch.setenv("SCAN_ALLOWED_DOWNLOAD_HOSTS", "photos.google.com")
    config.get_settings.cache_clear()
    duplicate_bytes = _png_bytes()

    def fake_download(_manager, item):
        if item.download_url and item.download_url.endswith("/invalid"):
            return b"not-an-image"
        return duplicate_bytes

    monkeypatch.setattr(downloads.DownloadManager, "_download", fake_download)
    try:
        client = TestClient(create_app())
        response = client.post(
            "/api/scan",
            json={
                "photoItems": [
                    _photo_payload("one", "duplicate"),
                    _photo_payload("two", "duplicate"),
                    _photo_payload("bad", "invalid"),
                ]
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["groupsExact"]) == 1
        assert payload["failedItems"] == [
            {
                "itemId": "bad",
                "reasonCode": "IMAGE_BYTES_UNAVAILABLE",
                "message": "PhotoPrune could not read this item's image bytes.",
            }
        ]
    finally:
        config.get_settings.cache_clear()


def test_scan_rejects_selection_when_every_item_is_invalid(monkeypatch):
    monkeypatch.setenv("SCAN_ALLOWED_DOWNLOAD_HOSTS", "photos.google.com")
    config.get_settings.cache_clear()
    monkeypatch.setattr(
        downloads.DownloadManager,
        "_download",
        lambda *_args, **_kwargs: b"not-an-image",
    )
    try:
        client = TestClient(create_app())
        response = client.post(
            "/api/scan",
            json={
                "photoItems": [
                    _photo_payload("one", "invalid-one"),
                    _photo_payload("two", "invalid-two"),
                ]
            },
        )

        assert response.status_code == 422
        assert response.json()["detail"]["category"] == "download_content"
        assert "None of the selected photos supplied readable image bytes" in (
            response.json()["detail"]["message"]
        )
    finally:
        config.get_settings.cache_clear()


def _photo_payload(item_id: str, token: str) -> dict[str, object]:
    return {
        "id": item_id,
        "createTime": "2025-01-01T00:00:00Z",
        "filename": f"{item_id}.png",
        "mimeType": "image/png",
        "width": 8,
        "height": 8,
        "downloadUrl": f"https://photos.google.com/{token}",
    }


def _png_bytes() -> bytes:
    output = BytesIO()
    Image.new("RGB", (8, 8), color=(24, 80, 140)).save(output, format="PNG")
    return output.getvalue()
