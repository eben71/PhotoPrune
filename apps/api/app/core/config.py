from collections.abc import Sequence
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, EnvSettingsSource, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_parse_envars=False,
    )

    app_name: str = "PhotoPrune API"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/photoprune"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: Sequence[str] | str) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return list(value)

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        class CorsEnvSettingsSource(EnvSettingsSource):
            def decode_complex_value(self, field_name, field, value):  # type: ignore[override]
                if field_name == "cors_origins" and isinstance(value, str):
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
