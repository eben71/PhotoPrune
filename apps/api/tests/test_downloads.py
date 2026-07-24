from __future__ import annotations

import ipaddress
import time
from datetime import UTC, datetime
from typing import Any

import pytest

from app.engine import downloads
from app.engine.models import PhotoItem

PUBLIC_IP = ipaddress.ip_address("93.184.216.34")
SECOND_PUBLIC_IP = ipaddress.ip_address("8.8.8.8")
PRIVATE_IP = ipaddress.ip_address("127.0.0.1")


class FakeResolver:
    def __init__(self, addresses: dict[str, frozenset[downloads.IPAddress]]) -> None:
        self.addresses = addresses
        self.calls: list[tuple[str, int]] = []

    def resolve(
        self,
        hostname: str,
        port: int,
        _timeout_seconds: float,
    ) -> frozenset[downloads.IPAddress]:
        self.calls.append((hostname, port))
        return self.addresses[hostname]


class FakeResponse:
    def __init__(
        self,
        status: int = 200,
        *,
        headers: dict[str, list[str]] | None = None,
        chunks: list[bytes] | None = None,
        peer_ip: downloads.IPAddress = PUBLIC_IP,
    ) -> None:
        self.status = status
        self._headers = headers or {}
        self._chunks = list(chunks or [b"payload", b""])
        self.peer_ip = peer_ip
        self.closed = False
        self.read_count = 0
        self.timeouts: list[float] = []

    def header_values(self, name: str) -> list[str]:
        return self._headers.get(name, [])

    def read(self, size: int) -> bytes:
        self.read_count += 1
        chunk = self._chunks.pop(0)
        if len(chunk) > size:
            self._chunks.insert(0, chunk[size:])
            return chunk[:size]
        return chunk

    def set_timeout(self, timeout_seconds: float) -> None:
        self.timeouts.append(timeout_seconds)

    def close(self) -> None:
        self.closed = True


class FakeConnector:
    def __init__(self, *responses: FakeResponse) -> None:
        self.responses = iter(responses)
        self.calls: list[
            tuple[downloads.AuthorizedTarget, frozenset[downloads.IPAddress], float]
        ] = []

    def open(
        self,
        target: downloads.AuthorizedTarget,
        approved_addresses: frozenset[downloads.IPAddress],
        timeout_seconds: float,
    ) -> FakeResponse:
        self.calls.append((target, approved_addresses, timeout_seconds))
        return next(self.responses)


def test_empty_allowlist_denies_downloads():
    policy = downloads.DownloadPolicy(allowed_hosts=[])

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        policy.authorize("https://photos.google.com/item")

    assert caught.value.category == "download_host"


@pytest.mark.parametrize(
    "url",
    [
        "http://photos.google.com/unsafe",
        "https://user@photos.google.com/unsafe",
        "https://photos.google.com/unsafe#fragment",
        "https://photos.google.com/unsafe#",
        "https://photos.google.com:444/unsafe",
        "https://photos.google.com/unsafe path",
        "https://bad_host.example/unsafe",
        "https://",
    ],
)
def test_policy_rejects_ambiguous_or_unsafe_urls(url):
    policy = downloads.DownloadPolicy(allowed_hosts=["photos.google.com"])

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        policy.authorize(url)

    assert caught.value.category == "download_url"
    assert url not in str(caught.value)


def test_policy_supports_exact_and_narrow_google_media_hosts():
    policy = downloads.DownloadPolicy(allowed_hosts=["photos.google.com", "googleusercontent.com"])

    assert policy.authorize("https://photos.google.com/item").hostname == "photos.google.com"
    assert (
        policy.authorize("https://lh4.googleusercontent.com/item").hostname
        == "lh4.googleusercontent.com"
    )
    with pytest.raises(downloads.DownloadSecurityError):
        policy.authorize("https://foo.googleusercontent.com/item")
    with pytest.raises(downloads.DownloadSecurityError):
        policy.authorize("https://sub.photos.google.com/item")


