"""Reglas de negocio de las reviews de cátedra.

- ``nota_catedra``: nota 1–5 de un (profesor, materia) como promedio ponderado de
  sus votos. Cruda (sin ajuste por muestra chica); se expone junto a la cantidad
  de respuestas.
- ``promedio_notas`` / ``score_comision``: promedio de las notas de un conjunto de
  cátedras (para el score de una comisión), informando la cobertura.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.db.models.review import ReviewCatedra

# Peso de cada voto en la escala 1–5.
PESO_SUPER_RECOMIENDO = 5
PESO_RECOMIENDO = 4
PESO_NORMAL = 3
PESO_EVITARIA = 2
PESO_SUPER_EVITARIA = 1


def nota_desde_votos(
    super_recomiendo: int,
    recomiendo: int,
    normal: int,
    evitaria: int,
    super_evitaria: int,
) -> float | None:
    """Promedio ponderado 1–5 de los votos. ``None`` si no hay votos."""
    total = super_recomiendo + recomiendo + normal + evitaria + super_evitaria
    if total <= 0:
        return None
    suma = (
        PESO_SUPER_RECOMIENDO * super_recomiendo
        + PESO_RECOMIENDO * recomiendo
        + PESO_NORMAL * normal
        + PESO_EVITARIA * evitaria
        + PESO_SUPER_EVITARIA * super_evitaria
    )
    return round(suma / total, 2)


def nota_catedra(review: ReviewCatedra | None) -> float | None:
    """Nota 1–5 de una reseña (``None`` si no hay reseña o no tiene votos)."""
    if review is None:
        return None
    return nota_desde_votos(
        review.super_recomiendo,
        review.recomiendo,
        review.normal,
        review.evitaria,
        review.super_evitaria,
    )


@dataclass(frozen=True, slots=True)
class ScoreComision:
    """Score de una comisión: promedio de las notas de sus cátedras con reseña."""

    score: float | None  # None si ninguna cátedra tiene reseña
    con_review: int  # cátedras con reseña (nota calculable)
    total: int  # cátedras consideradas


def score_comision(notas: list[float | None]) -> ScoreComision:
    """Promedio de las notas disponibles + cobertura. ``score`` None si no hay
    ninguna nota."""
    disponibles = [n for n in notas if n is not None]
    total = len(notas)
    if not disponibles:
        return ScoreComision(score=None, con_review=0, total=total)
    return ScoreComision(
        score=round(sum(disponibles) / len(disponibles), 2),
        con_review=len(disponibles),
        total=total,
    )
