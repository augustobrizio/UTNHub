"""Modelos de contenidos: novedades scrapeadas, FAQ y log de ingesta.

Tablas:

- ``novedad``: posts/stories/noticias scrapeados de fuentes externas
  (Instagram de centros de estudiantes, sitio web de FRRO, ...). Cada fila
  pasó por el pipeline de ingesta (fetch -> dedup -> clasificación IA ->
  gate de moderación).
- ``faqquestion``: Q&A indexado para el agente (preexistente).
- ``ingesta_log``: auditoría de cada corrida del pipeline (RNF-08).

Los ENUMs ``categoria_enum`` y ``fuente_enum`` existen en Neon pero quedaron
desalineados con el dominio real (no contemplan, p.ej., ``utn_web``). Para
mantener flexibilidad y consistencia con ``evento_calendario`` (que usa TEXT
para ``tipo``), las columnas nuevas de ``novedad`` son TEXT y la validación
vive a nivel app con los ``Enum`` de Python de abajo.
"""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategoriaContenido(str, enum.Enum):
    """Mirror del ENUM ``categoria_enum`` de Postgres (usado por FaqQuestion)."""

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


class FuenteNovedad(str, enum.Enum):
    """Canal del que proviene una novedad. Persistido como TEXT en ``fuente``."""

    INSTAGRAM = "instagram"
    UTN_WEB = "utn_web"


class CategoriaNovedad(str, enum.Enum):
    """Categoría asignada por el clasificador IA. Persistida como TEXT."""

    EVENTO = "evento"
    AVISO = "aviso"
    NOTICIA = "noticia"
    GENERAL = "general"


class EstadoNovedad(str, enum.Enum):
    """Gate de moderación de una novedad. Persistido como TEXT en ``estado``.

    - ``publicada``: visible para los estudiantes (alta confianza del clasificador).
    - ``pendiente``: requiere revisión de un admin (confianza media).
    - ``descartada``: el clasificador determinó que no es una novedad.
    """

    PUBLICADA = "publicada"
    PENDIENTE = "pendiente"
    DESCARTADA = "descartada"


class EstadoIngesta(str, enum.Enum):
    """Resultado global de una corrida de ingesta. Persistido como TEXT."""

    OK = "ok"
    PARCIAL = "parcial"
    ERROR = "error"


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
    """Una novedad scrapeada de alguna fuente externa.

    El ``external_id`` es la identidad estable provista por la fuente
    (``instagram_post:<shortcode>``, ``instagram_story:<media_pk>``,
    ``utn_web:<url>``) y es la clave de deduplicación idempotente: se chequea
    *antes* de invocar al clasificador IA para no reprocesar lo ya visto.
    """

    __tablename__ = "novedad"
    __table_args__ = (
        UniqueConstraint("external_id", name="uq_novedad_external_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # --- Identidad / fuente -------------------------------------------------
    external_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    fuente: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    origen: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Contenido ----------------------------------------------------------
    titulo: Mapped[str | None] = mapped_column(Text, nullable=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ``categoria`` ya existía como TEXT en Neon; lo conservamos así.
    categoria: Mapped[str | None] = mapped_column(Text, nullable=True)
    imagen_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Evidencia local descargada (clave para citar stories, que no tienen URL
    # pública permanente — RF-06).
    imagen_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Clasificación IA / moderación -------------------------------------
    estado: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=EstadoNovedad.PENDIENTE.value, index=True
    )
    confianza: Mapped[float | None] = mapped_column(Float, nullable=True)
    motivo_descarte: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Fechas -------------------------------------------------------------
    fecha_publicacion: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Novedad id={self.id} fuente={self.fuente} titulo={self.titulo!r}>"


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


class IngestaLog(Base):
    """Auditoría de una corrida del pipeline de ingesta de novedades (RNF-08).

    Una fila por (corrida, fuente). Registra ventana temporal, contadores del
    pipeline, tokens consumidos por el clasificador (control de costos, RNF-11)
    y los errores encontrados.
    """

    __tablename__ = "ingesta_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fuente: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    iniciado_en: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    finalizado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    items_vistos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_nuevos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_novedad: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_descartados: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    tokens_usados: Mapped[int | None] = mapped_column(Integer, nullable=True)

    estado: Mapped[str] = mapped_column(Text, nullable=False)
    # Lista de mensajes de error serializada como texto (una por línea).
    errores: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<IngestaLog id={self.id} fuente={self.fuente} "
            f"estado={self.estado}>"
        )
