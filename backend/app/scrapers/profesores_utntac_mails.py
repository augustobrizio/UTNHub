"""Scraper de mails de docentes desde la sheet publica de UTNTAC.

Fuente: https://docs.google.com/spreadsheets/d/1wFvWH516BMusWYd7Z1q8wnacpQgpzKPnq53Wllcepao

La sheet exporta a CSV via /export?format=csv&gid=349018932. Estructura:

    [0]=vacio | [1]=DEPTO | [2]=NOMBRE | [3]=MAIL | [4]=OBS | [5]=vacio

Las primeras 3 filas son metadatos / encabezados. La columna MAIL puede ser
un email puro o un texto con uno o mas emails embebidos; el scraper extrae
el primer email valido encontrado.
"""
from __future__ import annotations

import csv
import io
import logging
import re
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

URL_SHEET_MAILS = (
    "https://docs.google.com/spreadsheets/d/"
    "1wFvWH516BMusWYd7Z1q8wnacpQgpzKPnq53Wllcepao/export?format=csv&gid=349018932"
)
HTTP_TIMEOUT_SECONDS = 30
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
# Por consistencia con la sheet de catedras, sacamos un posible sufijo
# numerico al final del nombre y colapsamos espacios internos.
_SUFIJO_NUMERICO_RE = re.compile(r"\s+\d+\s*$")


def _limpiar_nombre(nombre: str) -> str:
    """Saca sufijo numerico al final y colapsa espacios. Preserva tildes/case."""
    sin_sufijo = _SUFIJO_NUMERICO_RE.sub("", nombre)
    return " ".join(sin_sufijo.split())


@dataclass(frozen=True, slots=True)
class MailDocente:
    """Una fila de la sheet ya normalizada."""

    depto: str | None
    nombre: str
    email: str


def fetch_csv(url: str = URL_SHEET_MAILS) -> str:
    """Descarga el CSV exportado por Google Sheets. Levanta httpx.HTTPError."""
    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def _es_nombre_de_profesor(nombre: str) -> bool:
    """Filtra registros administrativos (ej. 'ALUMNADO') que no son docentes.

    Exige formato "Apellido, Nombre" con contenido a ambos lados de la coma.
    """
    if "," not in nombre:
        return False
    apellido, _, nombre_pila = nombre.partition(",")
    return bool(apellido.strip()) and bool(nombre_pila.strip())


def parsear_csv(texto: str) -> list[MailDocente]:
    """Extrae filas (depto, nombre, email) del CSV, deduplicando por (nombre, email).

    La sheet tiene unas pocas filas literalmente repetidas (mismo nombre y mail);
    las colapsamos aca para que el service no choque contra el unique de la DB.
    """
    visto: set[tuple[str, str]] = set()
    items: list[MailDocente] = []
    reader = csv.reader(io.StringIO(texto))
    rows = list(reader)
    # Las primeras 3 filas son metadatos / titulo / header
    for row in rows[3:]:
        if len(row) < 4:
            continue
        depto = row[1].strip() or None
        nombre = row[2].strip()
        mail_cell = row[3].strip()
        if not nombre or not mail_cell:
            continue
        if not _es_nombre_de_profesor(nombre):
            continue
        emails = _EMAIL_RE.findall(mail_cell)
        if not emails:
            continue
        nombre_limpio = _limpiar_nombre(nombre)
        if not nombre_limpio:
            continue
        key = (nombre_limpio, emails[0])
        if key in visto:
            continue
        visto.add(key)
        items.append(MailDocente(depto=depto, nombre=nombre_limpio, email=emails[0]))
    return items