def test_override_requires_original_host_allowlist():
    denied = downloads.DownloadPolicy(
        allowed_hosts=["photos.google.com"],
        host_overrides={"example.test": "http://127.0.0.1:8001"},
        allow_override_exceptions=True,
    )
    allowed = downloads.DownloadPolicy(
        allowed_hosts=["example.test"],
        host_overrides={"example.test": "http://127.0.0.1:8001"},
        allow_override_exceptions=True,
    )

    with pytest.raises(downloads.DownloadSecurityError):
        denied.authorize("https://example.test/media")
    target = allowed.authorize("https://example.test/media?token=secret")

    assert target.scheme == "http"
    assert target.hostname == "127.0.0.1"
    assert target.port == 8001
    assert target.allow_non_global is True


def test_mixed_dns_answers_are_rejected_before_connect():
    resolver = FakeResolver({"photos.google.com": frozenset({PUBLIC_IP, PRIVATE_IP})})
    connector = FakeConnector(FakeResponse())
    manager = _manager(resolver=resolver, connector=connector)

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("one", "https://photos.google.com/item"))

    assert caught.value.category == "download_address"
    assert connector.calls == []


def test_connected_peer_must_match_validated_dns_set():
    resolver = FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})})
    connector = FakeConnector(FakeResponse(peer_ip=PRIVATE_IP))
    manager = _manager(resolver=resolver, connector=connector)

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("one", "https://photos.google.com/item"))

    assert caught.value.category == "download_address"
    assert connector.responses


def test_redirects_are_reauthorized_and_reresolved():
    first = FakeResponse(
        status=302,
        headers={"Location": ["https://lh4.googleusercontent.com/next"]},
    )
    second = FakeResponse(chunks=[b"image", b""], peer_ip=SECOND_PUBLIC_IP)
    resolver = FakeResolver(
        {
            "photos.google.com": frozenset({PUBLIC_IP}),
            "lh4.googleusercontent.com": frozenset({SECOND_PUBLIC_IP}),
        }
    )
    connector = FakeConnector(first, second)
    manager = _manager(
        resolver=resolver,
        connector=connector,
        allowed_hosts=["photos.google.com", "googleusercontent.com"],
    )

    assert manager.get_bytes(_photo_item("one", "https://photos.google.com/start")) == b"image"
    assert resolver.calls == [
        ("photos.google.com", 443),
        ("lh4.googleusercontent.com", 443),
    ]
    assert first.closed is True
    assert second.closed is True


def test_redirect_to_private_address_is_rejected_before_second_connect():
    redirect = FakeResponse(
        status=302,
        headers={"Location": ["https://127.0.0.1/private"]},
    )
    resolver = FakeResolver(
        {
            "photos.google.com": frozenset({PUBLIC_IP}),
            "127.0.0.1": frozenset({PRIVATE_IP}),
        }
    )
    connector = FakeConnector(redirect)
    manager = _manager(
        resolver=resolver,
        connector=connector,
        allowed_hosts=["photos.google.com", "127.0.0.1"],
    )

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("one", "https://photos.google.com/start"))

    assert caught.value.category == "download_address"
    assert len(connector.calls) == 1


def test_redirect_loop_and_excess_are_rejected():
    loop_connector = FakeConnector(FakeResponse(status=302, headers={"Location": ["/start"]}))
    resolver = FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})})
    loop_manager = _manager(resolver=resolver, connector=loop_connector)

    with pytest.raises(downloads.DownloadSecurityError, match="redirected"):
        loop_manager.get_bytes(_photo_item("loop", "https://photos.google.com/start"))

    redirects = [
        FakeResponse(status=302, headers={"Location": [f"/step-{index}"]}) for index in range(4)
    ]
    excess_manager = _manager(
        resolver=resolver,
        connector=FakeConnector(*redirects),
    )
    with pytest.raises(downloads.DownloadSecurityError) as caught:
        excess_manager.get_bytes(_photo_item("excess", "https://photos.google.com/start"))
    assert caught.value.category == "download_redirect"


@pytest.mark.parametrize("locations", [[], ["/one", "/two"]])
def test_redirect_requires_one_location_header(locations):
    connector = FakeConnector(FakeResponse(status=302, headers={"Location": locations}))
    manager = _manager(
        resolver=FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})}),
        connector=connector,
    )

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("one", "https://photos.google.com/start"))

    assert caught.value.category == "download_redirect"


