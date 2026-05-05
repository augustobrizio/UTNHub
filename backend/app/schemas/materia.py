"""Schemas Pydantic para el dominio académico.

Estos DTOs son la frontera entre la capa de presentación (FastAPI) y la
de negocio (services). Nunca exponemos modelos SQLAlchemy directamente.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.academico import CondicionMateria

TipoMateriaLiteral = Literal["troncal", "electiva"]
TipoCorrelativaLiteral = Literal["regular", "aprobada"]
EstadoMateriaLiteral = Literal["aprobado", "regular", "cursando", "cursable", "libre"]


# ---------------------------------------------------------------------------
# Recursos básicos
# ---------------------------------------------------------------------------
class MateriaOut(BaseModel):
    """Vista pública de una materia."""

    codigo: str
    nombre: str
    anio_carrera: int | None = None
    cuatrimestre: int | None = None
    horas: int | None = None
    creditos: int | None = None
    tipo: TipoMateriaLiteral | None = None

    model_config = ConfigDict(from_attributes=True)


class CorrelativaOut(BaseModel):
    """Una arista de correlatividad: ``materia`` requiere ``requerida``."""

    materia_codigo: str
    materia_requerida: str
    tipo: TipoCorrelativaLiteral

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Grafo (lo que consume el frontend para pintar el árbol)
# ---------------------------------------------------------------------------
class MateriaNodo(BaseModel):
    """Nodo del grafo: una materia con su estado para el usuario."""

    codigo: str
    nombre: str
    anio_carrera: int | None = None
    cuatrimestre: int | None = None
    horas: int | None = None
    tipo: TipoMateriaLiteral | None = None
    estado: EstadoMateriaLiteral = Field(
        ...,
        description=(
            "Estado calculado para el usuario: aprobado, regular, cursando, "
            "cursable (cumple correlativas para anotarse) o libre (todavía no)."
        ),
    )
    nota: float | None = None


class CorrelativaEdge(BaseModel):
    """Arista del grafo: una correlativa entre dos materias."""

    desde: str = Field(..., description="codigo de la materia requerida (origen)")
    hacia: str = Field(..., description="codigo de la materia que la requiere")
    tipo: TipoCorrelativaLiteral


class ContadoresGrafo(BaseModel):
    """Contadores que muestra la barra superior (4/36, 11.1%, etc.)."""

    aprobadas: int
    regulares: int
    cursando: int
    cursables: int
    libres: int
    total: int
    porcentaje_aprobadas: float


class GrafoResponse(BaseModel):
    """Respuesta del endpoint del grafo (una pestaña: troncales o electivas)."""

    tipo: TipoMateriaLiteral
    nodos: list[MateriaNodo]
    edges: list[CorrelativaEdge]
    contadores: ContadoresGrafo


# ---------------------------------------------------------------------------
# Inscripción / validación
# ---------------------------------------------------------------------------
class FaltanteCorrelativa(BaseModel):
    """Una correlativa que el usuario aún no cumple."""

    materia_requerida: str
    nombre: str
    requiere: TipoCorrelativaLiteral = Field(
        ..., description="Condición mínima requerida"
    )
    tiene: CondicionMateria = Field(
        ..., description="Condición actual del usuario sobre esa correlativa"
    )


class ValidacionCorrelativas(BaseModel):
    """Resultado de validar si un usuario puede cursar/rendir una materia."""

    materia_codigo: str
    accion: Literal["cursar", "rendir"]
    permitido: bool
    faltantes: list[FaltanteCorrelativa] = Field(default_factory=list)
    motivo: str | None = None
