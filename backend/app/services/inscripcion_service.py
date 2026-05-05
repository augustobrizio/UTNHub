"""Lógica de inscripción y registro de estado por materia.

El usuario indica en qué condición está cada materia: aprobado, regular,
cursando o libre. Este service:

- Aplica la regla de correlativas cuando corresponde (no se puede marcar
  como ``cursando`` o ``regular`` algo que el usuario no puede cursar).
- Permite cargar historial pasado (condiciones ``aprobado`` y ``libre``)
  sin validación, porque el usuario puede estar volcando datos viejos.
- Permite forzar saltar la validación con un flag explícito (útil para
  importar legajos en bulk o casos especiales).
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import CorrelativasNoCumplidas, MateriaInexistente
from app.db.models.academico import CondicionMateria, UsuarioMateria
from app.repositories import materia_repo
from app.services import correlatividad_service

# Condiciones que requieren validar correlativas para cursar.
_CONDICIONES_QUE_VALIDAN = {CondicionMateria.CURSANDO, CondicionMateria.REGULAR}


def registrar_estado(
    db: Session,
    *,
    usuario_id: int,
    materia_codigo: str,
    condicion: CondicionMateria,
    nota: float | None = None,
    anio_cursada: int | None = None,
    forzar: bool = False,
) -> UsuarioMateria:
    """Crea o actualiza el estado de una materia para un usuario.

    Args:
        db: sesión SQLAlchemy.
        usuario_id: id del usuario.
        materia_codigo: código de la materia (ej. ``"19"``, ``"ADUSI"``).
        condicion: nueva condición.
        nota: nota numérica (sólo aplica para aprobado).
        anio_cursada: año en que se cursó (libre).
        forzar: si es True, salta la validación de correlativas. Usar con
            cuidado, sólo para imports masivos o casos especiales.

    Raises:
        MateriaInexistente: si la materia no está en el plan.
        CorrelativasNoCumplidas: si se intenta marcar como cursando/regular
            sin cumplir correlativas (a menos que ``forzar=True``).
    """
    # Validar que la materia exista
    if materia_repo.get_by_codigo(db, materia_codigo) is None:
        raise MateriaInexistente(materia_codigo)

    # Validar correlativas si corresponde
    if not forzar and condicion in _CONDICIONES_QUE_VALIDAN:
        validacion = correlatividad_service.puede_cursar(
            db, usuario_id, materia_codigo
        )
        if not validacion.permitido:
            raise CorrelativasNoCumplidas(
                materia_codigo=materia_codigo,
                accion="cursar",
                faltantes=[
                    f"{f.materia_requerida} ({f.requiere}, tenés: {f.tiene.value})"
                    for f in validacion.faltantes
                ],
            )

    # Normalizar nota: solo tiene sentido si está aprobado o libre con nota.
    nota_efectiva = nota if condicion == CondicionMateria.APROBADO else None
    if condicion == CondicionMateria.APROBADO and nota is not None:
        nota_efectiva = nota

    return materia_repo.upsert_usuario_materia(
        db,
        usuario_id=usuario_id,
        materia_codigo=materia_codigo,
        condicion=condicion,
        nota=nota_efectiva,
        anio_cursada=anio_cursada,
    )


def eliminar_estado(
    db: Session, usuario_id: int, materia_codigo: str
) -> bool:
    """Borra el registro de cursada del usuario. True si existía."""
    return materia_repo.delete_usuario_materia(db, usuario_id, materia_codigo)


def listar_estado_usuario(db: Session, usuario_id: int):
    """Devuelve todas las materias con condición registrada para un usuario."""
    return materia_repo.list_usuario_materias(db, usuario_id)
