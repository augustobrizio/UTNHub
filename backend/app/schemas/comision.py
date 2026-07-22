"""Schemas Pydantic para comisiones, cursadas y horarios."""
from __future__ import annotations

from datetime import time
from typing import Literal

from pydantic import BaseModel, ConfigDict


class HorarioOut(BaseModel):
    dia: str | None
    hora_inicio: time | None
    hora_fin: time | None
    aula: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ProfesorMiniOut(BaseModel):
    """Vista minima de un profesor para embeber en una cursada."""

    id: int
    nombre: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CursadaOut(BaseModel):
    id: int
    materia_codigo: str
    materia_nombre: str | None = None
    cuatrimestre: int | None
    # Cuatrimestre real de la materia en el plan: "1" | "2" | "anual" | "1 y 2".
    # La vista de comisiones agrupa por este valor (no por el 1/2 de la cursada,
    # que para materias anuales aparece cargado en ambos cuatrimestres).
    cuatrimestre_materia: str | None = None
    docente: str | None = None
    # Profesor real resuelto (None si el docente fue ambiguo o no matcheo).
    # Se conserva ``docente`` como fallback.
    profesor: ProfesorMiniOut | None = None
    # Reseña (profesor×materia) desde UTNTAC. Null si no hay reseña.
    nota: float | None = None  # 1–5 (promedio ponderado de votos)
    clasificacion: str | None = None  # p.ej. "Super Recomendado"
    cantidad_respuestas: int | None = None
    horarios: list[HorarioOut] = []

    model_config = ConfigDict(from_attributes=True)


class ComisionOut(BaseModel):
    id: int
    nombre: str | None
    anio: int | None
    # Score de la comisión: promedio de las notas de sus cátedras con reseña.
    # Null si ninguna la tiene. ``score_con_review``/``score_total`` = cobertura.
    score: float | None = None
    score_con_review: int = 0
    score_total: int = 0
    cursadas: list[CursadaOut] = []

    model_config = ConfigDict(from_attributes=True)


class MateriaCursableOut(BaseModel):
    """Una materia cursable con todas sus comisiones disponibles para ese cuatrimestre."""

    materia_codigo: str
    materia_nombre: str
    anio_carrera: int | None = None
    es_anual: bool = False
    cursada_seleccionada_id: int | None = None
    comisiones: list[ComisionCursadaOut] = []

    model_config = ConfigDict(from_attributes=True)


class ComisionCursadaOut(BaseModel):
    """Una comisión con la cursada específica de una materia (para el builder)."""

    comision_id: int
    comision_nombre: str | None
    cursada_id: int
    docente: str | None = None
    horarios: list[HorarioOut] = []

    model_config = ConfigDict(from_attributes=True)


# Fix forward reference
MateriaCursableOut.model_rebuild()


class SeleccionarCursadaIn(BaseModel):
    """Payload para que un usuario elija su cursada."""

    cursada_id: int


# ---------------------------------------------------------------------------
# Optimizador de horarios
# ---------------------------------------------------------------------------

Criterio = Literal["huecos", "dias", "turno"]
Turno = Literal["manana", "tarde", "noche"]


class OptimizarHorarioIn(BaseModel):
    """Pedido de optimización: materias a cursar + criterio."""

    materias: list[str]
    anio: int = 2025
    cuatrimestre: int
    criterio: Criterio = "huecos"
    # Sólo para criterio "dias": día que se prefiere dejar libre (ej. "lunes").
    dia_libre: str | None = None
    # Sólo para criterio "turno": franja preferida.
    turno: Turno | None = None


class AsignacionOut(BaseModel):
    """Comisión elegida por el optimizador para una materia."""

    materia_codigo: str
    materia_nombre: str
    comision_id: int
    comision_nombre: str | None
    cursada_id: int
    horarios: list[HorarioOut] = []


class OptimizacionOut(BaseModel):
    """Resultado de la optimización."""

    ok: bool
    motivo: str | None = None
    criterio: Criterio = "huecos"
    total_huecos_min: int = 0
    dias_usados: int = 0
    combinaciones_evaluadas: int = 0
    materias_sin_comision: list[str] = []
    asignaciones: list[AsignacionOut] = []
    # Sólo para criterio "dias" con día libre pedido:
    dia_libre_ok: bool = True               # ¿se pudo liberar el día pedido?
    dias_libres_posibles: list[str] = []    # días que sí se pueden liberar
