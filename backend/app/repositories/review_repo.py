"""Acceso a datos de ``review_catedra``."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.review import ReviewCatedra


def get_review(db: Session, *, materia_codigo: str, profesor_id: int) -> ReviewCatedra | None:
    stmt = select(ReviewCatedra).where(
        ReviewCatedra.materia_codigo == materia_codigo,
        ReviewCatedra.profesor_id == profesor_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def upsert_review(
    db: Session,
    *,
    materia_codigo: str,
    profesor_id: int,
    clasificacion: str | None,
    cantidad_respuestas: int,
    super_recomiendo: int,
    recomiendo: int,
    normal: int,
    evitaria: int,
    super_evitaria: int,
    cache: dict[tuple[str, int], ReviewCatedra] | None = None,
) -> bool:
    """Crea o actualiza la reseña de (materia, profesor). Devuelve True si fue
    creada, False si se actualizó una existente.

    Si se pasa ``cache`` (dict precargado con ``reviews_por_par``), se usa en vez
    de consultar la DB fila por fila — evita N round-trips en la sincronización.
    """
    par = (materia_codigo, profesor_id)
    if cache is not None:
        review = cache.get(par)
    else:
        review = get_review(db, materia_codigo=materia_codigo, profesor_id=profesor_id)
    creada = review is None
    if review is None:
        review = ReviewCatedra(materia_codigo=materia_codigo, profesor_id=profesor_id)
        db.add(review)
        if cache is not None:
            cache[par] = review

    review.clasificacion = clasificacion
    review.cantidad_respuestas = cantidad_respuestas
    review.super_recomiendo = super_recomiendo
    review.recomiendo = recomiendo
    review.normal = normal
    review.evitaria = evitaria
    review.super_evitaria = super_evitaria
    return creada


def reviews_por_par(db: Session) -> dict[tuple[str, int], ReviewCatedra]:
    """Todas las reseñas indexadas por (materia_codigo, profesor_id)."""
    return {
        (r.materia_codigo, r.profesor_id): r
        for r in db.execute(select(ReviewCatedra)).scalars().all()
    }
