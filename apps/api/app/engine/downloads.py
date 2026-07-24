from __future__ import annotations

import http.client
import ipaddress
import os
import re
import socket
import ssl
import threading
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass, replace
from queue import Empty, Queue
from typing import Protocol
from urllib.parse import SplitResult, urljoin, urlsplit, urlunsplit

from app.core.config import (
    MAX_DOWNLOAD_BYTES_PER_ITEM,
    MAX_DOWNLOAD_BYTES_PER_SCAN,
    MAX_DOWNLOAD_REDIRECTS,
    MAX_DOWNLOAD_TIMEOUT_SECONDS,
    MAX_SCAN_DOWNLOAD_WALL_SECONDS,
)
from app.engine.models import PhotoItem

DownloadFetcher = Callable[[PhotoItem], bytes]
Clock = Callable[[], float]
IPAddress = ipaddress.IPv4Address | ipaddress.IPv6Address

GOOGLEUSERCONTENT_MEDIA_HOST_RE = re.compile(r"^lh\d+\.googleusercontent\.com$")
REDIRECT_STATUSES = {301, 302, 303, 307, 308}
SENSITIVE_REQUEST_HEADERS = {
    "authorization",
    "cookie",
    "host",
    "proxy-authorization",
}
CHUNK_SIZE = 64 * 1024
MAX_URL_LENGTH = 4096


class DownloadSecurityError(ValueError):
    def __init__(
        self,
        category: str,
        message: str,
        *,
        fatal_to_scan: bool = False,
    ) -> None:
        super().__init__(message)
        self.category = category
        self.safe_message = message
        self.fatal_to_scan = fatal_to_scan


@dataclass(frozen=True)
class AuthorizedTarget:
    url: str
    scheme: str
    hostname: str
    port: int
    request_target: str
    allow_non_global: bool = False


class Resolver(Protocol):
    def resolve(
        self,
        hostname: str,
        port: int,
        timeout_seconds: float,
    ) -> frozenset[IPAddress]: ...


class ConnectedResponse(Protocol):
    peer_ip: IPAddress

    @property
    def status(self) -> int: ...

    def header_values(self, name: str) -> list[str]: ...

    def read(self, size: int) -> bytes: ...

    def set_timeout(self, timeout_seconds: float) -> None: ...

    def close(self) -> None: ...


class Connector(Protocol):
    def open(
        self,
        target: AuthorizedTarget,
        approved_addresses: frozenset[IPAddress],
        timeout_seconds: float,
    ) -> ConnectedResponse: ...


class SocketResolver:
    def resolve(
        self,
        hostname: str,
        port: int,
        timeout_seconds: float = MAX_DOWNLOAD_TIMEOUT_SECONDS,
    ) -> frozenset[IPAddress]:
        outcomes: Queue[object] = Queue(maxsize=1)

        def lookup() -> None:
            try:
                outcomes.put(
                    socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM),
                    block=False,
                )
            except Exception as exc:
                outcomes.put(exc, block=False)

        threading.Thread(target=lookup, daemon=True).start()
        try:
            outcome = outcomes.get(timeout=max(0.0, timeout_seconds))
        except Empty as exc:
            raise DownloadSecurityError(
                "download_timeout",
                "The selected photo download timed out.",
                fatal_to_scan=True,
            ) from exc
        if isinstance(outcome, Exception):
            raise DownloadSecurityError(
                "download_address",
                "The selected photo could not be retrieved safely.",
            ) from outcome
        results = outcome
        if not isinstance(results, list):
            raise DownloadSecurityError(
                "download_address",
                "The selected photo could not be retrieved safely.",
            )
        addresses: set[IPAddress] = set()
        for result in results:
            try:
                addresses.add(ipaddress.ip_address(result[4][0]))
            except ValueError as exc:
                raise DownloadSecurityError(
                    "download_address",
                    "The selected photo could not be retrieved safely.",
                ) from exc
        if not addresses:
            raise DownloadSecurityError(
                "download_address",
                "The selected photo could not be retrieved safely.",
            )
        return frozenset(addresses)


