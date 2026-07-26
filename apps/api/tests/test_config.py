import pytest
from pydantic import ValidationError

from app.core.config import DeploymentMode, RuntimeEnvironment, Settings


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


def test_security_mode_and_environment_are_exact_enums():
    settings = Settings(deployment_mode="local_only", environment="test")

    assert settings.deployment_mode == DeploymentMode.LOCAL_ONLY
    assert settings.environment == RuntimeEnvironment.TEST

    for field, value in (
        ("deployment_mode", "multi_user"),
        ("environment", "prod"),
        ("environment", "PRODUCTION"),
    ):
        with pytest.raises(ValidationError):
            Settings(**{field: value})


def test_production_requires_explicit_allowlist():
    with pytest.raises(ValidationError, match="scan_allowed_download_hosts"):
        Settings(environment="production", scan_allowed_download_hosts=[])


def test_production_rejects_download_overrides_without_echoing_value():
    secret_override = "fixture.test:https://token-value.invalid"

    with pytest.raises(ValidationError) as caught:
        Settings(
            environment="production",
            scan_allowed_download_hosts=["lh3.googleusercontent.com"],
            scan_download_host_overrides={"fixture.test": secret_override},
        )

    message = str(caught.value)
    assert "scan_download_host_overrides" in message
    assert secret_override not in message


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "https://localhost:3000",
        "http://0.0.0.0:3000",
        "http://localhost:3000/path",
        "http://localhost:3000/",
        "http://localhost",
        "http://user@localhost:3000",
    ],
)
def test_production_rejects_unsafe_cors(origin):
    with pytest.raises(ValidationError, match="cors_origins"):
        Settings(
            environment="production",
            scan_allowed_download_hosts=["googleusercontent.com"],
            cors_origins=[origin],
        )


def test_production_allows_disabled_or_explicit_local_cors():
    disabled = Settings(
        environment="production",
        scan_allowed_download_hosts=["googleusercontent.com"],
        cors_origins=[],
    )
    explicit = Settings(
        environment="production",
        scan_allowed_download_hosts=["lh3.googleusercontent.com"],
        cors_origins=["http://127.0.0.1:3000"],
    )

    assert disabled.cors_origins == []
    assert explicit.cors_origins == ["http://127.0.0.1:3000"]


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("request_body_max_bytes", 0),
        ("scan_max_photos", 2001),
        ("scan_download_max_bytes_per_item", 50 * 1024 * 1024 + 1),
        ("scan_download_max_bytes_per_scan", 500 * 1024 * 1024 + 1),
        ("scan_download_max_redirects", 4),
        ("scan_download_timeout_seconds", 31),
        ("scan_download_timeout_seconds", float("nan")),
        ("scan_download_wall_seconds", 601),
        ("scan_concurrency_limit", 2),
        ("scan_admissions_per_minute", 6),
        ("api_requests_per_minute", 121),
    ],
)
def test_security_budgets_cannot_exceed_contract(field, value):
    with pytest.raises(ValidationError, match=field):
        Settings(**{field: value})
