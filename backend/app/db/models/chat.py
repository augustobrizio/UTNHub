"""Modelos del chat conversacional con el agente.

Tablas: ``conversacion`` (sesiones de chat por usuario) y ``mensaje``
(turnos individuales: usuario, asistente, herramienta).
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Conversacion(Base):
    """Una sesión de chat de un usuario con el agente."""

    __tablename__ = "conversacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuario.id"), nullable=False, index=True
    )
    titulo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    mensajes: Mapped[list["Mensaje"]] = relationship(
        back_populates="conversacion",
        cascade="all, delete-orphan",
        order_by="Mensaje.created_at",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Conversacion id={self.id} usuario={self.usuario_id}>"


class Mensaje(Base):
    """Un turno de chat dentro de una conversación."""

    __tablename__ = "mensaje"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversacion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conversacion.id"), nullable=False, index=True
    )
    role: Mapped[str | None] = mapped_column(Text, nullable=True)
    contenido: Mapped[str | None] = mapped_column(Text, nullable=True)
    tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    conversacion: Mapped[Conversacion] = relationship(back_populates="mensajes")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Mensaje id={self.id} role={self.role}>"
