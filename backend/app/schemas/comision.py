"""Schemas Pydantic para comisiones, cursadas y horarios."""
from __future__ import annotations

from datetime import time

from pydantic import BaseModel, ConfigDict


class HorarioOut(BaseModel):
    dia: str | None
    hora_inicio: time | None
    hora_fin: time | None
    aula: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CursadaOut(BaseModel):
    id: int
    materia_codigo: str
    materia_nombre: str | None = None
    cuatrimestre: int | None
    docente: str | None = None
    horarios: list[HorarioOut] = []

    model_config = ConfigDict(from_attributes=True)


class ComisionOut(BaseModel):
    id: int
    nombre: str | None
    anio: int | None
    cursadas: list[CursadaOut] = []

    model_config = ConfigDict(from_attributes=True)


class MateriaCursableOut(BaseModel):
    """Una materia cursable con todas sus comisiones disponibles para ese cuatrimestre."""

    materia_codigo: str
    materia_nombre: str
    anio_carrera: int | None = None
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