class _PinnedHTTPConnection(http.client.HTTPConnection):
    def __init__(
        self,
        target: AuthorizedTarget,
        address: IPAddress,
        timeout_seconds: float,
        ssl_context: ssl.SSLContext,
        clock: Clock = time.monotonic,
    ) -> None:
        super().__init__(target.hostname, target.port, timeout=timeout_seconds)
        self._target = target
        self._address = address
        self._ssl_context = ssl_context
        self._clock = clock
        self._deadline = clock() + timeout_seconds

    def connect(self) -> None:
        raw_socket = socket.create_connection(
            (str(self._address), self.port),
            self.remaining_timeout(),
        )
        if self._target.scheme == "https":
            try:
                set_timeout = getattr(raw_socket, "settimeout", None)
                if callable(set_timeout):
                    set_timeout(self.remaining_timeout())
                self.sock = self._ssl_context.wrap_socket(
                    raw_socket,
                    server_hostname=self._target.hostname,
                )
            except Exception:
                raw_socket.close()
                raise
        else:
            self.sock = raw_socket

    def remaining_timeout(self) -> float:
        remaining = self._deadline - self._clock()
        if remaining <= 0:
            raise TimeoutError("download attempt deadline exceeded")
        return remaining

    def apply_remaining_timeout(self) -> None:
        if self.sock is not None:
            self.sock.settimeout(self.remaining_timeout())


@dataclass
class _StandardConnectedResponse:
    connection: _PinnedHTTPConnection
    response: http.client.HTTPResponse
    peer_ip: IPAddress

    @property
    def status(self) -> int:
        return self.response.status

    def header_values(self, name: str) -> list[str]:
        return self.response.headers.get_all(name) or []

    def read(self, size: int) -> bytes:
        return self.response.read(size)

    def set_timeout(self, timeout_seconds: float) -> None:
        if self.connection.sock is not None:
            self.connection.sock.settimeout(timeout_seconds)

    def close(self) -> None:
        self.response.close()
        self.connection.close()


class PinnedHttpConnector:
    def __init__(
        self,
        *,
        headers: Mapping[str, str] | None = None,
        ssl_context: ssl.SSLContext | None = None,
        clock: Clock = time.monotonic,
    ) -> None:
        self._headers = _sanitize_headers(headers or {})
        self._ssl_context = ssl_context or _create_isolated_ssl_context()
        self._clock = clock

    def open(
        self,
        target: AuthorizedTarget,
        approved_addresses: frozenset[IPAddress],
        timeout_seconds: float,
    ) -> ConnectedResponse:
        if not approved_addresses:
            raise DownloadSecurityError(
                "download_address",
                "The selected photo could not be retrieved safely.",
            )
        ordered_addresses = sorted(
            approved_addresses,
            key=lambda address: (address.version, address),
        )
        selected_address = ordered_addresses[0]
        connection = _PinnedHTTPConnection(
            target,
            selected_address,
            timeout_seconds,
            self._ssl_context,
            self._clock,
        )
        try:
            connection.connect()
            connection.apply_remaining_timeout()
            if connection.sock is None:
                raise OSError("connection did not provide a socket")
            peer_ip = ipaddress.ip_address(connection.sock.getpeername()[0])
            if peer_ip not in approved_addresses:
                raise DownloadSecurityError(
                    "download_address",
                    "The selected photo could not be retrieved safely.",
                )
            connection.request(
                "GET",
                target.request_target,
                headers={**self._headers, "Connection": "close"},
            )
            connection.apply_remaining_timeout()
            response = connection.getresponse()
            return _StandardConnectedResponse(connection, response, peer_ip)
        except DownloadSecurityError:
            connection.close()
            raise
        except (OSError, http.client.HTTPException, ssl.SSLError) as exc:
            connection.close()
            category = "download_timeout" if isinstance(exc, TimeoutError) else "download_network"
            message = (
                "The selected photo download timed out."
                if category == "download_timeout"
                else "The selected photo could not be downloaded."
            )
            raise DownloadSecurityError(
                category,
                message,
                fatal_to_scan=category == "download_timeout",
            ) from exc


