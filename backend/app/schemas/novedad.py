"""Schemas Pydantic de novedades."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CategoriaNovedadLiteral = Literal["evento", "aviso", "noticia", "general"]
EstadoNovedadLiteral = Literal["publicada", "pendiente", "descartada"]
FuenteNovedadLiteral = Literal["instagram", "utn_web"]


class ClasificacionNovedad(BaseModel):
    """Salida estructurada del clasificador IA para un item crudo.

    El LLM recibe la imagen (flyer/story) y/o el texto y completa este schema.
    ``es_novedad`` es el gate primario: si es ``False``, el item se descarta y
    no se publica (evita ruido como memes o promos de merch).
    """

    es_novedad: bool = Field(
        description=(
            "True solo si el contenido es información institucional/académica "
            "útil para estudiantes (paros, mesas, fechas, trámites, eventos, "
            "avisos). False para memes, saludos, promos de merch o contenido "
            "no informativo."
        )
    )
    categoria: CategoriaNovedadLiteral = Field(
        description="Categoría de la novedad."
    )
    titulo: str = Field(description="Título corto y claro (máx ~90 caracteres).")
    descripcion: str = Field(
        description="Resumen objetivo del contenido, sin inventar datos."
    )
    fecha_evento: date | None = Field(
        default=None,
        description=(
            "Fecha del evento/mesa/trámite si el contenido la menciona "
            "explícitamente; null si no hay una fecha clara."
        ),
    )
    confianza: float = Field(
        ge=0.0,
        le=1.0,
        description="Confianza de que la clasificación es correcta (0 a 1).",
    )
    motivo: str | None = Field(
        default=None,
        description="Si es_novedad=False, breve motivo del descarte.",
    )
    imagen_sugerida: str | None = Field(
        default=None,
        description=(
            "Nombre EXACTO de archivo, de la lista de imágenes genéricas "
            "provista, que mejor representa esta novedad. null si ninguna "
            "encaja. Se usa solo si la novedad no tiene imagen propia."
        ),
    )


class NovedadOut(BaseModel):
    """Novedad expuesta por la API de lectura."""

    id: int
    fuente: str | None = None
    origen: str | None = None
    titulo: str | None = None
    descripcion: str | None = None
    url: str | None = None
    imagen_url: str | None = None
    categoria: str | None = None
    estado: str
    confianza: float | None = None
    fecha_publicacion: datetime | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ModerarNovedadIn(BaseModel):
    """Cuerpo del PATCH de moderación."""

    estado: Literal["publicada", "descartada"]


class ResultadoFuente(BaseModel):
    """Contadores del pipeline para una fuente en una corrida."""

    fuente: str
    items_vistos: int = 0
    items_nuevos: int = 0
    items_novedad: int = 0
    items_descartados: int = 0
    estado: str = "ok"
    errores: list[str] = Field(default_factory=list)


class ResultadoIngesta(BaseModel):
    """Resultado de una corrida completa (POST ``/novedades/sincronizar``)."""

    fuentes: list[ResultadoFuente] = Field(default_factory=list)

    @property
    def items_creados(self) -> int:
        return sum(f.items_novedad for f in self.fuentes)