def test_declared_and_streamed_item_size_limits_stop_reading():
    declared = FakeResponse(
        headers={"Content-Length": ["6"]},
        chunks=[b"not-read"],
    )
    streamed = FakeResponse(chunks=[b"1234", b"56", b""])
    resolver = FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})})

    with pytest.raises(downloads.DownloadSecurityError) as declared_error:
        _manager(
            resolver=resolver,
            connector=FakeConnector(declared),
            max_item_bytes=5,
        ).get_bytes(_photo_item("declared", "https://photos.google.com/item"))
    assert declared.read_count == 0
    assert declared_error.value.fatal_to_scan is True

    with pytest.raises(downloads.DownloadSecurityError) as streamed_error:
        _manager(
            resolver=resolver,
            connector=FakeConnector(streamed),
            max_item_bytes=5,
        ).get_bytes(_photo_item("streamed", "https://photos.google.com/item"))
    assert streamed.read_count == 2
    assert streamed_error.value.fatal_to_scan is True


def test_encoded_response_fails_closed_before_reading():
    response = FakeResponse(
        headers={"Content-Encoding": ["gzip"]},
        chunks=[b"compressed-secret"],
    )
    manager = _manager(
        resolver=FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})}),
        connector=FakeConnector(response),
    )

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("encoded", "https://photos.google.com/item"))

    assert caught.value.category == "download_encoding"
    assert response.read_count == 0


def test_aggregate_budget_is_shared_across_items_and_cache_hits_are_free():
    first = FakeResponse(chunks=[b"123", b""])
    second = FakeResponse(chunks=[b"456", b""])
    resolver = FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})})
    connector = FakeConnector(first, second)
    scan_budget = downloads.ScanDownloadBudget(max_bytes=5, wall_seconds=60)
    manager = _manager(
        resolver=resolver,
        connector=connector,
        scan_budget=scan_budget,
    )
    one = _photo_item("one", "https://photos.google.com/one")

    assert manager.get_bytes(one) == b"123"
    assert manager.get_bytes(one) == b"123"
    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("two", "https://photos.google.com/two"))

    assert caught.value.category == "download_size"
    assert caught.value.fatal_to_scan is True
    assert scan_budget.bytes_charged == 5
    assert manager.download_count == 1


def test_wall_deadline_uses_injected_monotonic_clock():
    now = [100.0]
    budget = downloads.ScanDownloadBudget(
        max_bytes=100,
        wall_seconds=10,
        clock=lambda: now[0],
    )
    now[0] = 111.0
    manager = _manager(
        resolver=FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})}),
        connector=FakeConnector(FakeResponse()),
        scan_budget=budget,
    )

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("one", "https://photos.google.com/item"))

    assert caught.value.category == "download_timeout"


def test_dns_time_consumes_shared_deadline_before_connect():
    now = [100.0]

    class AdvancingResolver(FakeResolver):
        def resolve(
            self,
            hostname: str,
            port: int,
            timeout_seconds: float,
        ) -> frozenset[downloads.IPAddress]:
            result = super().resolve(hostname, port, timeout_seconds)
            now[0] = 111.0
            return result

    connector = FakeConnector(FakeResponse())
    manager = _manager(
        resolver=AdvancingResolver({"photos.google.com": frozenset({PUBLIC_IP})}),
        connector=connector,
        scan_budget=downloads.ScanDownloadBudget(
            max_bytes=100,
            wall_seconds=10,
            clock=lambda: now[0],
        ),
    )

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("one", "https://photos.google.com/item"))

    assert caught.value.category == "download_timeout"
    assert connector.calls == []


def test_socket_resolver_enforces_its_deadline(monkeypatch):
    monkeypatch.setattr(
        downloads.socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: time.sleep(1),
    )

    started = time.monotonic()
    with pytest.raises(downloads.DownloadSecurityError) as caught:
        downloads.SocketResolver().resolve("photos.google.com", 443, 0.01)

    assert caught.value.category == "download_timeout"
    assert caught.value.fatal_to_scan is True
    assert time.monotonic() - started < 0.5


def test_read_timeout_never_exceeds_per_attempt_ceiling():
    response = FakeResponse(chunks=[b"image", b""])
    manager = _manager(
        resolver=FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})}),
        connector=FakeConnector(response),
        scan_budget=downloads.ScanDownloadBudget(
            max_bytes=100,
            wall_seconds=600,
        ),
    )

    assert manager.get_bytes(_photo_item("one", "https://photos.google.com/item")) == b"image"
    assert response.timeouts
    assert max(response.timeouts) <= 30


