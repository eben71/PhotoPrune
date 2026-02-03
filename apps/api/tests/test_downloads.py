from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.engine import downloads
from app.engine.models import PhotoItem


def test_validate_download_url_rejects_non_https():
    with pytest.raises(ValueError):
        downloads.validate_download_url("http://photos.google.com/unsafe", ["photos.google.com"])


def test_validate_download_url_rejects_private_ip():
    with pytest.raises(ValueError):
        downloads.validate_download_url("https://127.0.0.1/metadata", ["photos.google.com"])


def test_validate_download_url_allows_google_host(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(downloads, "_reject_private_addresses", lambda _: None)
    downloads.validate_download_url("https://photos.google.com/lr/abc", ["photos.google.com"])


def test_validate_download_url_allows_googleusercontent_media_host(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(downloads, "_reject_private_addresses", lambda _: None)
    downloads.validate_download_url(
        "https://lh4.googleusercontent.com/abc",
        ["googleusercontent.com"],
    )


def test_validate_download_url_rejects_unknown_host(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(downloads, "_reject_private_addresses", lambda _: None)
    with pytest.raises(ValueError):
        downloads.validate_download_url("https://example.com/file", ["photos.google.com"])


def test_validate_download_url_rejects_missing_hostname():
    with pytest.raises(ValueError):
        downloads.validate_download_url("https://", ["photos.google.com"])


def test_is_allowed_host_supports_exact_hosts_only():
    assert downloads._is_allowed_host("photos.google.com", ["photos.google.com"])
    assert not downloads._is_allowed_host("a.photos.google.com", ["photos.google.com"])
    assert downloads._is_allowed_host("photos.google.com", [])


def test_is_allowed_host_allows_googleusercontent_media_hosts_with_opt_in():
    assert downloads._is_allowed_host("lh4.googleusercontent.com", ["googleusercontent.com"])
    assert downloads._is_allowed_host("lh5.googleusercontent.com", [".googleusercontent.com"])
    assert not downloads._is_allowed_host("foo.googleusercontent.com", ["googleusercontent.com"])


def test_validate_download_url_applies_host_override(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(downloads, "_reject_private_addresses", lambda _: None)
    downloads.validate_download_url(
        "https://Example.Test/media/item",
        ["photos.google.com"],
        {"example.test": "photos.google.com"},
    )


def test_validate_download_url_allows_http_with_override_exceptions(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(downloads, "_reject_private_addresses", lambda _: None)
    downloads.validate_download_url(
        "http://example.test/media/item",
        ["photos.google.com"],
        {"example.test": "http://localhost:8001"},
        allow_override_exceptions=True,
    )


def test_reject_private_addresses_blocks_resolved_private_ip(monkeypatch: pytest.MonkeyPatch):
    def fake_getaddrinfo(_: str, __: int | None):
        return [(None, None, None, None, ("10.0.0.1", 0))]

    monkeypatch.setattr(downloads.socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(ValueError):
        downloads._reject_private_addresses("photos.google.com")


def test_download_manager_uses_default_fetcher_and_caches(monkeypatch: pytest.MonkeyPatch):
    calls: list[tuple[str, float, list[str], str, bool]] = []

    def fake_fetcher(
        item: PhotoItem,
        *,
        headers: dict[str, str],
        timeout_seconds: float,
        allowed_hosts: list[str],
        host_overrides: dict[str, str],
        allow_override_exceptions: bool,
    ) -> bytes:
        calls.append(
            (
                headers["X-Test"],
                timeout_seconds,
                allowed_hosts,
                item.id,
                allow_override_exceptions,
            )
        )
        return b"payload"

    monkeypatch.setattr(downloads, "_default_fetcher", fake_fetcher)
    manager = downloads.DownloadManager(
        headers={"X-Test": "ok"},
        timeout_seconds=12.5,
        allowed_hosts=["photos.google.com"],
        allow_override_exceptions=True,
    )
    item = PhotoItem(
        id="photo-1",
        create_time=datetime(2024, 1, 1, tzinfo=UTC),
        filename="photo.jpg",
        mime_type="image/jpeg",
        width=100,
        height=100,
        gps=None,
        download_url="https://photos.google.com/photo-1",
        deep_link=None,
    )

    assert manager.get_bytes(item) == b"payload"
    assert manager.get_bytes(item) == b"payload"
    assert manager.download_count == 1
    assert calls == [("ok", 12.5, ["photos.google.com"], "photo-1", True)]


def test_download_manager_fixture_bytes_loads_from_disk(tmp_path: Path):
    payload = b"fixture-bytes"
    (tmp_path / "photo-1.jpg").write_bytes(payload)
    calls: list[str] = []

    def fake_fetcher(_: PhotoItem) -> bytes:
        calls.append("network")
        return b"network"

    manager = downloads.DownloadManager(
        fetcher=fake_fetcher,
        fixture_bytes_dir=str(tmp_path),
    )
    item = _photo_item("photo-1", "https://photos.google.com/photo-1")

    assert manager.get_bytes(item) == payload
    assert calls == []
    assert manager.download_count == 1


def test_download_manager_fixture_bytes_strict_missing(tmp_path: Path):
    calls: list[str] = []

    def fake_fetcher(_: PhotoItem) -> bytes:
        calls.append("network")
        return b"network"

    manager = downloads.DownloadManager(
        fetcher=fake_fetcher,
        fixture_bytes_dir=str(tmp_path),
        fixture_bytes_strict=True,
    )
    item = _photo_item("photo-2", "https://photos.google.com/photo-2")

    with pytest.raises(ValueError, match="Fixture bytes missing"):
        manager.get_bytes(item)
    assert calls == []


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
