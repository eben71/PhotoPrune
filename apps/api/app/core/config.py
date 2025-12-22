from functools import lru_cache
from typing import List, Sequence

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "PhotoPrune API"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/photoprune"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: List[str] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: Sequence[str] | str) -> List[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return list(value)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
