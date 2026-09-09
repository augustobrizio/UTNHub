"""Schemas Pydantic de las mesas de examen.

La mesa se publica siempre con su **aviso**: el día y la hora son la
información que tiene el Departamento, y una cátedra puede moverla. El aviso
viaja en la respuesta (``AVISO_MESAS``) y no sólo en el HTML del frontend
porque el chatbot también responde con estos datos y tiene que arrastrar la
misma advertencia (RNF-12).
"""
from __future__ import annotations

from datetime import time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

DiaMesaLiteral = Literal["lunes", "martes", "miercoles", "jueves", "viernes"]

#: Texto único del aviso. Un solo lugar para que la web, la API y el chatbot
#: digan lo mismo.
AVISO_MESAS = (
    "Día y horario según la planilla del Departamento de Sistemas. "
    "Puede cambiar de un llamado a otro: confirmalo con tu cátedra antes de "
    "presentarte."
)


class MesaMateriaOut(BaseModel):
    """Una materia con el día y la hora en que se rinde su final."""

    materia_codigo: str
    dia_semana: DiaMesaLiteral
    hora: time | None = None
    nota: str | None = None
    #: ``seed`` (planilla del Departamento) o ``admin`` (corregido a mano).
    origen: str = "seed"

    #: Datos de la materia, aplanados: la lista se muestra por día y lo único
    #: que hace falta de la materia es cómo se llama y de qué año es.
    nombre: str
    anio_carrera: int | None = None
    tipo: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def desde_modelo(cls, mesa) -> "MesaMateriaOut":
        """Arma el schema desde ``MesaMateria`` con su materia precargada."""
        return cls(
            materia_codigo=mesa.materia_codigo,
            dia_semana=mesa.dia_semana,
            hora=mesa.hora,
            nota=mesa.nota,
            origen=mesa.origen,
            nombre=mesa.materia.nombre,
            anio_carrera=mesa.materia.anio_carrera,
            tipo=mesa.materia.tipo,
        )


class DiaMesaOut(BaseModel):
    """Las materias que se rinden un día de la semana, ordenadas por hora."""

    dia_semana: DiaMesaLiteral
    materias: list[MesaMateriaOut] = Field(default_factory=list)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total(self) -> int:
        return len(self.materias)


class DiaMesaConAvisoOut(DiaMesaOut):
    """Un día suelto, tal como lo pide el panel.

    Lleva el aviso porque se consume solo: quien muestre esta lista sin la
    semana alrededor tiene que poder mostrar también la advertencia.
    """

    aviso: str = AVISO_MESAS


class MesasSemanaOut(BaseModel):
    """La semana de mesas completa: lunes a viernes, con el aviso."""

    dias: list[DiaMesaOut] = Field(default_factory=list)
    #: Materias del plan que todavía no tienen día cargado. Se muestran aparte
    #: para que se vea que faltan, en vez de que desaparezcan del listado.
    sin_asignar: list[str] = Field(default_factory=list)
    aviso: str = AVISO_MESAS


class MesaMateriaIn(BaseModel):
    """Alta o corrección de la mesa de una materia (admin)."""

    dia_semana: DiaMesaLiteral
    hora: time | None = None
    nota: str | None = Field(default=None, max_length=300)
