"""Reglas de las mesas de examen: qué se rinde cada día de la semana.

La mesa de FRRO no reparte materias por fecha sino por día de la semana. Este
service es el único lugar que sabe eso: arma la semana lunes-viernes, decide
qué materias quedan "sin asignar" y valida lo que carga el admin.

El cruce con el calendario —qué semanas del año hay mesa— sigue viviendo en
``calendario_service``. Acá no se mira ninguna fecha.
"""
from __future__ import annotations

from datetime import time

from sqlalchemy.orm import Session

from app.core.plan import DIAS_MESA
from app.db.models.academico import MesaMateria
from app.repositories import materia_repo
from app.schemas.mesa import DiaMesaOut, MesaMateriaOut, MesasSemanaOut


class DiaInvalido(ValueError):
    """El día no es uno de los días en que se toma mesa."""


class MateriaInexistente(ValueError):
    """La materia no está en el plan."""


def _validar_dia(dia: str) -> str:
    """Normaliza y valida el día. Los schemas ya restringen el literal, pero
    el service se valida solo: el seed y el chatbot no pasan por Pydantic."""
    normalizado = (dia or "").strip().lower()
    if normalizado not in DIAS_MESA:
        raise DiaInvalido(f"'{dia}' no es un día de mesa ({', '.join(DIAS_MESA)}).")
    return normalizado


def listar_mesas(
    db: Session, *, tipo: str | None = None, anio: int | None = None
) -> list[MesaMateria]:
    """Todas las mesas cargadas, ordenadas por día y hora."""
    return list(materia_repo.list_mesas(db, tipo=tipo, anio=anio))


def mesas_del_dia(db: Session, dia: str) -> list[MesaMateria]:
    """Lo que se rinde un día de la semana, ordenado por hora."""
    return list(materia_repo.list_mesas(db, dia=_validar_dia(dia)))


def semana_de_mesas(
    db: Session, *, tipo: str | None = None, anio: int | None = None
) -> MesasSemanaOut:
    """La semana completa: los cinco días, cada uno con sus materias.

    Los días sin materias se devuelven igual, vacíos: la vista muestra una
    semana entera y un día que no aparece se lee como un error de carga y no
    como "ese día no se rinde nada".
    """
    mesas = materia_repo.list_mesas(db, tipo=tipo, anio=anio)

    por_dia: dict[str, list[MesaMateriaOut]] = {d: [] for d in DIAS_MESA}
    for mesa in mesas:
        # Un día fuera de los hábiles sólo puede venir de una carga vieja o
        # editada a mano en la DB. Se ignora en vez de romper la semana.
        if mesa.dia_semana in por_dia:
            por_dia[mesa.dia_semana].append(MesaMateriaOut.desde_modelo(mesa))

    return MesasSemanaOut(
        dias=[DiaMesaOut(dia_semana=d, materias=por_dia[d]) for d in DIAS_MESA],
        sin_asignar=_materias_sin_mesa(db, tipo=tipo, anio=anio),
    )


def _materias_sin_mesa(
    db: Session, *, tipo: str | None = None, anio: int | None = None
) -> list[str]:
    """Nombres de las materias del plan que todavía no tienen día cargado."""
    con_mesa = materia_repo.codigos_con_mesa(db)
    return [
        m.nombre
        for m in materia_repo.list_materias(db, tipo=tipo)
        if m.codigo not in con_mesa and (anio is None or m.anio_carrera == anio)
    ]


def get_mesa(db: Session, materia_codigo: str) -> MesaMateria | None:
    return materia_repo.get_mesa(db, materia_codigo)


# ---------------------------------------------------------------------------
# Edición (admin)
# ---------------------------------------------------------------------------
def definir_mesa(
    db: Session,
    *,
    materia_codigo: str,
    dia_semana: str,
    hora: time | None,
    nota: str | None = None,
    usuario_id: int | None = None,
    origen: str = "admin",
) -> MesaMateria:
    """Fija el día y la hora de una materia. Idempotente por materia.

    Falla si la materia no existe: cargar una mesa contra un código inventado
    dejaría una fila que ninguna vista sabe mostrar.
    """
    if materia_repo.get_by_codigo(db, materia_codigo) is None:
        raise MateriaInexistente(f"La materia '{materia_codigo}' no está en el plan.")

    return materia_repo.upsert_mesa(
        db,
        materia_codigo=materia_codigo,
        dia_semana=_validar_dia(dia_semana),
        hora=hora,
        nota=(nota or None),
        origen=origen,
        usuario_id=usuario_id,
    )


def borrar_mesa(db: Session, materia_codigo: str) -> bool:
    """La materia vuelve a quedar sin día cargado."""
    return materia_repo.eliminar_mesa(db, materia_codigo)
