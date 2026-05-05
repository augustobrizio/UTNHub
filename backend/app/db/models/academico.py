"""Modelos del dominio académico: Materia, Correlatividad, UsuarioMateria.

Refleja el schema ya creado en Neon (tablas `materia`, `correlatividad`,
`usuario_materia` y el ENUM `condicion_enum`). Los nombres de tablas y
columnas coinciden 1:1 con el SQL existente — no agregamos columnas.

Convenciones:
- Tipo de materia: ``"troncal"`` o ``"electiva"`` (string libre en DB).
- Tipo de correlativa: ``"regular"`` o ``"aprobada"``.
- ``codigo`` es la PK natural (string). Para troncales usamos ``"1"``..``"36"``
  más ``"ADUSI"``. Para electivas, ``"E01"``..``"E18"`` siguiendo orden del PDF.
"""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.usuario import Usuario


# ---------------------------------------------------------------------------
# Constantes de dominio
# ---------------------------------------------------------------------------
class TipoMateria:
    """Valores válidos para ``materia.tipo``."""

    TRONCAL = "troncal"
    ELECTIVA = "electiva"


class TipoCorrelativa:
    """Valores válidos para ``correlatividad.tipo``.

    - ``REGULAR``: la correlativa debe estar al menos en condición regular
      para poder cursar la materia objetivo.
    - ``APROBADA``: la correlativa debe estar aprobada (final rendido)
      para poder cursar la materia objetivo.

    Para *rendir* una materia, todas sus correlativas (cualquiera sea su
    ``tipo``) deben estar aprobadas — esa lógica vive en el service.
    """

    REGULAR = "regular"
    APROBADA = "aprobada"


class CondicionMateria(str, enum.Enum):
    """Mirror del ENUM ``condicion_enum`` en Postgres.

    Usamos los mismos valores literales que ya existen en la base.
    """

    APROBADO = "aprobado"
    REGULAR = "regular"
    CURSANDO = "cursando"
    LIBRE = "libre"
    NONE = "none"


# El ENUM ya existe en la DB (creado por el SQL inicial). Le decimos a
# SQLAlchemy que lo reuse — `create_type=False` evita que intente crearlo
# de nuevo si alguna vez corremos `Base.metadata.create_all`.
condicion_enum = SAEnum(
    CondicionMateria,
    name="condicion_enum",
    create_type=False,
    values_callable=lambda enum_cls: [m.value for m in enum_cls],
)


# ---------------------------------------------------------------------------
# Modelos
# ---------------------------------------------------------------------------
class Materia(Base):
    """Una materia del plan de estudios (troncal o electiva)."""

    __tablename__ = "materia"

    codigo: Mapped[str] = mapped_column(Text, primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    anio_carrera: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cuatrimestre: Mapped[int | None] = mapped_column(Integer, nullable=True)
    creditos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    horas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tipo: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Correlativas que esta materia REQUIERE (yo soy el destino, las requeridas
    # son los prerequisitos).
    correlativas: Mapped[list["Correlatividad"]] = relationship(
        back_populates="materia",
        foreign_keys="Correlatividad.materia_codigo",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Materias para las que ESTA materia es prerequisito.
    requerida_por: Mapped[list["Correlatividad"]] = relationship(
        back_populates="requerida",
        foreign_keys="Correlatividad.materia_requerida",
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Materia codigo={self.codigo!r} nombre={self.nombre!r}>"


class Correlatividad(Base):
    """Relación N:M entre materias: ``materia`` requiere ``requerida``."""

    __tablename__ = "correlatividad"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    materia_codigo: Mapped[str] = mapped_column(
        Text, ForeignKey("materia.codigo"), nullable=False, index=True
    )
    materia_requerida: Mapped[str] = mapped_column(
        Text, ForeignKey("materia.codigo"), nullable=False, index=True
    )
    tipo: Mapped[str | None] = mapped_column(Text, nullable=True)

    materia: Mapped[Materia] = relationship(
        back_populates="correlativas", foreign_keys=[materia_codigo]
    )
    requerida: Mapped[Materia] = relationship(
        back_populates="requerida_por", foreign_keys=[materia_requerida]
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Correlatividad {self.materia_codigo} requiere "
            f"{self.materia_requerida} ({self.tipo})>"
        )


class UsuarioMateria(Base):
    """Estado de cursada de una materia para un usuario.

    Una fila por par (usuario, materia). La condición se mapea contra el
    ENUM ``condicion_enum`` ya existente en Neon.
    """

    __tablename__ = "usuario_materia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuario.id"), nullable=False, index=True
    )
    materia_codigo: Mapped[str] = mapped_column(
        Text, ForeignKey("materia.codigo"), nullable=False, index=True
    )
    condicion: Mapped[CondicionMateria] = mapped_column(
        condicion_enum, default=CondicionMateria.NONE, nullable=False
    )
    nota: Mapped[float | None] = mapped_column(Float, nullable=True)
    anio_cursada: Mapped[int | None] = mapped_column(Integer, nullable=True)

    materia: Mapped[Materia] = relationship()

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<UsuarioMateria usuario={self.usuario_id} "
            f"materia={self.materia_codigo} condicion={self.condicion.value}>"
        )
