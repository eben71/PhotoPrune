from __future__ import annotations

import json
import logging
import math
import re
import threading
import time
from collections import deque
from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Protocol
from uuid import uuid4

from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger(__name__)

CORRELATION_HEADER = b"x-correlation-id"
CORRELATION_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
HEALTH_PATHS = {"/health", "/healthz"}


class Clock(Protocol):
    def __call__(self) -> float: ...


class BodyTooLargeError(Exception):
    pass


@dataclass(frozen=True)
class AdmissionError(Exception):
    status_code: int
    category: str
    message: str
    retry_after: int


class RollingWindowLimiter:
    def __init__(self, limit: int, *, clock: Clock = time.monotonic, window_seconds: int = 60):
        self._limit = limit
        self._clock = clock
        self._window_seconds = window_seconds
        self._events: deque[float] = deque()
        self._lock = threading.Lock()

    def admit(self) -> int | None:
        now = self._clock()
        cutoff = now - self._window_seconds
        with self._lock:
            while self._events and self._events[0] <= cutoff:
                self._events.popleft()
            if len(self._events) >= self._limit:
                return max(1, math.ceil(self._events[0] + self._window_seconds - now))
            self._events.append(now)
        return None


class ScanAdmissionController:
    def __init__(
        self,
        *,
        rate_limit: int,
        concurrency_limit: int,
        clock: Clock = time.monotonic,
    ) -> None:
        self._rate_limiter = RollingWindowLimiter(rate_limit, clock=clock)
        self._concurrency_limit = concurrency_limit
        self._active = 0
        self._lock = threading.Lock()

    @contextmanager
    def lease(self) -> Iterator[None]:
        retry_after = self._rate_limiter.admit()
        if retry_after is not None:
            raise AdmissionError(
                status_code=429,
                category="scan_rate_limited",
                message="Too many scans were started. Wait briefly and retry.",
                retry_after=retry_after,
            )
        with self._lock:
            if self._active >= self._concurrency_limit:
                raise AdmissionError(
                    status_code=503,
                    category="scan_busy",
                    message="A scan is already running. Wait briefly and retry.",
                    retry_after=1,
                )
            self._active += 1
        try:
            yield
        finally:
            with self._lock:
                self._active -= 1


class CorrelationIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        correlation_id = _read_correlation_id(scope)
        state = scope.setdefault("state", {})
        state["correlation_id"] = correlation_id

        async def send_with_correlation(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = [
                    header
                    for header in message.get("headers", [])
                    if header[0].lower() != CORRELATION_HEADER
                ]
                headers.append((CORRELATION_HEADER, correlation_id.encode("ascii")))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_correlation)


class SafeExceptionMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = False

        async def track_send(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, track_send)
        except Exception:
            correlation_id = correlation_id_from_scope(scope)
            logger.error(
                "Unhandled API error",
                extra={"category": "internal_error", "correlation_id": correlation_id},
            )
            if started:
                raise
            await send_security_error(
                send,
                status_code=500,
                category="internal_error",
                message="PhotoPrune could not complete the request.",
                correlation_id=correlation_id,
            )


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp, *, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        declared_length = _declared_content_length(scope)
        if declared_length is not None and declared_length > self.max_bytes:
            await self._reject(scope, send)
            return

        observed = 0
        request_complete = False
        overflowed = False
        rejected = False

        def count_message(message: Message) -> None:
            nonlocal observed, request_complete, overflowed
            if message["type"] == "http.disconnect":
                request_complete = True
                return
            if message["type"] != "http.request":
                return
            observed += len(message.get("body", b""))
            request_complete = not message.get("more_body", False)
            if observed > self.max_bytes:
                overflowed = True
                raise BodyTooLargeError

        async def limited_receive() -> Message:
            message = await receive()
            count_message(message)
            return message

        async def drain_unread_body() -> None:
            while not request_complete:
                count_message(await receive())

        async def limited_send(message: Message) -> None:
            nonlocal rejected
            if rejected:
                return
            if message["type"] == "http.response.start":
                try:
                    await drain_unread_body()
                except BodyTooLargeError:
                    rejected = True
                    await self._reject(scope, send)
                    return
                if overflowed:
                    rejected = True
                    await self._reject(scope, send)
                    return
            await send(message)

        try:
            await self.app(scope, limited_receive, limited_send)
        except BodyTooLargeError:
            if not rejected:
                rejected = True
                await self._reject(scope, send)

    async def _reject(self, scope: Scope, send: Send) -> None:
        await send_security_error(
            send,
            status_code=413,
            category="request_body_too_large",
            message="The request body is too large.",
            correlation_id=correlation_id_from_scope(scope),
        )


