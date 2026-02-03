import json
from collections.abc import Callable, Sequence
from functools import lru_cache
from json import JSONDecodeError
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, EnvSettingsSource, SettingsConfigDict

SettingsSourceCallable = Callable[[], dict[str, Any]]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    app_name: str = "PhotoPrune API"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/photoprune"
    redis_url: str = "redis://redis:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]
    environment: str = "local"
    scan_max_photos: int = 250
    scan_consent_threshold: int = 200
    scan_allowed_download_hosts: list[str] = []
    scan_download_host_overrides: dict[str, str] = {}
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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: Sequence[str] | str) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return list(value)

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
                return [str(host).strip() for host in parsed if str(host).strip()]
            return [host.strip() for host in value.split(",") if host.strip()]
        return list(value)

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
        return self.environment.lower() == "prod"

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
