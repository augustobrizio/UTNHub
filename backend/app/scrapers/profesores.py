"""Scraper de horarios de consulta del Dpto. ISI de FRRO.

Fuente: https://www.frro.utn.edu.ar/horarios_consulta_dptoisi2023.php?cont=349&subc=26

La pagina entrega los datos a traves de un POST al mismo endpoint con el
form de busqueda vacio (devuelve todos los registros). El HTML resultante
tiene una unica tabla de datos con 5 columnas:

    Dia | Docente | Materia | Lugar | Inicio

- ``Lugar`` puede ser fisico (ej: "5to Piso Dpto Sistemas") o un link
  (Zoom/Meet/Calendar/Forms). En el segundo caso clasificamos modalidad
  como "Virtual"; en el primero, "Presencial".
- La pagina NO publica hora_fin ni email del docente: ambos quedan ``None``.

Este modulo solo hace fetch + parseo. La persistencia y el matching de
materias contra la DB viven en ``services/profesor_consulta_service.py``.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import time

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

URL_HORARIOS_CONSULTA = (
    "https://www.frro.utn.edu.ar/horarios_consulta_dptoisi2023.php?cont=349&subc=26"
)
HTTP_TIMEOUT_SECONDS = 30

# Sustrings que indican que el "Lugar" es un link en vez de un aula fisica.
_INDICADORES_VIRTUAL: tuple[str, ...] = (
    "http://", "https://", "zoom.us", "meet.google", "calendar", "calendly", "forms",
)


@dataclass(frozen=True, slots=True)
class HorarioParseado:
    """Una fila del scraper, ya normalizada pero todavia sin matchear a la DB."""

    nombre_profesor: str
    email: str | None
    materia_nombre: str | None
    dia: str | None
    hora_inicio: time | None
    hora_fin: time | None
    modalidad: str | None
    aula: str | None


def fetch_html(url: str = URL_HORARIOS_CONSULTA) -> str:
    """Descarga el HTML hace POST al form vacio. Levanta ``httpx.HTTPError`` si falla.

    El sitio renderiza solo el formulario si se hace GET; hay que enviar el form
    para que devuelva la tabla con todos los registros.
    """
    data = {"subc": "26", "cont": "349", "docente": "", "materia": "", "buscar": "Buscar"}
    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
        resp = client.post(url, data=data)
        resp.raise_for_status()
        return resp.text


def _clean(texto: str) -> str:
    """Colapsa espacios internos y hace strip."""
    return re.sub(r"\s+", " ", texto).strip()


def _parsear_hora(raw: str) -> time | None:
    """'16:30:00' / '16:30' -> time(16, 30). Devuelve None si no matchea."""
    m = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", raw.strip())
    if not m:
        return None
    try:
        return time(int(m.group(1)), int(m.group(2)), int(m.group(3) or 0))
    except ValueError:
        return None


def _clasificar_lugar(lugar: str) -> tuple[str, str | None]:
    """Devuelve (modalidad, aula).

    Si el lugar es un link → ("Virtual", url). Si es fisico → ("Presencial", texto).
    Si el lugar viene vacio → ("Presencial", None) por defecto.
    """
    if not lugar:
        return ("Presencial", None)
    lugar_lower = lugar.lower()
    if any(token in lugar_lower for token in _INDICADORES_VIRTUAL):
        return ("Virtual", lugar)
    return ("Presencial", lugar)


def parsear_html(html: str) -> list[HorarioParseado]:
    """Extrae las filas de la tabla de horarios de consulta.

    Identificamos la tabla de datos por presencia de un ``<td>`` con texto
    "Docente" en el header. Cada fila siguiente con 5 ``<td>`` se mapea a un
    ``HorarioParseado``.
    """
    soup = BeautifulSoup(html, "html.parser")
    items: list[HorarioParseado] = []

    tabla = None
    for t in soup.find_all("table"):
        encabezados = [_clean(td.get_text()) for td in t.find_all("td")[:8]]
        if "Docente" in encabezados and "Materia" in encabezados:
            tabla = t
            break

    if tabla is None:
        logger.warning("No se encontro la tabla de horarios en el HTML")
        return items

    for fila in tabla.find_all("tr"):
        celdas = fila.find_all("td")
        if len(celdas) != 5:
            continue  # header u otra fila
        dia_raw, docente_raw, materia_raw, lugar_raw, hora_raw = (
            _clean(c.get_text()) for c in celdas
        )
        # Skip la fila de header (estilo_titulo)
        if dia_raw == "Dia" and docente_raw == "Docente":
            continue
        if not docente_raw:
            continue

        modalidad, aula = _clasificar_lugar(lugar_raw)
        items.append(
            HorarioParseado(
                nombre_profesor=docente_raw,
                email=None,
                materia_nombre=materia_raw or None,
                dia=dia_raw or None,
                hora_inicio=_parsear_hora(hora_raw),
                hora_fin=None,
                modalidad=modalidad,
                aula=aula,
            )
        )

    return items
