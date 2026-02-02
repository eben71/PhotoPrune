from app.core.config import Settings


def test_scan_allowed_download_hosts_accepts_json_array(monkeypatch):
    monkeypatch.setenv(
        "SCAN_ALLOWED_DOWNLOAD_HOSTS",
        '["lh3.googleusercontent.com", "photos.google.com"]',
    )

    settings = Settings()

    assert settings.scan_allowed_download_hosts == [
        "lh3.googleusercontent.com",
        "photos.google.com",
    ]


def test_scan_allowed_download_hosts_accepts_csv(monkeypatch):
    monkeypatch.setenv(
        "SCAN_ALLOWED_DOWNLOAD_HOSTS",
        "lh3.googleusercontent.com, photos.google.com",
    )

    settings = Settings()

    assert settings.scan_allowed_download_hosts == [
        "lh3.googleusercontent.com",
        "photos.google.com",
    ]


def test_scan_allowed_download_hosts_accepts_empty(monkeypatch):
    monkeypatch.setenv("SCAN_ALLOWED_DOWNLOAD_HOSTS", "")

    settings = Settings()

    assert settings.scan_allowed_download_hosts == []


def test_scan_download_host_overrides_accepts_csv(monkeypatch):
    monkeypatch.setenv(
        "SCAN_DOWNLOAD_HOST_OVERRIDES",
        "example.test:photos.google.com,foo.test:lh3.googleusercontent.com",
    )

    settings = Settings()

    assert settings.scan_download_host_overrides == {
        "example.test": "photos.google.com",
        "foo.test": "lh3.googleusercontent.com",
    }


def test_scan_download_host_overrides_accepts_json(monkeypatch):
    monkeypatch.setenv(
        "SCAN_DOWNLOAD_HOST_OVERRIDES",
        '{"example.test":"photos.google.com","foo.test":"lh3.googleusercontent.com"}',
    )

    settings = Settings()

    assert settings.scan_download_host_overrides == {
        "example.test": "photos.google.com",
        "foo.test": "lh3.googleusercontent.com",
    }
