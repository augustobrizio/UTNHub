"""Modelo de Usuario.

Refleja la tabla ``usuario`` del schema de Neon. La columna ``password``
está pensada para guardar un hash (no texto plano) — RNF-02.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Usuario(Base):
    """Usuario del sistema (estudiante o admin)."""

    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    nombre: Mapped[str | None] = mapped_column(Text, nullable=True)
    apellido: Mapped[str | None] = mapped_column(Text, nullable=True)
    legajo: Mapped[str | None] = mapped_column(Text, nullable=True)
    password: Mapped[str | None] = mapped_column(Text, nullable=True)
    anio_ingresado: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rol: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Usuario id={self.id} email={self.email!r}>"
