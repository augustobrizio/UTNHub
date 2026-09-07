"""Modelos del dominio académico.

Tablas: ``materia``, ``correlatividad``, ``usuario_materia``, ``comision``,
``horario``, ``mesa_materia``. Refleja 1:1 el schema ya creado en Neon.

Convenciones:
- Tipo de materia: ``"troncal"`` o ``"electiva"`` (string libre en DB).
- Tipo de correlativa: ``"regular"`` o ``"aprobada"``.
- ``codigo`` es la PK natural (string). Para troncales usamos ``"1"``..``"36"``
  más ``"ADUSI"``. Para electivas, ``"E01"``..``"E18"`` siguiendo orden del PDF.
"""
from __future__ import annotations

import enum
from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    Time,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.profesor import Profesor


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
    cuatrimestre: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    # Día y hora de la mesa de examen. Puede no estar: es un dato que se carga
    # aparte del plan.
    mesa: Mapped["MesaMateria | None"] = relationship(
        back_populates="materia",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
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
    __table_args__ = (UniqueConstraint("usuario_id", "materia_codigo", name="uq_usuario_materia"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuario.id"), nullable=False, index=True
    )
    materia_codigo: Mapped[str] = mapped_column(
        Text, ForeignKey("materia.codigo"), nullable=False, index=True
    )
    condicion: Mapped[CondicionMateria] = mapped_column(
        condicion_enum,
        default=CondicionMateria.NONE,
        # ``server_default`` refleja el ``DEFAULT 'none'`` que ya existe en
        # la DB. Lo declaramos para que Alembic vea que el modelo y la DB
        # están sincronizados.
        server_default=text("'none'"),
        nullable=False,
    )
    nota: Mapped[float | None] = mapped_column(Float, nullable=True)
    anio_cursada: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cursada_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("cursada.id", ondelete="SET NULL"), nullable=True
    )

    materia: Mapped[Materia] = relationship()
    cursada: Mapped["Cursada | None"] = relationship(foreign_keys=[cursada_id])

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<UsuarioMateria usuario={self.usuario_id} "
            f"materia={self.materia_codigo} condicion={self.condicion.value}>"
        )


class Comision(Base):
    """Una comisión real de cursado (ej: '1K01', '3EK02'). Agrupa varias cursadas."""

    __tablename__ = "comision"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str | None] = mapped_column(Text, nullable=True)
    anio: Mapped[int | None] = mapped_column(Integer, nullable=True)

    cursadas: Mapped[list["Cursada"]] = relationship(
        back_populates="comision", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Comision id={self.id} nombre={self.nombre!r} anio={self.anio}>"


class Cursada(Base):
    """Una materia dentro de una comisión para un cuatrimestre dado."""

    __tablename__ = "cursada"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    comision_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("comision.id"), nullable=False, index=True
    )
    materia_codigo: Mapped[str] = mapped_column(
        Text, ForeignKey("materia.codigo"), nullable=False, index=True
    )
    cuatrimestre: Mapped[int | None] = mapped_column(Integer, nullable=True)
    docente: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Vinculo resuelto al profesor real del padron (ver cursada_profesor_service).
    # Nullable: el ``docente`` (apellido crudo) no siempre resuelve a un unico
    # profesor. Se conserva ``docente`` como fallback/provenance. ON DELETE SET
    # NULL: si se borra el profesor, la cursada sigue existiendo sin vinculo.
    profesor_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("profesor.id", ondelete="SET NULL"), nullable=True, index=True
    )

    comision: Mapped[Comision] = relationship(back_populates="cursadas")
    materia: Mapped[Materia] = relationship()
    profesor: Mapped["Profesor | None"] = relationship()
    horarios: Mapped[list["Horario"]] = relationship(
        back_populates="cursada", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Cursada id={self.id} materia={self.materia_codigo} C{self.cuatrimestre}>"


class Horario(Base):
    """Bloque de horario de una cursada (un día y franja)."""

    __tablename__ = "horario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cursada_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cursada.id"), nullable=False, index=True
    )
    dia: Mapped[str | None] = mapped_column(Text, nullable=True)
    hora_inicio: Mapped[time | None] = mapped_column(Time, nullable=True)
    hora_fin: Mapped[time | None] = mapped_column(Time, nullable=True)
    aula: Mapped[str | None] = mapped_column(Text, nullable=True)

    cursada: Mapped["Cursada"] = relationship(back_populates="horarios")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Horario {self.dia} {self.hora_inicio}-{self.hora_fin} aula={self.aula}>"


class MesaMateria(Base):
    """Día y hora en que se rinde el final de una materia.

    En FRRO la mesa de examen no reparte materias por fecha sino por **día de
    la semana**: los lunes se rinde Análisis Matemático I, los jueves
    Simulación. Eso no cambia llamado a llamado, así que el dato cuelga de la
    materia y no de ``evento_calendario`` —que sabe *qué semana* hay mesa, pero
    no qué se rinde adentro—. Las dos cosas se cruzan recién en la UI.

    Una fila por materia: el admin corrige el día o la hora y pisa la que
    había. Las materias sin fila son las que todavía no tienen el dato
    confirmado, no un "no se rinde".

    ``nota`` es la aclaración por materia ("confirmado con la cátedra el 3/9").
    El aviso general —esto es referencia, confirmalo con tu cátedra— es de la
    vista, no del registro.
    """

    __tablename__ = "mesa_materia"
    __table_args__ = (
        UniqueConstraint("materia_codigo", name="uq_mesa_materia_materia"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    materia_codigo: Mapped[str] = mapped_column(
        Text, ForeignKey("materia.codigo", ondelete="CASCADE"), nullable=False, index=True
    )
    #: ``lunes``…``viernes``, minúscula y sin acento — el mismo formato que
    #: ``horario.dia``, así el frontend tiene un solo criterio para los días.
    dia_semana: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    hora: Mapped[time | None] = mapped_column(Time, nullable=True)
    nota: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Quién puso el dato: ``seed`` (la planilla del Departamento) o ``admin``.
    origen: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="seed", index=True
    )
    #: El admin que lo tocó. SET NULL: el dato sobrevive a la cuenta, igual que
    #: en ``estado_dia``.
    usuario_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("usuario.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    materia: Mapped[Materia] = relationship(back_populates="mesa")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MesaMateria {self.materia_codigo} {self.dia_semana} {self.hora}>"
