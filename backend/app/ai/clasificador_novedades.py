"""Clasificador IA de novedades (OpenAI vía LangChain, structured output + visión).

Prompt en ``app/ai/prompts/novedades.py``; modelo por ``NOVEDADES_LLM_MODEL``.
"""
from __future__ import annotations

import base64
import logging
from collections.abc import Sequence
from functools import lru_cache

from app.ai import placeholders
from app.ai.prompts.novedades import CLASIFICADOR_SYSTEM
from app.config import get_settings
from app.schemas.novedad import ClasificacionNovedad
from app.scrapers.novedades.base import NovedadCruda

logger = logging.getLogger(__name__)


class ResultadoClasificacion:
    __slots__ = ("clasificacion", "tokens")

    def __init__(self, clasificacion: ClasificacionNovedad, tokens: int) -> None:
        self.clasificacion = clasificacion
        self.tokens = tokens


@lru_cache
def _get_llm():
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


def _build_message(
    item: NovedadCruda, recientes: Sequence[tuple[int, str]]
) -> dict:
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
    instruccion += (
        "\nImágenes genéricas disponibles (para imagen_sugerida, elegí el "
        "nombre de archivo que mejor represente la novedad, o null):\n"
        f"{placeholders.catalogo_para_prompt()}\n"
    )
    if recientes:
        lineas = "\n".join(f"- id {rid}: {titulo}" for rid, titulo in recientes)
        instruccion += (
            "\nNovedades recientes ya registradas (para detectar duplicados, "
            "campo duplicado_de):\n"
            f"{lineas}\n"
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


def clasificar(
    item: NovedadCruda,
    recientes: Sequence[tuple[int, str]] | None = None,
) -> ResultadoClasificacion:
    """``recientes`` = lista ``(id, titulo)`` de novedades ya registradas,
    contexto para el dedup semántico. Propaga excepciones (las maneja el service).
    """
    recientes = recientes or []
    llm = _get_llm()
    messages = [
        {"role": "system", "content": CLASIFICADOR_SYSTEM},
        _build_message(item, recientes),
    ]
    resultado = llm.invoke(messages)
    clasificacion: ClasificacionNovedad = resultado["parsed"]

    # Anulamos elecciones inventadas por el LLM (placeholder o id fuera de rango).
    if clasificacion.imagen_sugerida not in placeholders.NOMBRES:
        clasificacion.imagen_sugerida = None
    if clasificacion.duplicado_de not in {rid for rid, _ in recientes}:
        clasificacion.duplicado_de = None

    raw = resultado.get("raw")
    tokens = 0
    if raw is not None and getattr(raw, "usage_metadata", None):
        tokens = raw.usage_metadata.get("total_tokens", 0) or 0
    return ResultadoClasificacion(clasificacion=clasificacion, tokens=tokens)
