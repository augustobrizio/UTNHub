"""Configuración global de la aplicación.

Lee variables del entorno (cargadas desde backend/.env) usando
pydantic-settings para tipado y validación.
"""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings de la app.

    Las variables sensibles vienen de `.env` (gitignored). El template
    está en `.env.example`.
    """

    database_url: str = Field(..., alias="DATABASE_URL")
    environment: str = Field(default="dev", alias="ENVIRONMENT")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Devuelve un singleton de Settings (cacheado)."""
    return Settings()  # type: ignore[call-arg]