def test_response_cleanup_consumes_the_shared_deadline():
    now = [100.0]

    class DeadlineConsumingResponse(FakeResponse):
        def close(self) -> None:
            super().close()
            now[0] = 111.0

    manager = _manager(
        resolver=FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})}),
        connector=FakeConnector(DeadlineConsumingResponse(chunks=[b"image", b""])),
        scan_budget=downloads.ScanDownloadBudget(
            max_bytes=100,
            wall_seconds=10,
            clock=lambda: now[0],
        ),
    )

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(_photo_item("one", "https://photos.google.com/item"))

    assert caught.value.category == "download_timeout"


def test_errors_and_headers_do_not_disclose_secrets():
    response = FakeResponse(status=500, chunks=[b"secret upstream body"])
    manager = _manager(
        resolver=FakeResolver({"photos.google.com": frozenset({PUBLIC_IP})}),
        connector=FakeConnector(response),
    )

    with pytest.raises(downloads.DownloadSecurityError) as caught:
        manager.get_bytes(
            _photo_item(
                "one",
                "https://photos.google.com/private/path?token=seeded-secret",
            )
        )

    assert "seeded-secret" not in str(caught.value)
    assert "/private/path" not in str(caught.value)
    assert response.read_count == 0
    connector = downloads.PinnedHttpConnector(
        headers={
            "Authorization": "Bearer seeded-secret",
            "Cookie": "session=seeded-secret",
            "X-Safe": "ok",
        }
    )
    assert connector._headers == {"X-Safe": "ok"}


def test_pinned_connection_preserves_original_tls_hostname(monkeypatch):
    target = downloads.AuthorizedTarget(
        url="https://photos.google.com/item",
        scheme="https",
        hostname="photos.google.com",
        port=443,
        request_target="/item",
    )
    raw_socket = object()
    wrapped_socket = object()
    seen: dict[str, Any] = {}

    class FakeContext:
        def wrap_socket(self, sock: object, *, server_hostname: str) -> object:
            seen["socket"] = sock
            seen["server_hostname"] = server_hostname
            return wrapped_socket

    monkeypatch.setenv("HTTPS_PROXY", "http://127.0.0.1:9999")
    monkeypatch.setenv("SSL_CERT_FILE", "C:/untrusted/cert.pem")
    monkeypatch.setattr(downloads.socket, "create_connection", lambda *_args, **_kwargs: raw_socket)
    connection = downloads._PinnedHTTPConnection(
        target,
        PUBLIC_IP,
        30,
        FakeContext(),  # type: ignore[arg-type]
    )

    connection.connect()

    assert connection.sock is wrapped_socket
    assert seen == {
        "socket": raw_socket,
        "server_hostname": "photos.google.com",
    }


def test_custom_fetcher_is_cached():
    calls: list[str] = []
    manager = downloads.DownloadManager(fetcher=lambda item: calls.append(item.id) or b"payload")
    item = _photo_item("one", None)

    assert manager.get_bytes(item) == b"payload"
    assert manager.get_bytes(item) == b"payload"
    assert calls == ["one"]
    assert manager.download_count == 1


def _manager(
    *,
    resolver: FakeResolver,
    connector: FakeConnector,
    allowed_hosts: list[str] | None = None,
    scan_budget: downloads.ScanDownloadBudget | None = None,
    max_item_bytes: int = 50 * 1024 * 1024,
) -> downloads.DownloadManager:
    return downloads.DownloadManager(
        resolver=resolver,
        connector=connector,
        allowed_hosts=allowed_hosts or ["photos.google.com"],
        scan_budget=scan_budget,
        max_item_bytes=max_item_bytes,
    )


def _photo_item(item_id: str, download_url: str | None) -> PhotoItem:
    return PhotoItem(
        id=item_id,
        create_time=datetime(2024, 1, 1, tzinfo=UTC),
        filename="photo.jpg",
        mime_type="image/jpeg",
        width=100,
        height=100,
        gps=None,
        download_url=download_url,
        deep_link=None,
    )
