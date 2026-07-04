"""Contrato común de las fuentes de novedades.

Una ``FuenteNovedad`` solo sabe *traer* contenido crudo de un canal externo
(Instagram, sitio FRRO, ...). No clasifica, no deduplica, no persiste: eso es
responsabilidad del ``novedad_service``. Mantener este límite es lo que
permite enchufar fuentes nuevas sin tocar el pipeline.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable


@dataclass(frozen=True, slots=True)
class NovedadCruda:
    """Item traído de una fuente, todavía sin clasificar ni persistir.

    ``external_id`` es la identidad estable provista por la fuente y es la
    clave de deduplicación (se chequea antes de gastar una llamada al
    clasificador IA). Formatos:

    - ``instagram_post:<shortcode>``
    - ``instagram_story:<media_pk>``
    - ``utn_web:<url>``

    Para contenido visual (flyers de stories/posts), ``imagen_bytes`` trae la
    media real descargada — se la pasa al LLM multimodal y se guarda como
    evidencia. Para fuentes de texto (sitio web), ``texto`` alcanza y
    ``imagen_bytes`` queda en ``None``.
    """

    external_id: str
    fuente: str
    origen: str | None = None
    url: str | None = None
    texto: str | None = None
    imagen_bytes: bytes | None = None
    imagen_url: str | None = None
    imagen_mime: str | None = None
    fecha_publicacion: datetime | None = None
    #: Si True, se envía ``imagen_bytes`` al clasificador multimodal (la info
    #: vive dentro de la imagen — típico de stories/flyers de Instagram). Si
    #: False, la imagen se retiene solo para mostrar y la IA clasifica por
    #: texto (típico de notas web con cuerpo propio). Independiente de si la
    #: imagen se guarda como evidencia (eso siempre ocurre si hay bytes).
    usar_vision: bool = False


@runtime_checkable
class FuenteNovedad(Protocol):
    """Protocolo que implementa cada scraper de novedades."""

    #: Identificador del canal, debe coincidir con ``FuenteNovedad`` enum
    #: (``instagram`` / ``utn_web``). Se persiste en ``novedad.fuente`` y
    #: ``ingesta_log.fuente``.
    nombre: str

    def fetch_recientes(self) -> Sequence[NovedadCruda]:
        """Trae los items recientes del canal.

        Debe ser tolerante a fallos parciales de la fuente: si un item
        individual no se puede traer, lo omite en vez de abortar todo. Los
        errores no recuperables se propagan para que el service los registre
        en ``ingesta_log``.
        """
        ...
