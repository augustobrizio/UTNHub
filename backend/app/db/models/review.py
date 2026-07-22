"""Modelo de reviews de cátedra (profesor × materia), desde la sheet de UTNTAC.

Una fila por par (materia, profesor): el desglose de votos, la cantidad de
respuestas y la clasificación textual. La **nota 1–5 NO se persiste**: se calcula
en ``review_service`` a partir de los votos (así se puede ajustar la fórmula sin
migrar).
"""
from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReviewCatedra(Base):
    """Reseña agregada de un profesor en una materia (fuente: UTNTAC)."""

    __tablename__ = "review_catedra"
    __table_args__ = (
        UniqueConstraint("materia_codigo", "profesor_id", name="uq_review_materia_profesor"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    materia_codigo: Mapped[str] = mapped_column(
        Text, ForeignKey("materia.codigo", ondelete="CASCADE"), nullable=False, index=True
    )
    profesor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("profesor.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Desglose de votos (conteos).
    super_recomiendo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    recomiendo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    normal: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    evitaria: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    super_evitaria: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Cantidad de respuestas reportada por la sheet (puede diferir de la suma).
    cantidad_respuestas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Clasificación textual de UTNTAC (p.ej. "Super Recomendado", "Evitar").
    clasificacion: Mapped[str | None] = mapped_column(Text, nullable=True)

    profesor: Mapped["Profesor"] = relationship()  # noqa: F821

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<ReviewCatedra materia={self.materia_codigo} "
            f"profesor={self.profesor_id} n={self.cantidad_respuestas}>"
        )
