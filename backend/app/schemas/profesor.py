"""Schemas Pydantic del dominio profesor."""
from __future__ import annotations

from datetime import time

from pydantic import BaseModel, ConfigDict, Field


class ProfesorOut(BaseModel):
    """Vista publica de un profesor."""

    id: int
    nombre: str | None = None
    email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class HorarioConsultaOut(BaseModel):
    """Vista publica de un horario de consulta."""

    id: int
    profesor_id: int
    dia: str | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    modalidad: str | None = None
    aula: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ResultadoSincHorarios(BaseModel):
    """Resultado de POST ``/profesores/sincronizar-horarios``."""

    profesores_tocados: int = Field(
        ..., description="Profesores creados o reutilizados"
    )
    horarios_borrados: int = Field(
        ..., description="Filas de horario_consulta eliminadas en el full refresh"
    )
    horarios_creados: int = Field(
        ..., description="Filas de horario_consulta insertadas"
    )
    materia_profesor_borrados: int = Field(
        ..., description="Filas de materia_profesor eliminadas en el full refresh"
    )
    materia_profesor_creados: int = Field(
        ..., description="Asociaciones materia<->profesor insertadas"
    )
    advertencias: list[str] = Field(
        default_factory=list,
        description=(
            "Casos no bloqueantes, p.ej. nombres de materia que no matchearon "
            "con confianza >= 0.72 contra el plan de estudios."
        ),
    )
    errores: list[str] = Field(default_factory=list)
