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


class MateriaProfesorOut(BaseModel):
    """Asociacion catedra <-> profesor."""

    materia_codigo: str
    materia_nombre: str | None = None
    cargo: str | None = None
    anio: int | None = None


class ProfesorDetalleOut(BaseModel):
    """Vista completa de un profesor: datos + materias que dicta + horarios."""

    id: int
    nombre: str | None = None
    email: str | None = None
    materias: list[MateriaProfesorOut] = Field(default_factory=list)
    horarios_consulta: list[HorarioConsultaOut] = Field(default_factory=list)


class ProfesorListItem(BaseModel):
    """Item del listado: profesor + contadores rapidos."""

    id: int
    nombre: str | None = None
    email: str | None = None
    cantidad_materias: int = 0
    cantidad_horarios: int = 0


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


class ResultadoSincMails(BaseModel):
    """Resultado de POST ``/profesores/sincronizar-mails`` (sheet UTNTAC)."""

    filas_procesadas: int = Field(..., description="Filas con email valido en la sheet")
    emails_seteados: int = Field(
        ..., description="Profesores existentes a los que se les puso un email nuevo"
    )
    emails_ya_existentes: int = Field(
        ...,
        description=(
            "Profesores que ya tenían email; no se sobreescribe aunque la sheet "
            "traiga uno distinto."
        ),
    )
    profesores_creados: int = Field(
        ...,
        description="Profesores que no estaban en la DB y se insertaron con su email",
    )
    advertencias: list[str] = Field(default_factory=list)
    errores: list[str] = Field(default_factory=list)


class ResultadoSincCatedras(BaseModel):
    """Resultado de POST ``/profesores/sincronizar-catedras-utntac`` (sheet UTNTAC)."""

    filas_procesadas: int = Field(..., description="Pares (asignatura, profesor) de la sheet")
    profesores_creados: int = Field(
        ..., description="Profesores nuevos creados desde la sheet"
    )
    materia_profesor_creados: int = Field(
        ..., description="Asociaciones materia<->profesor nuevas insertadas"
    )
    materia_profesor_ya_existentes: int = Field(
        ..., description="Asociaciones que ya estaban en la DB; no se duplican"
    )
    reviews_creadas: int = Field(
        default=0, description="Reseñas (profesor×materia) nuevas insertadas"
    )
    reviews_actualizadas: int = Field(
        default=0, description="Reseñas existentes actualizadas"
    )
    asignaturas_no_mapeadas: list[str] = Field(
        default_factory=list,
        description=(
            "Asignaturas de la sheet que no matchearon contra el plan ISI "
            "(p.ej. FISICA I, INGLES II — pertenecen a otros deptos)."
        ),
    )
    errores: list[str] = Field(default_factory=list)
