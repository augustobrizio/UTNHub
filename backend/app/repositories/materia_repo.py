"""Repository de Materia / Correlatividad / UsuarioMateria.

Único punto de acceso a la DB para el dominio académico. Los services
hablan con este módulo, nunca con SQLAlchemy directamente. Mantenerlo
pegado al modelo: nada de lógica de negocio acá.
"""
from __future__ import annotations

from collections.abc import Iterable, Sequence

from sqlalchemy import and_, select
from sqlalchemy.orm import Session, selectinload

from app.db.models.academico import (
    CondicionMateria,
    Correlatividad,
    Materia,
    UsuarioMateria,
)


# ---------------------------------------------------------------------------
# Materia
# ---------------------------------------------------------------------------
def get_by_codigo(db: Session, codigo: str) -> Materia | None:
    """Devuelve una materia por su código natural."""
    return db.get(Materia, codigo)


def list_materias(db: Session, *, tipo: str | None = None) -> Sequence[Materia]:
    """Lista materias, opcionalmente filtradas por tipo (``troncal`` / ``electiva``)."""
    stmt = select(Materia).order_by(
        Materia.anio_carrera.nulls_last(),
        Materia.cuatrimestre.nulls_first(),
        Materia.codigo,
    )
    if tipo is not None:
        stmt = stmt.where(Materia.tipo == tipo)
    return db.execute(stmt).scalars().all()


def list_codigos_por_tipo(db: Session, tipo: str) -> set[str]:
    """Conjunto de códigos para un tipo dado. Útil para reglas globales."""
    stmt = select(Materia.codigo).where(Materia.tipo == tipo)
    return {row[0] for row in db.execute(stmt).all()}


def upsert_materia(db: Session, **fields) -> Materia:
    """Inserta o actualiza una materia por ``codigo``. Usado por el seed."""
    codigo = fields["codigo"]
    materia = db.get(Materia, codigo)
    if materia is None:
        materia = Materia(**fields)
        db.add(materia)
    else:
        for key, value in fields.items():
            if key == "codigo":
                continue
            setattr(materia, key, value)
    return materia


# ---------------------------------------------------------------------------
# Correlatividad
# ---------------------------------------------------------------------------
def correlativas_de(
    db: Session, codigos: Iterable[str]
) -> Sequence[Correlatividad]:
    """Trae las correlativas de un conjunto de materias (un único query)."""
    codigos = list(codigos)
    if not codigos:
        return []
    stmt = (
        select(Correlatividad)
        .where(Correlatividad.materia_codigo.in_(codigos))
        .options(
            selectinload(Correlatividad.materia),
            selectinload(Correlatividad.requerida),
        )
    )
    return db.execute(stmt).scalars().all()


def correlativas_de_materia(
    db: Session, materia_codigo: str
) -> Sequence[Correlatividad]:
    """Correlativas de una sola materia."""
    return correlativas_de(db, [materia_codigo])


def upsert_correlativa(
    db: Session,
    *,
    materia_codigo: str,
    materia_requerida: str,
    tipo: str,
) -> Correlatividad:
    """Inserta una correlativa si no existe (idempotente por la tripleta)."""
    stmt = select(Correlatividad).where(
        and_(
            Correlatividad.materia_codigo == materia_codigo,
            Correlatividad.materia_requerida == materia_requerida,
            Correlatividad.tipo == tipo,
        )
    )
    existing = db.execute(stmt).scalar_one_or_none()
    if existing is not None:
        return existing
    correl = Correlatividad(
        materia_codigo=materia_codigo,
        materia_requerida=materia_requerida,
        tipo=tipo,
    )
    db.add(correl)
    return correl


# ---------------------------------------------------------------------------
# UsuarioMateria
# ---------------------------------------------------------------------------
def condiciones_usuario(
    db: Session, usuario_id: int
) -> dict[str, CondicionMateria]:
    """Mapa ``codigo -> condicion`` con todo el historial del usuario."""
    stmt = select(UsuarioMateria.materia_codigo, UsuarioMateria.condicion).where(
        UsuarioMateria.usuario_id == usuario_id
    )
    return {codigo: condicion for codigo, condicion in db.execute(stmt).all()}


def notas_usuario(db: Session, usuario_id: int) -> dict[str, float | None]:
    """Mapa ``codigo -> nota`` del usuario."""
    stmt = select(UsuarioMateria.materia_codigo, UsuarioMateria.nota).where(
        UsuarioMateria.usuario_id == usuario_id
    )
    return {codigo: nota for codigo, nota in db.execute(stmt).all()}


def usuario_materia(
    db: Session, usuario_id: int, materia_codigo: str
) -> UsuarioMateria | None:
    """Una sola fila de cursada."""
    stmt = select(UsuarioMateria).where(
        and_(
            UsuarioMateria.usuario_id == usuario_id,
            UsuarioMateria.materia_codigo == materia_codigo,
        )
    )
    return db.execute(stmt).scalar_one_or_none()
