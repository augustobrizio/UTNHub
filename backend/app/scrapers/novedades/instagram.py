"""Fuente de novedades: Instagram (instagrapi) — posts + stories de los centros.

Reusa la sesión persistida en disco y descarga la imagen de cada item para
visión. Tolerante a fallos por handle/item.
"""
from __future__ import annotations

import logging
from collections.abc import Sequence
from pathlib import Path

import httpx

from app.config import get_settings
from app.db.models.novedad import FuenteNovedad as FuenteNovedadEnum
from app.scrapers.novedades.base import NovedadCruda

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 30
POSTS_POR_HANDLE = 12


class InstagramFuente:
    nombre = FuenteNovedadEnum.INSTAGRAM.value

    def fetch_recientes(self) -> Sequence[NovedadCruda]:
        settings = get_settings()
        handles = settings.instagram_handles_list
        if not handles:
            return []

        client = self._login()
        items: list[NovedadCruda] = []
        for handle in handles:
            try:
                items.extend(self._fetch_handle(client, handle))
            except Exception:  # noqa: BLE001 — un handle no tumba al resto
                logger.exception("Fallo trayendo contenido de @%s", handle)
        return items

    def _login(self):
        from instagrapi import Client

        settings = get_settings()
        client = Client()
        client.delay_range = [1, 3]
        session_path = Path(settings.instagram_session_path)

        # Sesión dumpeada: se reusa directo (validarla con un request público
        # entra en loop de redirects si la IP está flagueada). Para re-auth,
        # borrar el archivo de sesión.
        if session_path.exists():
            client.load_settings(session_path)
            return client

        # sessionid de un browser evita login/challenge/IP-block; password es fallback frágil.
        if settings.instagram_sessionid:
            client.login_by_sessionid(settings.instagram_sessionid)
        elif settings.instagram_usuario and settings.instagram_password:
            client.login(settings.instagram_usuario, settings.instagram_password)
        else:
            raise RuntimeError(
                "Sin credenciales de Instagram: configurá INSTAGRAM_SESSIONID "
                "(recomendado) o INSTAGRAM_USUARIO/PASSWORD."
            )

        session_path.parent.mkdir(parents=True, exist_ok=True)
        client.dump_settings(session_path)
        return client

    def _user_id(self, client, handle: str) -> str:
        # El lookup público (web_profile_info) es el que más rate-limita;
        # probamos primero la API privada (misma sesión autenticada).
        try:
            return str(client.user_info_by_username_v1(handle).pk)
        except Exception:  # noqa: BLE001
            return client.user_id_from_username(handle)

    def _fetch_handle(self, client, handle: str) -> list[NovedadCruda]:
        user_id = self._user_id(client, handle)
        items: list[NovedadCruda] = []

        for media in client.user_medias(user_id, POSTS_POR_HANDLE):
            try:
                items.append(self._from_post(handle, media))
            except Exception:  # noqa: BLE001
                logger.warning("Fallo parseando post de @%s", handle)

        try:
            stories = client.user_stories(user_id)
        except Exception:  # noqa: BLE001
            stories = []
        for story in stories:
            try:
                items.append(self._from_story(handle, story))
            except Exception:  # noqa: BLE001
                logger.warning("Fallo parseando story de @%s", handle)

        return items

    def _from_post(self, handle: str, media) -> NovedadCruda:
        url = f"https://www.instagram.com/p/{media.code}/"
        img_url = str(media.thumbnail_url) if media.thumbnail_url else None
        return NovedadCruda(
            external_id=f"instagram_post:{media.code}",
            fuente=self.nombre,
            origen=f"@{handle}",
            url=url,
            texto=media.caption_text or None,
            imagen_bytes=_descargar(img_url),
            imagen_url=img_url,
            imagen_mime="image/jpeg",
            fecha_publicacion=media.taken_at,
            usar_vision=True,
        )

    def _from_story(self, handle: str, story) -> NovedadCruda:
        img_url = str(story.thumbnail_url) if story.thumbnail_url else None
        return NovedadCruda(
            external_id=f"instagram_story:{story.pk}",
            fuente=self.nombre,
            origen=f"@{handle}",
            # La story no tiene URL permanente (expira en 24h): linkeamos al
            # perfil del centro en su lugar.
            url=f"https://www.instagram.com/{handle}/",
            texto=getattr(story, "caption_text", None) or None,
            imagen_bytes=_descargar(img_url),
            imagen_url=img_url,
            imagen_mime="image/jpeg",
            fecha_publicacion=story.taken_at,
            usar_vision=True,
        )


def _descargar(url: str | None) -> bytes | None:
    """Descarga la media; devuelve None si falla (no debe tumbar el item)."""
    if not url:
        return None
    try:
        with httpx.Client(
            timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.content
    except httpx.HTTPError:
        logger.warning("No se pudo descargar media %s", url)
        return None
