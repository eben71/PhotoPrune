import json
import math
from collections.abc import Callable, Sequence
from enum import StrEnum
from functools import lru_cache
from json import JSONDecodeError
from typing import Any
from urllib.parse import urlsplit

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, EnvSettingsSource, SettingsConfigDict

from app.engine.limits import PICKER_MAX_ITEMS

SettingsSourceCallable = Callable[[], dict[str, Any]]

MAX_REQUEST_BODY_BYTES = 32 * 1024 * 1024
MAX_DOWNLOAD_BYTES_PER_ITEM = 50 * 1024 * 1024
MAX_DOWNLOAD_BYTES_PER_SCAN = 500 * 1024 * 1024
MAX_DOWNLOAD_REDIRECTS = 3
MAX_DOWNLOAD_TIMEOUT_SECONDS = 30.0
MAX_SCAN_DOWNLOAD_WALL_SECONDS = 10 * 60.0
MAX_CONCURRENT_SCANS = 1
MAX_SCAN_ADMISSIONS_PER_MINUTE = 5
MAX_API_REQUESTS_PER_MINUTE = 120
ALLOWED_LOCAL_CORS_PORTS = {3000}
GOOGLE_MEDIA_HOST_POLICY = "googleusercontent.com"


class DeploymentMode(StrEnum):
    LOCAL_ONLY = "local_only"


