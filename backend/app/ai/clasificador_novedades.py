"""Clasificador IA de novedades (OpenAI vía LangChain).

Recibe un item crudo (``NovedadCruda``) — imagen del flyer/story y/o texto —
y devuelve una ``ClasificacionNovedad`` estructurada: si es novedad, su
categoría, título, descripción, fecha y confianza.

Patrón usado (doc oficial LangChain):
- ``ChatOpenAI(...).with_structured_output(Modelo, method="json_schema")``
  fuerza salida que valida contra el schema Pydantic.
- La imagen se pasa como content block ``{"type": "image", "base64": ...,
  "mime_type": ...}`` dentro del ``HumanMessage``.

El prompt vive en ``app/ai/prompts/novedades.py`` (versionado por git). El
modelo se lee de config (``NOVEDADES_LLM_MODEL``), no se hardcodea. El cliente
se construye perezosamente y se cachea para reusar la conexión.
"""
from __future__ import annotations

import base64
import logging
from functools import lru_cache

from app.ai.prompts.novedades import CLASIFICADOR_SYSTEM
from app.config import get_settings
from app.schemas.novedad import ClasificacionNovedad
from app.scrapers.novedades.base import NovedadCruda

logger = logging.getLogger(__name__)


class ResultadoClasificacion:
    """Wrapper liviano: clasificación + tokens consumidos (para auditoría)."""

    __slots__ = ("clasificacion", "tokens")

    def __init__(self, clasificacion: ClasificacionNovedad, tokens: int) -> None:
        self.clasificacion = clasificacion
        self.tokens = tokens


@lru_cache
def _get_llm():
    """Construye (y cachea) el cliente ChatOpenAI con structured output."""
    # Import local para no exigir langchain-openai si no se usa el clasificador.
    from langchain_openai import ChatOpenAI

    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY no configurada: el clasificador de novedades la "
            "necesita. Cargala en backend/.env."
        )
    llm = ChatOpenAI(
        model=settings.novedades_llm_model,
        api_key=settings.openai_api_key,
        temperature=0,
        timeout=60,
        max_retries=2,
    )
    return llm.with_structured_output(
        ClasificacionNovedad, method="json_schema", include_raw=True
    )


def _build_message(item: NovedadCruda) -> dict:
    """Arma el HumanMessage multimodal a partir del item crudo."""
    usar_imagen = item.usar_vision and item.imagen_bytes is not None
    content: list[dict] = []
    instruccion = "Clasificá la siguiente publicación.\n"
    if item.origen:
        instruccion += f"Cuenta / fuente: {item.origen}\n"
    if item.texto:
        instruccion += f"Texto de la publicación:\n{item.texto}\n"
    if usar_imagen:
        instruccion += (
            "La imagen adjunta es el contenido visual (flyer/story); leé el "
            "texto que aparece dentro de la imagen.\n"
        )
    content.append({"type": "text", "text": instruccion})

    if usar_imagen:
        content.append(
            {
                "type": "image",
                "base64": base64.b64encode(item.imagen_bytes).decode("ascii"),
                "mime_type": item.imagen_mime or "image/jpeg",
            }
        )
    return {"role": "user", "content": content}


def clasificar(item: NovedadCruda) -> ResultadoClasificacion:
    """Clasifica un item crudo. Propaga excepciones para que las maneje el
    service (un fallo del LLM no debe tumbar la corrida completa).
    """
    llm = _get_llm()
    messages = [
        {"role": "system", "content": CLASIFICADOR_SYSTEM},
        _build_message(item),
    ]
    resultado = llm.invoke(messages)

    # Con include_raw=True el retorno es {"raw": AIMessage, "parsed": Modelo,
    # "parsing_error": ...}. Usamos raw para extraer el uso de tokens.
    clasificacion: ClasificacionNovedad = resultado["parsed"]
    raw = resultado.get("raw")
    tokens = 0
    if raw is not None and getattr(raw, "usage_metadata", None):
        tokens = raw.usage_metadata.get("total_tokens", 0) or 0
    return ResultadoClasificacion(clasificacion=clasificacion, tokens=tokens)