class ScanDownloadBudget:
    def __init__(
        self,
        *,
        max_bytes: int = MAX_DOWNLOAD_BYTES_PER_SCAN,
        wall_seconds: float = MAX_SCAN_DOWNLOAD_WALL_SECONDS,
        clock: Clock = time.monotonic,
    ) -> None:
        self._max_bytes = max_bytes
        self._clock = clock
        self._deadline = clock() + wall_seconds
        self.bytes_charged = 0

    def check_deadline(self) -> None:
        self.remaining_seconds()

    def remaining_seconds(self) -> float:
        remaining = self._deadline - self._clock()
        if remaining <= 0:
            raise DownloadSecurityError(
                "download_timeout",
                "The selected photo download timed out.",
                fatal_to_scan=True,
            )
        return remaining

    def charge(self, count: int) -> None:
        self.check_deadline()
        if count < 0 or self.bytes_charged + count > self._max_bytes:
            raise DownloadSecurityError(
                "download_size",
                "The scan exceeded its download size limit.",
                fatal_to_scan=True,
            )
        self.bytes_charged += count

    def remaining_bytes(self) -> int:
        return self._max_bytes - self.bytes_charged

    def ensure_can_accept(self, count: int) -> None:
        if count < 0 or count > self.remaining_bytes():
            raise DownloadSecurityError(
                "download_size",
                "The scan exceeded its download size limit.",
                fatal_to_scan=True,
            )


class ItemDownloadBudget:
    def __init__(self, max_bytes: int, scan_budget: ScanDownloadBudget) -> None:
        self._max_bytes = max_bytes
        self._scan_budget = scan_budget
        self.bytes_charged = 0

    def check_deadline(self) -> None:
        self._scan_budget.check_deadline()

    def remaining_seconds(self) -> float:
        return self._scan_budget.remaining_seconds()

    def charge(self, count: int) -> None:
        if count < 0 or self.bytes_charged + count > self._max_bytes:
            raise DownloadSecurityError(
                "download_size",
                "The selected photo exceeded the download size limit.",
                fatal_to_scan=True,
            )
        self._scan_budget.charge(count)
        self.bytes_charged += count

    def can_accept(self, count: int) -> bool:
        return count >= 0 and self.bytes_charged + count <= self._max_bytes

    def ensure_can_accept(self, count: int) -> None:
        if not self.can_accept(count):
            raise DownloadSecurityError(
                "download_size",
                "The selected photo exceeded the download size limit.",
                fatal_to_scan=True,
            )
        self._scan_budget.ensure_can_accept(count)

    def remaining_bytes(self) -> int:
        return min(
            self._max_bytes - self.bytes_charged,
            self._scan_budget.remaining_bytes(),
        )


class DownloadPolicy:
    def __init__(
        self,
        *,
        allowed_hosts: list[str],
        host_overrides: Mapping[str, str] | None = None,
        allow_override_exceptions: bool = False,
    ) -> None:
        self._allowed_hosts = [host.strip().lower() for host in allowed_hosts if host.strip()]
        self._host_overrides = {
            host.strip().lower(): destination.strip()
            for host, destination in (host_overrides or {}).items()
            if host.strip() and destination.strip()
        }
        self._allow_override_exceptions = allow_override_exceptions

    def authorize(self, url: str) -> AuthorizedTarget:
        original = _parse_target(url, allow_fixture_http=False)
        if not _is_allowed_host(original.hostname, self._allowed_hosts):
            raise DownloadSecurityError(
                "download_host",
                "The selected photo uses a download host that is not allowed.",
            )
        override = self._host_overrides.get(original.hostname)
        if not override:
            return original
        if not self._allow_override_exceptions:
            raise DownloadSecurityError(
                "download_host",
                "The selected photo uses a download host that is not allowed.",
            )
        effective_url = _rewrite_download_url(url, override)
        target = _parse_target(effective_url, allow_fixture_http=True)
        return replace(target, allow_non_global=True)

    def validate_addresses(
        self,
        target: AuthorizedTarget,
        addresses: frozenset[IPAddress],
    ) -> None:
        if not addresses or (
            not target.allow_non_global and any(not address.is_global for address in addresses)
        ):
            raise DownloadSecurityError(
                "download_address",
                "The selected photo could not be retrieved safely.",
            )


