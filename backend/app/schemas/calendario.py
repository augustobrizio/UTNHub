"""Schemas Pydantic del calendario academico."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TipoEventoLiteral = Literal["examen", "inscripcion", "feriado", "evento"]


class EventoCalendarioOut(BaseModel):
    """Evento expuesto por la API."""

    id: int
    titulo: str
    descripcion: str | None = None
    fecha_inicio: datetime
    fecha_fin: datetime | None = None
    tipo: TipoEventoLiteral
    carrera: str | None = None
    fuente_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ResultadoSincCalendario(BaseModel):
    """Resultado de POST ``/calendario/sincronizar``."""

    fuentes_procesadas: int = 0
    eventos_detectados: int = 0
    eventos_creados: int = 0
    eventos_actualizados: int = 0
    eventos_sin_cambios: int = 0
    advertencias: list[str] = Field(default_factory=list)
    errores: list[str] = Field(default_factory=list)
