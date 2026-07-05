"""Storage S3 para media de novedades (copia propia, las URLs de origen expiran).

Opcional: si no hay credenciales/bucket configurados (dev sin AWS), el
llamador debe caer a un fallback propio — ``subir`` devuelve ``None``.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from app.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def _cliente():
    import boto3

    settings = get_settings()
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def habilitado() -> bool:
    settings = get_settings()
    return bool(
        settings.aws_s3_bucket
        and settings.aws_access_key_id
        and settings.aws_secret_access_key
    )


def subir(contenido: bytes, key: str, *, content_type: str = "image/jpeg") -> str | None:
    """Sube ``contenido`` al bucket bajo ``key``; devuelve la URL pública o None.

    None si S3 no está configurado o si falla la subida (best-effort: un
    fallo acá no debe tumbar la ingesta).
    """
    if not habilitado():
        return None
    settings = get_settings()
    try:
        _cliente().put_object(
            Bucket=settings.aws_s3_bucket,
            Key=key,
            Body=contenido,
            ContentType=content_type,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Fallo subiendo %s a S3", key)
        return None
    return f"https://{settings.aws_s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