class DownloadManager:
    def __init__(
        self,
        fetcher: DownloadFetcher | None = None,
        headers: dict[str, str] | None = None,
        timeout_seconds: float = MAX_DOWNLOAD_TIMEOUT_SECONDS,
        allowed_hosts: list[str] | None = None,
        host_overrides: dict[str, str] | None = None,
        allow_override_exceptions: bool = False,
        *,
        resolver: Resolver | None = None,
        connector: Connector | None = None,
        scan_budget: ScanDownloadBudget | None = None,
        max_item_bytes: int = MAX_DOWNLOAD_BYTES_PER_ITEM,
        max_redirects: int = MAX_DOWNLOAD_REDIRECTS,
    ) -> None:
        self._cache: dict[str, bytes] = {}
        self._fetcher = fetcher
        self._timeout_seconds = timeout_seconds
        self._policy = DownloadPolicy(
            allowed_hosts=allowed_hosts or [],
            host_overrides=host_overrides,
            allow_override_exceptions=allow_override_exceptions,
        )
        self._resolver = resolver or SocketResolver()
        self._connector = connector or PinnedHttpConnector(headers=headers)
        self._scan_budget = scan_budget or ScanDownloadBudget()
        self._max_item_bytes = max_item_bytes
        self._max_redirects = max_redirects
        self.download_count = 0

    def get_bytes(self, item: PhotoItem) -> bytes:
        if item.id in self._cache:
            return self._cache[item.id]
        data = self._fetcher(item) if self._fetcher else self._download(item)
        self._cache[item.id] = data
        self.download_count += 1
        return data

    def _download(self, item: PhotoItem) -> bytes:
        if not item.download_url:
            raise DownloadSecurityError(
                "download_url",
                "The selected photo did not include a download URL.",
            )
        item_budget = ItemDownloadBudget(self._max_item_bytes, self._scan_budget)
        current_url = item.download_url
        history: set[str] = set()
        redirects = 0

        while True:
            item_budget.check_deadline()
            target = self._policy.authorize(current_url)
            if target.url in history:
                raise DownloadSecurityError(
                    "download_redirect",
                    "The selected photo redirected unsafely.",
                    fatal_to_scan=True,
                )
            history.add(target.url)
            resolve_timeout = min(
                self._timeout_seconds,
                item_budget.remaining_seconds(),
            )
            addresses = self._resolver.resolve(
                target.hostname,
                target.port,
                resolve_timeout,
            )
            item_budget.check_deadline()
            self._policy.validate_addresses(target, addresses)
            attempt_timeout = min(
                self._timeout_seconds,
                item_budget.remaining_seconds(),
            )
            response = self._connector.open(target, addresses, attempt_timeout)
            try:
                item_budget.check_deadline()
                if response.peer_ip not in addresses:
                    raise DownloadSecurityError(
                        "download_address",
                        "The selected photo could not be retrieved safely.",
                    )
                if response.status in REDIRECT_STATUSES:
                    location_values = response.header_values("Location")
                    if len(location_values) != 1 or redirects >= self._max_redirects:
                        raise DownloadSecurityError(
                            "download_redirect",
                            "The selected photo redirected unsafely.",
                            fatal_to_scan=redirects >= self._max_redirects,
                        )
                    current_url = urljoin(current_url, location_values[0])
                    redirects += 1
                    continue
                if not 200 <= response.status < 300:
                    raise DownloadSecurityError(
                        "download_http",
                        "The selected photo could not be downloaded.",
                    )
                return _read_bounded_response(
                    response,
                    item_budget,
                    read_timeout_seconds=self._timeout_seconds,
                )
            finally:
                response.close()
                item_budget.check_deadline()


