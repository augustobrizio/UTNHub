"""Scraper de catedras (profesor <-> asignatura) desde la sheet publica de UTNTAC.

Fuente: https://docs.google.com/spreadsheets/d/1xMUE0nWESjKjLFfJgA7MixmPtqPUNeKgTAQ6QwIDRHQ

La sheet exporta a CSV via /export?format=csv&gid=0. Columnas relevantes:

    [0]=AÑO ("1° AÑO", "2° AÑO"...) | [1]=Asignatura | [2]=Profesor | (resto ignorado)

La sheet usa el patron de "una asignatura por bloque" — la asignatura
aparece solo en la primera fila del grupo y queda vacia en las
subsiguientes (hay que hacer forward-fill). El AÑO funciona igual.

Las columnas con Clasificacion, Popularidad, Puntaje, etc. NO se
capturan por ahora (deuda explicita: requieren un modelo nuevo).
"""
from __future__ import annotations

import csv
import io
import logging
import re
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

URL_SHEET_CATEDRAS = (
    "https://docs.google.com/spreadsheets/d/"
    "1xMUE0nWESjKjLFfJgA7MixmPtqPUNeKgTAQ6QwIDRHQ/export?format=csv&gid=0"
)
HTTP_TIMEOUT_SECONDS = 30

# Una fila del tipo "1° AÑO" o "2do AÑO" en la columna Asignatura es un
# separador de grupo, no una asignatura real.
_ANIO_TITULO_RE = re.compile(r"^\d+°?\s*A[ÑN]O$", re.IGNORECASE)

# Sufijo numerico que UTNTAC pone para distinguir filas del MISMO profesor en
# distintas materias (cada fila es una evaluacion distinta). Ej:
#   "ANGIORAMA, Marina Celeste"     -> dicta ÁLGEBRA Y GEOMETRÍA ANALÍTICA
#   "ANGIORAMA, Marina Celeste  2"  -> dicta PROBABILIDAD Y ESTADÍSTICA
#   "DIAZ, Daniela Elisabet  3"     -> dicta ENTORNOS GRÁFICOS
# El sufijo NO forma parte del nombre real; lo strippeamos para no generar
# profesores fantasma.
_SUFIJO_NUMERICO_RE = re.compile(r"\s+\d+\s*$")


def _limpiar_nombre(nombre: str) -> str:
    """Normaliza el nombre como aparece en la sheet: saca sufijo numerico y
    colapsa espacios. Preserva capitalizacion y tildes.
    """
    sin_sufijo = _SUFIJO_NUMERICO_RE.sub("", nombre)
    return " ".join(sin_sufijo.split())


@dataclass(frozen=True, slots=True)
class CatedraDocente:
    """Asociacion (asignatura, profesor) detectada en la sheet."""

    anio: str | None
    asignatura: str
    nombre_profesor: str


def fetch_csv(url: str = URL_SHEET_CATEDRAS) -> str:
    """Descarga el CSV exportado por Google Sheets. Levanta httpx.HTTPError."""
    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def _es_nombre_de_profesor(nombre: str) -> bool:
    """Filtra entradas que no son nombres de docente.

    Exige formato "Apellido, Nombre" con contenido a ambos lados de la coma.
    Rechaza entradas defectuosas como ", Carlo" (data mal cargada en la sheet)
    o "DI CARLO" (sin coma).
    """
    if "," not in nombre:
        return False
    apellido, _, nombre_pila = nombre.partition(",")
    return bool(apellido.strip()) and bool(nombre_pila.strip())


def parsear_csv(texto: str) -> list[CatedraDocente]:
    """Extrae pares (anio, asignatura, profesor) aplicando ffill por bloque.

    Deduplica por (asignatura, profesor) para no procesar la misma asociacion
    dos veces si la sheet la repite.
    """
    visto: set[tuple[str, str]] = set()
    items: list[CatedraDocente] = []
    reader = csv.reader(io.StringIO(texto))
    rows = list(reader)

    ultimo_anio: str | None = None
    ultima_asig: str | None = None

    # Las primeras 2 filas son blank / header
    for row in rows[2:]:
        if len(row) < 3:
            continue
        anio_raw = row[0].strip()
        asig_raw = row[1].strip()
        prof_raw = row[2].strip()

        if anio_raw:
            ultimo_anio = anio_raw

        if asig_raw:
            if _ANIO_TITULO_RE.match(asig_raw):
                # Es un separador, no una asignatura. Resetear hasta la proxima.
                ultima_asig = None
            else:
                ultima_asig = asig_raw

        if not prof_raw or not ultima_asig:
            continue
        if not _es_nombre_de_profesor(prof_raw):
            continue

        prof_limpio = _limpiar_nombre(prof_raw)
        if not prof_limpio:
            continue

        key = (ultima_asig, prof_limpio)
        if key in visto:
            continue
        visto.add(key)

        items.append(
            CatedraDocente(
                anio=ultimo_anio,
                asignatura=ultima_asig,
                nombre_profesor=prof_limpio,
            )
        )

    return items
