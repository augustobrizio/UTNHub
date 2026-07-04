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

    # --- Clasificador IA de novedades (OpenAI vía LangChain) ---------------
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    # Modelo con visión + structured outputs. Default gpt-4o-mini
    # ($0.15/$0.60 por 1M): barato y clasifica bien el criterio del panel.
    # Probamos gpt-4.1-nano (más barato) pero descartaba novedades válidas
    # (p.ej. el programa de reincorporación), así que no compensa el ahorro.
    # gpt-4.1-mini es una opción si se necesita más precisión.
    novedades_llm_model: str = Field(
        default="gpt-4o-mini", alias="NOVEDADES_LLM_MODEL"
    )
    # Umbral de confianza para autopublicar (>=) vs dejar pendiente de
    # moderación. Por debajo del piso de descarte el item se descarta.
    novedades_umbral_publicar: float = Field(
        default=0.75, alias="NOVEDADES_UMBRAL_PUBLICAR"
    )
    # Tope de items que pasan al clasificador por corrida (control de costos,
    # RNF-11). Los items nuevos por encima del tope se difieren a la próxima.
    novedades_max_items_por_corrida: int = Field(
        default=40, alias="NOVEDADES_MAX_ITEMS_POR_CORRIDA"
    )

    # --- Fuente: Instagram (cuenta bot dedicada, sesión reusada) -----------
    instagram_usuario: str | None = Field(default=None, alias="INSTAGRAM_USUARIO")
    instagram_password: str | None = Field(default=None, alias="INSTAGRAM_PASSWORD")
    # Path al archivo de settings/sesión de instagrapi (se persiste para no
    # re-loguear en cada corrida — reduce el riesgo de baneo).
    instagram_session_path: str = Field(
        default="/data/instagram_session.json", alias="INSTAGRAM_SESSION_PATH"
    )
    # Handles de centros de estudiantes a seguir, separados por coma.
    instagram_handles: str = Field(default="", alias="INSTAGRAM_HANDLES")
    # Directorio donde se guardan las imágenes descargadas (evidencia / cita).
    novedades_media_dir: str = Field(
        default="/data/novedades_media", alias="NOVEDADES_MEDIA_DIR"
    )

    # --- Fuente: sitio web FRRO --------------------------------------------
    # URL de la sección de novedades/noticias de FRRO (a confirmar).
    utn_novedades_url: str | None = Field(default=None, alias="UTN_NOVEDADES_URL")

    # --- Scheduler (APScheduler in-process; desactivable en serverless) ----
    scheduler_enabled: bool = Field(default=False, alias="SCHEDULER_ENABLED")
    # Intervalo de ingesta por fuente, en horas (RNF-07: configurable por fuente).
    ingesta_instagram_horas: int = Field(
        default=6, alias="INGESTA_INSTAGRAM_HORAS"
    )
    ingesta_utn_web_horas: int = Field(default=24, alias="INGESTA_UTN_WEB_HORAS")

    @property
    def instagram_handles_list(self) -> list[str]:
        """Handles normalizados (sin ``@`` ni espacios, sin vacíos)."""
        return [
            h.strip().lstrip("@")
            for h in self.instagram_handles.split(",")
            if h.strip()
        ]

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