class RuntimeEnvironment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        hide_input_in_errors=True,
    )

    app_name: str = "PhotoPrune API"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/photoprune"
    redis_url: str = "redis://redis:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]
    deployment_mode: DeploymentMode = DeploymentMode.LOCAL_ONLY
    environment: RuntimeEnvironment = RuntimeEnvironment.LOCAL
    request_body_max_bytes: int = MAX_REQUEST_BODY_BYTES
    scan_max_photos: int = PICKER_MAX_ITEMS
    scan_consent_threshold: int = 200
    scan_allowed_download_hosts: list[str] = []
    scan_download_host_overrides: dict[str, str] = {}
    scan_download_max_bytes_per_item: int = MAX_DOWNLOAD_BYTES_PER_ITEM
    scan_download_max_bytes_per_scan: int = MAX_DOWNLOAD_BYTES_PER_SCAN
    scan_download_max_redirects: int = MAX_DOWNLOAD_REDIRECTS
    scan_download_timeout_seconds: float = MAX_DOWNLOAD_TIMEOUT_SECONDS
    scan_download_wall_seconds: float = MAX_SCAN_DOWNLOAD_WALL_SECONDS
    scan_concurrency_limit: int = MAX_CONCURRENT_SCANS
    scan_admissions_per_minute: int = MAX_SCAN_ADMISSIONS_PER_MINUTE
    api_requests_per_minute: int = MAX_API_REQUESTS_PER_MINUTE
    scan_dhash_threshold_very: int = 5
    scan_dhash_threshold_possible: int = 10
    scan_phash_threshold_very: int = 6
    scan_phash_threshold_possible: int = 12
    scan_cost_per_download: float = 0.0002
    scan_cost_per_byte_hash: float = 0.00005
    scan_cost_per_perceptual_hash: float = 0.00008
    scan_cost_per_comparison: float = 0.00001
    scan_small_input_fallback_max: int = 20
    scan_explain: bool = False
    project_db_path: str = "/tmp/photoprune_projects.db"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: Sequence[str] | str) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return [str(origin).strip() for origin in value if str(origin).strip()]

    @field_validator("scan_allowed_download_hosts", mode="before")
    @classmethod
    def split_allowed_hosts(cls, value: Sequence[str] | str) -> list[str]:
        if isinstance(value, str):
            stripped_value = value.strip()
            if not stripped_value:
                return []
            try:
                parsed = json.loads(stripped_value)
            except JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                hosts = [str(host).strip() for host in parsed if str(host).strip()]
            else:
                hosts = [host.strip() for host in value.split(",") if host.strip()]
        else:
            hosts = [str(host).strip() for host in value if str(host).strip()]
        return [_normalize_download_host(host) for host in hosts]

    @field_validator("scan_download_host_overrides", mode="before")
    @classmethod
    def parse_download_host_overrides(cls, value: Any) -> dict[str, str]:
        if isinstance(value, dict):
            return {
                str(key).strip(): str(val).strip() for key, val in value.items() if str(key).strip()
            }
        if isinstance(value, str):
            stripped_value = value.strip()
            if not stripped_value:
                return {}
            try:
                parsed = json.loads(stripped_value)
            except JSONDecodeError:
                parsed = None
            if isinstance(parsed, dict):
                return {
                    str(key).strip(): str(val).strip()
                    for key, val in parsed.items()
                    if str(key).strip()
                }
            overrides: dict[str, str] = {}
            for pair in stripped_value.split(","):
                if ":" not in pair:
                    continue
                src, dest = pair.split(":", 1)
                src = src.strip()
                dest = dest.strip()
                if src and dest:
                    overrides[src] = dest
            return overrides
        return {}

    @property
    def enforce_scan_limits(self) -> bool:
        return self.environment == RuntimeEnvironment.PRODUCTION

    @model_validator(mode="after")
    def validate_security_contract(self) -> "Settings":
        _validate_positive_ceiling(
            "request_body_max_bytes",
            self.request_body_max_bytes,
            MAX_REQUEST_BODY_BYTES,
        )
        _validate_positive_ceiling("scan_max_photos", self.scan_max_photos, PICKER_MAX_ITEMS)
        _validate_positive_ceiling(
            "scan_download_max_bytes_per_item",
            self.scan_download_max_bytes_per_item,
            MAX_DOWNLOAD_BYTES_PER_ITEM,
        )
        _validate_positive_ceiling(
            "scan_download_max_bytes_per_scan",
            self.scan_download_max_bytes_per_scan,
            MAX_DOWNLOAD_BYTES_PER_SCAN,
        )
        _validate_positive_ceiling(
            "scan_download_max_redirects",
            self.scan_download_max_redirects,
            MAX_DOWNLOAD_REDIRECTS,
        )
        _validate_positive_ceiling(
            "scan_download_timeout_seconds",
            self.scan_download_timeout_seconds,
            MAX_DOWNLOAD_TIMEOUT_SECONDS,
        )
        _validate_positive_ceiling(
            "scan_download_wall_seconds",
            self.scan_download_wall_seconds,
            MAX_SCAN_DOWNLOAD_WALL_SECONDS,
        )
        _validate_positive_ceiling(
            "scan_concurrency_limit",
            self.scan_concurrency_limit,
            MAX_CONCURRENT_SCANS,
        )
        _validate_positive_ceiling(
            "scan_admissions_per_minute",
            self.scan_admissions_per_minute,
            MAX_SCAN_ADMISSIONS_PER_MINUTE,
        )
        _validate_positive_ceiling(
            "api_requests_per_minute",
            self.api_requests_per_minute,
            MAX_API_REQUESTS_PER_MINUTE,
        )

        if self.environment != RuntimeEnvironment.PRODUCTION:
            return self
        if not self.scan_allowed_download_hosts:
            raise ValueError(
                "scan_allowed_download_hosts must explicitly allow required media hosts "
                "in production"
            )
        if any(not _is_canonical_download_host(host) for host in self.scan_allowed_download_hosts):
            raise ValueError(
                "scan_allowed_download_hosts must contain canonical exact hosts or "
                "googleusercontent.com in production"
            )
        if self.scan_download_host_overrides:
            raise ValueError("scan_download_host_overrides must be empty in production")
        for origin in self.cors_origins:
            if not _is_allowed_local_origin(origin):
                raise ValueError(
                    "cors_origins must be disabled or contain explicit localhost HTTP origins "
                    "on the supported local port in production"
                )
        return self

    @classmethod
    def settings_customise_sources(  # type: ignore[override]
        cls: type["Settings"],
        settings_cls: type["Settings"],
        init_settings: SettingsSourceCallable,
        env_settings: SettingsSourceCallable,
        dotenv_settings: SettingsSourceCallable,
        file_secret_settings: SettingsSourceCallable,
    ) -> tuple[SettingsSourceCallable, ...]:
        class CorsEnvSettingsSource(EnvSettingsSource):
            def decode_complex_value(self, field_name: str, field: Any, value: Any) -> Any:
                if field_name in {
                    "cors_origins",
                    "scan_allowed_download_hosts",
                    "scan_download_host_overrides",
                } and isinstance(value, str):
                    return value
                return super().decode_complex_value(field_name, field, value)

        return (
            init_settings,
            CorsEnvSettingsSource(settings_cls),
            dotenv_settings,
            file_secret_settings,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


def _normalize_download_host(host: str) -> str:
    normalized = host.rstrip(".").lower()
    if not normalized or any(character.isspace() for character in normalized):
        raise ValueError(
            "scan_allowed_download_hosts must contain canonical hostnames without whitespace"
        )
    return normalized


def _is_canonical_download_host(host: str) -> bool:
    if host == GOOGLE_MEDIA_HOST_POLICY:
        return True
    if len(host) > 253 or host.startswith(".") or host.endswith("."):
        return False
    labels = host.split(".")
    return len(labels) >= 2 and all(
        label
        and len(label) <= 63
        and label[0].isalnum()
        and label[-1].isalnum()
        and all(character.isalnum() or character == "-" for character in label)
        for label in labels
    )


def _is_allowed_local_origin(origin: str) -> bool:
    try:
        parsed = urlsplit(origin)
        port = parsed.port
    except ValueError:
        return False
    return (
        parsed.scheme == "http"
        and parsed.hostname in {"localhost", "127.0.0.1"}
        and port in ALLOWED_LOCAL_CORS_PORTS
        and parsed.username is None
        and parsed.password is None
        and not parsed.path
        and not parsed.query
        and not parsed.fragment
    )


def _validate_positive_ceiling(name: str, value: int | float, maximum: int | float) -> None:
    if not math.isfinite(float(value)) or value <= 0 or value > maximum:
        raise ValueError(f"{name} must be positive and no greater than the supported maximum")
