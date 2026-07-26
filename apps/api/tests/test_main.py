from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import (
    RequestBodyLimitMiddleware,
    RollingWindowLimiter,
    ScanAdmissionController,
)
from app.main import create_app


def test_declared_oversized_body_is_rejected_before_route(monkeypatch):
    invoked = False

    def fail_if_called(*_args: Any, **_kwargs: Any) -> None:
        nonlocal invoked
        invoked = True

    monkeypatch.setattr("app.api.routes.run_scan", fail_if_called)
    app = create_app(Settings(request_body_max_bytes=64))
    client = TestClient(app)

    response = client.post(
        "/api/scan",
        content=json.dumps({"photoItems": [], "padding": "x" * 100}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json()["detail"]["category"] == "request_body_too_large"
    assert invoked is False


def test_validation_errors_do_not_echo_sensitive_input():
    client = TestClient(create_app())
    sensitive_url = (
        "https://lh3.googleusercontent.com/private/path?token=seeded-secret" + "x" * 4096
    )

    response = client.post(
        "/api/scan",
        json={
            "photoItems": [
                {
                    "id": "photo-1",
                    "createTime": "2024-01-01T00:00:00Z",
                    "downloadUrl": sensitive_url,
                }
            ]
        },
    )

    assert response.status_code == 422
    assert response.json()["category"] == "request_validation"
    assert response.json()["correlationId"] == response.headers["X-Correlation-ID"]
    assert "seeded-secret" not in response.text
    assert "/private/path" not in response.text


def test_streamed_oversized_body_stops_before_downstream_receives_overflow():
    downstream_messages: list[bytes] = []

    async def downstream(_scope: Any, receive: Any, send: Any) -> None:
        while True:
            message = await receive()
            downstream_messages.append(message.get("body", b""))
            if not message.get("more_body", False):
                break
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    middleware = RequestBodyLimitMiddleware(downstream, max_bytes=4)
    chunks = iter(
        [
            {"type": "http.request", "body": b"1234", "more_body": True},
            {"type": "http.request", "body": b"5", "more_body": False},
        ]
    )
    sent: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        return next(chunks)

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    asyncio.run(
        middleware(
            {
                "type": "http",
                "method": "POST",
                "path": "/api/scan",
                "headers": [],
                "state": {"correlation_id": "test-id"},
            },
            receive,
            send,
        )
    )

    assert downstream_messages == [b"1234"]
    assert sent[0]["status"] == 413


def test_streamed_oversized_body_is_rejected_when_route_ignores_body():
    async def bodyless_route(_scope: Any, _receive: Any, send: Any) -> None:
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    middleware = RequestBodyLimitMiddleware(bodyless_route, max_bytes=4)
    chunks = iter(
        [
            {"type": "http.request", "body": b"1234", "more_body": True},
            {"type": "http.request", "body": b"5", "more_body": False},
        ]
    )
    sent: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        return next(chunks)

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    asyncio.run(
        middleware(
            {
                "type": "http",
                "method": "GET",
                "path": "/healthz",
                "headers": [],
                "state": {"correlation_id": "test-id"},
            },
            receive,
            send,
        )
    )

    assert sent[0]["status"] == 413


def test_correlation_id_is_validated_and_returned():
    client = TestClient(create_app())

    accepted = client.get("/healthz", headers={"X-Correlation-ID": "valid-id_123"})
    replaced = client.get("/healthz", headers={"X-Correlation-ID": "secret value"})

    assert accepted.headers["X-Correlation-ID"] == "valid-id_123"
    assert replaced.headers["X-Correlation-ID"] != "secret value"
    assert len(replaced.headers["X-Correlation-ID"]) == 32


def test_general_rate_limit_excludes_health():
    app = create_app(Settings(api_requests_per_minute=1))
    client = TestClient(app)

    first = client.get("/openapi.json")
    limited = client.get("/openapi.json")
    health = client.get("/healthz")

    assert first.status_code == 200
    assert limited.status_code == 429
    assert limited.headers["Retry-After"] == "60"
    assert limited.json()["detail"]["category"] == "request_rate_limited"
    assert health.status_code == 200


def test_scan_admission_rate_and_concurrency_use_injected_clock():
    now = 100.0
    controller = ScanAdmissionController(
        rate_limit=2,
        concurrency_limit=1,
        clock=lambda: now,
    )

    with controller.lease():
        try:
            with controller.lease():
                raise AssertionError("second lease should be rejected")
        except Exception as error:
            assert getattr(error, "category", None) == "scan_busy"

    try:
        with controller.lease():
            raise AssertionError("third admission should be rate limited")
    except Exception as error:
        assert getattr(error, "category", None) == "scan_rate_limited"


def test_rolling_window_limiter_releases_old_events():
    now = [100.0]
    limiter = RollingWindowLimiter(1, clock=lambda: now[0])

    assert limiter.admit() is None
    assert limiter.admit() == 60
    now[0] = 160.0
    assert limiter.admit() is None
