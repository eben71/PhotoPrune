from __future__ import annotations

import ipaddress
import logging
import re
import socket
import urllib.error
import urllib.request
from collections.abc import Callable
from functools import partial
from typing import cast
from urllib.parse import urlparse

from app.engine.models import PhotoItem

DownloadFetcher = Callable[[PhotoItem], bytes]

logger = logging.getLogger(__name__)
GOOGLEUSERCONTENT_MEDIA_HOST_RE = re.compile(r"^lh\d+\.googleusercontent\.com$", re.IGNORECASE)


class DownloadManager:
    def __init__(
        self,
        fetcher: DownloadFetcher | None = None,
        headers: dict[str, str] | None = None,
        timeout_seconds: float = 30.0,
        allowed_hosts: list[str] | None = None,
        host_overrides: dict[str, str] | None = None,
        allow_override_exceptions: bool = False,
    ) -> None:
        self._cache: dict[str, bytes] = {}
        self._headers = headers or {}
        self._timeout_seconds = timeout_seconds
        self._allowed_hosts = allowed_hosts or []
        self._host_overrides = host_overrides or {}
        self._allow_override_exceptions = allow_override_exceptions
        self._fetcher = fetcher or partial(
            _default_fetcher,
            headers=self._headers,
            timeout_seconds=self._timeout_seconds,
            allowed_hosts=self._allowed_hosts,
            host_overrides=self._host_overrides,
            allow_override_exceptions=self._allow_override_exceptions,
        )
        self.download_count = 0

    def get_bytes(self, item: PhotoItem) -> bytes:
        if item.id in self._cache:
            return self._cache[item.id]
        data = self._fetcher(item)
        self._cache[item.id] = data
        self.download_count += 1
        return data


def _default_fetcher(
    item: PhotoItem,
    *,
    headers: dict[str, str],
    timeout_seconds: float,
    allowed_hosts: list[str],
    host_overrides: dict[str, str],
    allow_override_exceptions: bool,
) -> bytes:
    if not item.download_url:
        raise ValueError(f"Photo item {item.id} missing download URL")
    effective_url = _rewrite_download_url(item.download_url, host_overrides)
    validate_download_url(
        item.download_url,
        allowed_hosts,
        host_overrides=host_overrides,
        allow_override_exceptions=allow_override_exceptions,
    )
    request = urllib.request.Request(effective_url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            return cast(bytes, response.read())
    except urllib.error.HTTPError as exc:
        parsed = urlparse(effective_url)
        hostname = parsed.hostname.lower() if parsed.hostname else "unknown"
        raise ValueError(
            f"Download failed for host '{hostname}' with status {exc.code}. "
            f"{_download_guidance()}"
        ) from exc
    except urllib.error.URLError as exc:
        parsed = urlparse(effective_url)
        hostname = parsed.hostname.lower() if parsed.hostname else "unknown"
        raise ValueError(f"Download failed for host '{hostname}'. {_download_guidance()}") from exc


def validate_download_url(
    url: str,
    allowed_hosts: list[str],
    host_overrides: dict[str, str] | None = None,
    *,
    allow_override_exceptions: bool = False,
) -> None:
    overrides = host_overrides or {}
    original_parsed = urlparse(url)
    original_hostname = original_parsed.hostname.lower() if original_parsed.hostname else ""
    if original_hostname == "host.docker.internal":
        raise ValueError(
            "Download URL host 'host.docker.internal' is not allowed. " f"{_download_guidance()}"
        )
    override_applied = _has_host_override(original_hostname, overrides)
    effective_url = _rewrite_download_url(url, overrides)
    parsed = urlparse(effective_url)
    if parsed.scheme != "https" and not (override_applied and allow_override_exceptions):
        raise ValueError("Download URL must use https.")
    if not parsed.hostname:
        raise ValueError("Download URL is missing a hostname.")
    hostname = parsed.hostname.lower()
    if not _is_allowed_host(hostname, allowed_hosts) and not (
        override_applied and allow_override_exceptions
    ):
        logger.warning("Rejected download URL host: %s", hostname)
        raise ValueError(f"Download URL host '{hostname}' is not allowed. {_download_guidance()}")
    if not (override_applied and allow_override_exceptions):
        _reject_private_addresses(hostname)


def _is_allowed_host(hostname: str, allowed_hosts: list[str]) -> bool:
    if not allowed_hosts:
        return True
    normalized = [allowed.strip().lower() for allowed in allowed_hosts if allowed.strip()]
    if hostname in normalized:
        return True
    if _allows_googleusercontent_media_hosts(normalized):
        return bool(GOOGLEUSERCONTENT_MEDIA_HOST_RE.match(hostname))
    return False


def _allows_googleusercontent_media_hosts(allowed_hosts: list[str]) -> bool:
    return any(
        host in {"googleusercontent.com", ".googleusercontent.com"} for host in allowed_hosts
    )


def _rewrite_download_url(url: str, host_overrides: dict[str, str]) -> str:
    if not host_overrides:
        return url
    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        return url
    override = _get_host_override(hostname, host_overrides)
    if not override or override == hostname:
        return url
    override_parsed = urlparse(override)
    if override_parsed.scheme:
        netloc = override_parsed.netloc or override_parsed.path
        return parsed._replace(scheme=override_parsed.scheme, netloc=netloc).geturl()
    netloc = override
    if parsed.port is not None:
        netloc = f"{override}:{parsed.port}"
    return parsed._replace(netloc=netloc).geturl()


def _get_host_override(hostname: str, host_overrides: dict[str, str]) -> str | None:
    return host_overrides.get(hostname) or host_overrides.get(hostname.lower())


def _has_host_override(hostname: str, host_overrides: dict[str, str]) -> bool:
    return _get_host_override(hostname, host_overrides) is not None


def _download_guidance() -> str:
    return "Regenerate fixtures without obfuscating downloadUrl host."


def _reject_private_addresses(hostname: str) -> None:
    try:
        ip_address = ipaddress.ip_address(hostname)
        _raise_if_private(ip_address)
        return
    except ValueError:
        pass

    for result in socket.getaddrinfo(hostname, None):
        ip_str = result[4][0]
        ip_address = ipaddress.ip_address(ip_str)
        _raise_if_private(ip_address)


def _raise_if_private(ip_address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
    if not ip_address.is_global:
        raise ValueError("Download URL resolves to a non-global address.")
