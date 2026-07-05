"""Repository para comisiones, cursadas y horarios."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models.academico import Comision, Cursada, Horario, UsuarioMateria


def listar_comisiones(
    db: Session, *, anio: int, cuatrimestre: int
) -> list[Comision]:
    """Lista comisiones con sus cursadas y horarios para un año/cuatrimestre."""
    stmt = (
        select(Comision)
        .join(Comision.cursadas)
        .where(Cursada.cuatrimestre == cuatrimestre)
        .options(
            selectinload(Comision.cursadas.and_(Cursada.cuatrimestre == cuatrimestre))
            .selectinload(Cursada.horarios),
            selectinload(Comision.cursadas.and_(Cursada.cuatrimestre == cuatrimestre))
            .selectinload(Cursada.materia),
        )
        .where(Comision.anio == anio)
        .order_by(Comision.nombre)
        .distinct()
    )
    return list(db.execute(stmt).scalars().all())


def cursadas_para_materias(
    db: Session,
    *,
    codigos: list[str],
    anio: int,
    cuatrimestre: int,
) -> list[Cursada]:
    """Cursadas de un conjunto de materias para un año/cuatrimestre dado."""
    stmt = (
        select(Cursada)
        .join(Cursada.comision)
        .where(
            Cursada.materia_codigo.in_(codigos),
            Cursada.cuatrimestre == cuatrimestre,
            Comision.anio == anio,
        )
        .options(
            selectinload(Cursada.horarios),
            selectinload(Cursada.materia),
            selectinload(Cursada.comision),
        )
        .order_by(Comision.nombre)
    )
    return list(db.execute(stmt).scalars().all())


def get_cursada(db: Session, cursada_id: int) -> Cursada | None:
    return db.get(Cursada, cursada_id)


def get_cursada_usuario(
    db: Session, usuario_id: int, materia_codigo: str
) -> UsuarioMateria | None:
    stmt = select(UsuarioMateria).where(
        UsuarioMateria.usuario_id == usuario_id,
        UsuarioMateria.materia_codigo == materia_codigo,
    )
    return db.execute(stmt).scalar_one_or_none()