def validate_download_url(
    url: str,
    allowed_hosts: list[str],
    host_overrides: dict[str, str] | None = None,
    *,
    allow_override_exceptions: bool = False,
) -> None:
    policy = DownloadPolicy(
        allowed_hosts=allowed_hosts,
        host_overrides=host_overrides,
        allow_override_exceptions=allow_override_exceptions,
    )
    target = policy.authorize(url)
    addresses = SocketResolver().resolve(
        target.hostname,
        target.port,
        MAX_DOWNLOAD_TIMEOUT_SECONDS,
    )
    policy.validate_addresses(target, addresses)


def _read_bounded_response(
    response: ConnectedResponse,
    budget: ItemDownloadBudget,
    *,
    read_timeout_seconds: float,
) -> bytes:
    content_encodings = response.header_values("Content-Encoding")
    if content_encodings and (
        len(content_encodings) != 1 or content_encodings[0].strip().lower() != "identity"
    ):
        raise DownloadSecurityError(
            "download_encoding",
            "The selected photo used an unsupported content encoding.",
        )
    declared_length: int | None = None
    content_lengths = response.header_values("Content-Length")
    if len(content_lengths) == 1:
        try:
            declared_length = int(content_lengths[0])
        except ValueError:
            declared_length = None
        if declared_length is not None and declared_length >= 0:
            budget.ensure_can_accept(declared_length)
            if declared_length == 0:
                return b""
        else:
            declared_length = None

    data = bytearray()
    while True:
        remaining_seconds = budget.remaining_seconds()
        response.set_timeout(min(read_timeout_seconds, remaining_seconds))
        remaining_bytes = budget.remaining_bytes()
        if remaining_bytes <= 0:
            budget.ensure_can_accept(1)
        try:
            read_size = min(CHUNK_SIZE, remaining_bytes)
            if declared_length is not None:
                read_size = min(read_size, declared_length - len(data))
            chunk = response.read(read_size)
        except (OSError, http.client.HTTPException) as exc:
            category = "download_timeout" if isinstance(exc, TimeoutError) else "download_network"
            message = (
                "The selected photo download timed out."
                if category == "download_timeout"
                else "The selected photo could not be downloaded."
            )
            raise DownloadSecurityError(
                category,
                message,
                fatal_to_scan=category == "download_timeout",
            ) from exc
        if not chunk:
            return bytes(data)
        budget.ensure_can_accept(len(chunk))
        budget.charge(len(chunk))
        data.extend(chunk)
        if declared_length is not None and len(data) >= declared_length:
            return bytes(data)
        if budget.remaining_bytes() == 0:
            budget.ensure_can_accept(1)


def _parse_target(url: str, *, allow_fixture_http: bool) -> AuthorizedTarget:
    if (
        not isinstance(url, str)
        or not url
        or len(url) > MAX_URL_LENGTH
        or "#" in url
        or any(
            character.isspace() or ord(character) < 32 or ord(character) == 127 for character in url
        )
    ):
        raise DownloadSecurityError(
            "download_url",
            "The selected photo has an invalid download URL.",
        )
    try:
        parsed = urlsplit(url)
        hostname = parsed.hostname
        port = parsed.port
        username = parsed.username
        password = parsed.password
    except ValueError as exc:
        raise DownloadSecurityError(
            "download_url",
            "The selected photo has an invalid download URL.",
        ) from exc
    if (
        not hostname
        or parsed.fragment
        or username is not None
        or password is not None
        or parsed.scheme not in ({"https", "http"} if allow_fixture_http else {"https"})
    ):
        raise DownloadSecurityError(
            "download_url",
            "The selected photo has an invalid download URL.",
        )
    try:
        ascii_hostname = hostname.encode("ascii").decode("ascii").lower()
    except UnicodeError as exc:
        raise DownloadSecurityError(
            "download_url",
            "The selected photo has an invalid download URL.",
        ) from exc
    if (
        ascii_hostname != hostname.lower()
        or ascii_hostname.endswith(".")
        or not _is_valid_hostname(ascii_hostname)
    ):
        raise DownloadSecurityError(
            "download_url",
            "The selected photo has an invalid download URL.",
        )
    effective_port = port or (443 if parsed.scheme == "https" else 80)
    if not allow_fixture_http and effective_port != 443:
        raise DownloadSecurityError(
            "download_url",
            "The selected photo has an invalid download URL.",
        )
    path = parsed.path or "/"
    request_target = f"{path}?{parsed.query}" if parsed.query else path
    return AuthorizedTarget(
        url=urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, "")),
        scheme=parsed.scheme,
        hostname=ascii_hostname,
        port=effective_port,
        request_target=request_target,
    )