class GeneralAdmissionMiddleware:
    def __init__(self, app: ASGIApp, *, limiter: RollingWindowLimiter) -> None:
        self.app = app
        self.limiter = limiter

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("path") in HEALTH_PATHS:
            await self.app(scope, receive, send)
            return
        retry_after = self.limiter.admit()
        if retry_after is None:
            await self.app(scope, receive, send)
            return
        await send_security_error(
            send,
            status_code=429,
            category="request_rate_limited",
            message="Too many requests were received. Wait briefly and retry.",
            correlation_id=correlation_id_from_scope(scope),
            retry_after=retry_after,
        )


async def send_security_error(
    send: Send,
    *,
    status_code: int,
    category: str,
    message: str,
    correlation_id: str,
    retry_after: int | None = None,
) -> None:
    body = json.dumps(
        {
            "detail": {
                "category": category,
                "message": message,
                "correlationId": correlation_id,
            }
        }
    ).encode("utf-8")
    headers = [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]
    if retry_after is not None:
        headers.append((b"retry-after", str(retry_after).encode("ascii")))
    await send({"type": "http.response.start", "status": status_code, "headers": headers})
    await send({"type": "http.response.body", "body": body})


def security_detail(scope: Scope, category: str, message: str) -> dict[str, str]:
    return {
        "category": category,
        "message": message,
        "correlationId": correlation_id_from_scope(scope),
    }


def safe_validation_errors(errors: Sequence[Any]) -> list[dict[str, Any]]:
    safe_errors: list[dict[str, Any]] = []
    for error in errors:
        if not isinstance(error, Mapping):
            continue
        safe_location: list[str | int] = []
        for component in error.get("loc", ()):
            if isinstance(component, int):
                safe_location.append(component)
            elif isinstance(component, str) and re.fullmatch(
                r"[A-Za-z][A-Za-z0-9_]{0,63}",
                component,
            ):
                safe_location.append(component)
            else:
                safe_location.append("<field>")
        safe_errors.append(
            {
                "type": str(error.get("type", "value_error")),
                "loc": safe_location,
                "msg": str(error.get("msg", "The request value is invalid.")),
            }
        )
    return safe_errors


def correlation_id_from_scope(scope: Scope) -> str:
    state: dict[str, Any] = scope.get("state", {})
    value = state.get("correlation_id")
    return value if isinstance(value, str) else uuid4().hex


def _read_correlation_id(scope: Scope) -> str:
    values: list[str] = []
    for name, value in scope.get("headers", []):
        if name.lower() == CORRELATION_HEADER:
            values.append(value.decode("latin-1"))
    if len(values) == 1 and CORRELATION_PATTERN.fullmatch(values[0]):
        return values[0]
    return uuid4().hex


def _declared_content_length(scope: Scope) -> int | None:
    values = [
        value.decode("ascii", errors="ignore")
        for name, value in scope.get("headers", [])
        if name.lower() == b"content-length"
    ]
    if len(values) != 1:
        return None
    try:
        parsed = int(values[0])
    except ValueError:
        return None
    return parsed if parsed >= 0 else None
