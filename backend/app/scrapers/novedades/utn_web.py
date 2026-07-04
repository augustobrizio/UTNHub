"""Fuente de novedades: sitio web de FRRO (``https://www.frro.utn.edu.ar/``).

Captura dos cosas de la home:

1. **Notas**: bloques ``div.blog-post-content`` con link a
   ``/notas/<id>/<titulo>/<slug>``. Se sigue el link para traer cuerpo e
   imagen. ``external_id = utn_web:<id>``.
2. **Fechas Importantes**: items ``<a>`` con ``<h5>`` (fecha) + ``<span>``
   (título) + ``<p>`` (descripción). Sirven para detectar cuando se agrega
   una fecha relevante (ingreso, inscripciones). ``external_id =
   utn_web_fecha:<fecha>:<slug>``.

Ambos tipos son contenido de texto: el clasificador IA decide por texto
(``usar_vision=False``). La imagen de las notas se descarga y retiene solo
para mostrarla en la app.
"""
from __future__ import annotations

import logging
import re
import unicodedata
from collections.abc import Sequence
from datetime import datetime
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

from app.config import get_settings
from app.db.models.novedad import FuenteNovedad as FuenteNovedadEnum
from app.scrapers.novedades.base import NovedadCruda

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 30
MAX_ITEMS = 30
NOTA_ID_RE = re.compile(r"/notas/(\d+)/")
FECHA_RE = re.compile(r"(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3})/(\d{4})")

MESES_ABBR: dict[str, int] = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "set": 9, "oct": 10, "nov": 11, "dic": 12,
}


class UtnWebFuente:
    """Scraper de notas + fechas importantes del sitio FRRO."""

    nombre = FuenteNovedadEnum.UTN_WEB.value

    def fetch_recientes(self) -> Sequence[NovedadCruda]:
        settings = get_settings()
        url = settings.utn_novedades_url
        if not url:
            return []

        with httpx.Client(
            timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            items: list[NovedadCruda] = []
            items.extend(self._parse_notas(client, soup, base_url=url))
            items.extend(self._parse_fechas(soup, base_url=url))

        return items

    # --- Notas ---------------------------------------------------------------
    def _parse_notas(
        self, client: httpx.Client, soup: BeautifulSoup, *, base_url: str
    ) -> list[NovedadCruda]:
        items: list[NovedadCruda] = []
        vistos: set[str] = set()
        for block in soup.select("div.blog-post-content"):
            a = block.find("a", href=True)
            if a is None:
                continue
            titulo = _clean(block.get_text(" "))
            href = urljoin(base_url, str(a["href"]).strip())

            m = NOTA_ID_RE.search(str(a["href"]))
            external_id = (
                f"{self.nombre}:{m.group(1)}" if m else f"{self.nombre}:{href}"
            )
            if external_id in vistos:
                continue
            vistos.add(external_id)

            cuerpo, imagen_url = self._fetch_detalle(client, href)
            texto = f"{titulo}\n\n{cuerpo}".strip() if cuerpo else titulo
            imagen_bytes = _descargar(client, imagen_url)

            items.append(
                NovedadCruda(
                    external_id=external_id,
                    fuente=self.nombre,
                    origen="FRRO",
                    url=href,
                    texto=texto,
                    imagen_bytes=imagen_bytes,
                    imagen_url=imagen_url,
                    imagen_mime="image/jpeg",
                    usar_vision=False,  # el cuerpo de la nota alcanza
                )
            )
            if len(items) >= MAX_ITEMS:
                break
        return items

    def _fetch_detalle(
        self, client: httpx.Client, url: str
    ) -> tuple[str | None, str | None]:
        """Trae cuerpo (párrafo más largo) e imagen de la nota. Best-effort."""
        try:
            resp = client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError:
            logger.warning("No se pudo abrir la nota %s", url)
            return None, None

        soup = BeautifulSoup(resp.text, "html.parser")
        parrafos = [_clean(p.get_text(" ")) for p in soup.find_all("p")]
        cuerpo = max(parrafos, key=len, default="") or None

        imagen_url = None
        img = soup.find("img", src=re.compile("fotonoticias", re.I))
        if img is not None:
            imagen_url = urljoin(url, str(img.get("src")))
        return cuerpo, imagen_url

    # --- Fechas importantes --------------------------------------------------
    def _parse_fechas(
        self, soup: BeautifulSoup, *, base_url: str
    ) -> list[NovedadCruda]:
        items: list[NovedadCruda] = []
        vistos: set[str] = set()
        for a in soup.find_all("a"):
            h5 = a.find("h5") if isinstance(a, Tag) else None
            if h5 is None:
                continue
            fecha = _parse_fecha(_clean(h5.get_text(" ")))
            if fecha is None:
                continue

            span = a.find("span")
            p = a.find("p")
            titulo = _clean(span.get_text(" ")) if span else _clean(a.get_text(" "))
            desc = _clean(p.get_text(" ")) if p else ""

            external_id = f"{self.nombre}_fecha:{fecha.date().isoformat()}:{_slug(titulo)}"
            if external_id in vistos:
                continue
            vistos.add(external_id)

            texto = f"Fecha importante: {titulo}. {desc}".strip()
            href = a.get("href")
            url = urljoin(base_url, str(href)) if href else None

            items.append(
                NovedadCruda(
                    external_id=external_id,
                    fuente=self.nombre,
                    origen="FRRO",
                    url=url,
                    texto=texto,
                    fecha_publicacion=fecha,
                    usar_vision=False,
                )
            )
        return items


def _parse_fecha(texto: str) -> datetime | None:
    """``20 JUL/2026`` -> datetime(2026, 7, 20)."""
    m = FECHA_RE.search(texto)
    if not m:
        return None
    dia, mes_abbr, anio = m.groups()
    mes = MESES_ABBR.get(_strip_acentos(mes_abbr).lower())
    if mes is None:
        return None
    try:
        return datetime(int(anio), mes, int(dia))
    except ValueError:
        return None


def _descargar(client: httpx.Client, url: str | None) -> bytes | None:
    if not url:
        return None
    try:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content
    except httpx.HTTPError:
        logger.warning("No se pudo descargar imagen %s", url)
        return None


def _strip_acentos(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def _slug(texto: str) -> str:
    base = _strip_acentos(texto).lower()
    return re.sub(r"[^a-z0-9]+", "-", base).strip("-")[:60]


def _clean(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip()
