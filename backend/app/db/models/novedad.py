"""Modelos de contenidos: novedades scrapeadas y preguntas frecuentes.

Tablas: ``novedad`` (posts/noticias scrapeados) y ``faqquestion`` (Q&A
indexado para el agente). Mapean los ENUMs ``categoria_enum`` y
``fuente_enum`` ya creados en Neon.
"""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategoriaContenido(str, enum.Enum):
    """Mirror del ENUM ``categoria_enum`` de Postgres."""

    EVENTO = "evento"
    AVISO = "aviso"
    NOTICIA = "noticia"
    GENERAL = "general"


class FuenteContenido(str, enum.Enum):
    """Mirror del ENUM ``fuente_enum`` de Postgres.

    Los valores conservan el casing y los espacios del SQL original.
    """

    INSTAGRAM = "Instagram"
    FORO = "Foro"
    DIFUSION_DE_WSP = "Difusion de Wsp"


categoria_enum = SAEnum(
    CategoriaContenido,
    name="categoria_enum",
    create_type=False,
    values_callable=lambda enum_cls: [m.value for m in enum_cls],
)

fuente_enum = SAEnum(
    FuenteContenido,
    name="fuente_enum",
    create_type=False,
    values_callable=lambda enum_cls: [m.value for m in enum_cls],
)


class Novedad(Base):
    """Una novedad scrapeada de alguna fuente externa."""

    __tablename__ = "novedad"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    titulo: Mapped[str | None] = mapped_column(Text, nullable=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    # En el SQL actual ``categoria`` es TEXT (no el enum), por compatibilidad.
    categoria: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_publicacion: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Novedad id={self.id} titulo={self.titulo!r}>"


class FaqQuestion(Base):
    """Pregunta frecuente con respuesta y metadatos para indexar."""

    __tablename__ = "faqquestion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fuente_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pregunta: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuesta: Mapped[str | None] = mapped_column(Text, nullable=True)
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria: Mapped[CategoriaContenido | None] = mapped_column(
        categoria_enum, nullable=True
    )
    fecha_publicacion: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<FaqQuestion id={self.id} pregunta={self.pregunta!r}>"