def _is_allowed_host(hostname: str, allowed_hosts: list[str]) -> bool:
    if hostname in allowed_hosts:
        return True
    return "googleusercontent.com" in allowed_hosts and bool(
        GOOGLEUSERCONTENT_MEDIA_HOST_RE.fullmatch(hostname)
    )


def _is_valid_hostname(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        pass
    if len(hostname) > 253:
        return False
    labels = hostname.split(".")
    return len(labels) >= 2 and all(
        label
        and len(label) <= 63
        and label[0].isalnum()
        and label[-1].isalnum()
        and all(character.isalnum() or character == "-" for character in label)
        for label in labels
    )


def _rewrite_download_url(url: str, override: str) -> str:
    parsed = urlsplit(url)
    override_parsed = urlsplit(override)
    if override_parsed.scheme:
        netloc = override_parsed.netloc or override_parsed.path
        return urlunsplit(
            SplitResult(
                override_parsed.scheme,
                netloc,
                parsed.path,
                parsed.query,
                "",
            )
        )
    return urlunsplit(SplitResult(parsed.scheme, override, parsed.path, parsed.query, ""))


def _sanitize_headers(headers: Mapping[str, str]) -> dict[str, str]:
    return {
        name: value
        for name, value in headers.items()
        if name.strip().lower() not in SENSITIVE_REQUEST_HEADERS
    }


def _create_isolated_ssl_context() -> ssl.SSLContext:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    tls_version = getattr(ssl, "TLSVersion", None)
    if tls_version is not None and hasattr(context, "minimum_version"):
        context.minimum_version = tls_version.TLSv1_2
    else:
        op_no_tlsv1 = getattr(ssl, "OP_NO_TLSv1", 0)
        op_no_tlsv1_1 = getattr(ssl, "OP_NO_TLSv1_1", 0)
        context.options |= op_no_tlsv1 | op_no_tlsv1_1
    context.check_hostname = True
    context.verify_mode = ssl.CERT_REQUIRED
    loaded_trust = False
    paths = ssl.get_default_verify_paths()
    if paths.openssl_cafile and os.path.isfile(paths.openssl_cafile):
        context.load_verify_locations(cafile=paths.openssl_cafile)
        loaded_trust = True
    if paths.openssl_capath and os.path.isdir(paths.openssl_capath):
        context.load_verify_locations(capath=paths.openssl_capath)
        loaded_trust = True
    enumerate_certificates = getattr(ssl, "enum_certificates", None)
    if callable(enumerate_certificates):
        for store_name in ("ROOT", "CA"):
            for certificate, encoding, _trust in enumerate_certificates(store_name):
                if encoding == "x509_asn":
                    context.load_verify_locations(cadata=certificate)
                    loaded_trust = True
    if not loaded_trust:
        raise DownloadSecurityError(
            "invalid_configuration",
            "No system certificate trust store is available for secure downloads.",
            fatal_to_scan=True,
        )
    return context


def _reject_private_addresses(hostname: str) -> None:
    target = AuthorizedTarget(
        url=f"https://{hostname}/",
        scheme="https",
        hostname=hostname,
        port=443,
        request_target="/",
    )
    addresses = SocketResolver().resolve(
        hostname,
        443,
        MAX_DOWNLOAD_TIMEOUT_SECONDS,
    )
    DownloadPolicy(allowed_hosts=[hostname]).validate_addresses(target, addresses)
