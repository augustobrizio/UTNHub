"""Scraper del calendario academico de FRRO / Dpto. ISI.

Este modulo solo descarga y parsea fuentes. La persistencia vive en
``services/calendario_service.py``.
"""
from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass
from datetime import datetime, time
from urllib.parse import parse_qs, urljoin, urlparse

import fitz
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

URL_CALENDARIO_ISI = "https://www.frro.utn.edu.ar/contenido.php?cont=350&subc=26"
URL_MESAS_ISI = "https://www.frro.utn.edu.ar/contenido.php?cont=400&subc=26"
HTTP_TIMEOUT_SECONDS = 30

MESES_ES: dict[str, int] = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}


@dataclass(frozen=True, slots=True)
class FuenteCalendario:
    """Fuente remota que se intentara procesar."""

    url: str
    carrera: str | None
    tipo_preferido: str | None = None


@dataclass(frozen=True, slots=True)
class EventoParseado:
    """Evento normalizado, todavia sin persistir."""

    titulo: str
    descripcion: str | None
    fecha_inicio: datetime
    fecha_fin: datetime | None
    tipo: str
    carrera: str | None
    fuente_url: str | None
    content_hash: str


def fetch_text(url: str) -> str:
    """Descarga una pagina HTML o texto."""
    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def fetch_bytes(url: str) -> bytes:
    """Descarga contenido binario, siguiendo redirects."""
    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content


def extraer_links_fuente(html: str, base_url: str) -> list[str]:
    """Extrae links candidatos a PDF/Drive desde una pagina FRRO."""
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    vistos: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        texto = _clean(a.get_text(" "))
        url = urljoin(base_url, href)
        if not _es_link_calendario(url, texto):
            continue
        if url not in vistos:
            vistos.add(url)
            links.append(url)
    return links


def parsear_fuente_html(
    html: str, *, fuente_url: str, carrera: str | None
) -> list[EventoParseado]:
    """Parsea eventos fechados directamente en HTML.

    En FRRO muchas paginas solo enlazan PDFs, pero esta funcion permite
    capturar noticias o paginas simples con fechas embebidas.
    """
    soup = BeautifulSoup(html, "html.parser")
    texto = soup.get_text("\n")
    return parsear_texto_eventos(texto, fuente_url=fuente_url, carrera=carrera)


def parsear_pdf(
    pdf_bytes: bytes,
    *,
    fuente_url: str,
    carrera: str | None,
    tipo_preferido: str | None = None,
) -> list[EventoParseado]:
    """Extrae eventos desde un PDF usando PyMuPDF."""
    texto_paginas: list[str] = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            texto_paginas.append(page.get_text("text"))
    texto = "\n".join(texto_paginas)
    eventos = parsear_texto_eventos(
        texto,
        fuente_url=fuente_url,
        carrera=carrera,
        tipo_preferido=tipo_preferido,
    )
    if eventos:
        return eventos

    if _es_calendario_academico_2026_2027(fuente_url, texto):
        return _eventos_calendario_isi_2026_2027(fuente_url, carrera)

    # Fallback para PDFs de ternas que publican solo dia de semana/hora.
    if tipo_preferido == "mesa" or "ternas" in fuente_url.lower():
        fecha = _inferir_fecha_desde_url(fuente_url) or datetime.now().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        resumen = _resumen_texto(texto, max_lineas=25)
        return [
            _crear_evento(
                titulo="Mesas de Examenes Finales ISI",
                descripcion=resumen,
                fecha_inicio=fecha,
                fecha_fin=None,
                tipo="mesa",
                carrera=carrera,
                fuente_url=fuente_url,
            )
        ]
    return []


def parsear_texto_eventos(
    texto: str,
    *,
    fuente_url: str,
    carrera: str | None,
    tipo_preferido: str | None = None,
) -> list[EventoParseado]:
    """Busca lineas con fechas y las convierte en eventos."""
    eventos: list[EventoParseado] = []
    anio_default = _inferir_anio(texto, fuente_url) or datetime.now().year
    for raw_linea in texto.splitlines():
        linea = _clean(raw_linea)
        if len(linea) < 8:
            continue
        rango = _extraer_rango_fecha(linea, anio_default)
        if rango is None:
            continue
        fecha_inicio, fecha_fin = rango
        tipo = tipo_preferido or _clasificar_tipo(linea)
        titulo = _titulo_desde_linea(linea)
        eventos.append(
            _crear_evento(
                titulo=titulo,
                descripcion=linea if linea != titulo else None,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                tipo=tipo,
                carrera=carrera,
                fuente_url=fuente_url,
            )
        )
    return _deduplicar_eventos(eventos)


def url_drive_a_descarga(url: str) -> str:
    """Convierte URLs de Google Drive a descarga directa cuando es posible."""
    parsed = urlparse(url)
    if "drive.google.com" not in parsed.netloc:
        return url
    match = re.search(r"/file/d/([^/]+)", parsed.path)
    if match:
        file_id = match.group(1)
        return f"https://drive.usercontent.google.com/download?id={file_id}&export=download"
    qs = parse_qs(parsed.query)
    if "id" in qs and qs["id"]:
        return f"https://drive.usercontent.google.com/download?id={qs['id'][0]}&export=download"
    return url


def _es_link_calendario(url: str, texto: str) -> bool:
    objetivo = f"{url} {texto}".lower()
    palabras = ("calendario", "examen", "mesa", "terna", "resolucion")
    return (".pdf" in objetivo or "drive.google.com" in objetivo) and any(
        palabra in objetivo for palabra in palabras
    )


def _clean(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip()


def _clasificar_tipo(linea: str) -> str:
    lower = linea.lower()
    if any(p in lower for p in ("feriado", "asueto", "sin actividad")):
        return "feriado"
    # Las inscripciones se tratan como eventos institucionales (antes que 'examen'
    # para que "inscripción a finales" no caiga en examen por la palabra "final").
    if any(p in lower for p in ("inscrip", "preinscrip")):
        return "evento"
    # Mesas de examen institucionales (no son "el examen del alumno").
    if any(p in lower for p in ("examen", "mesa", "final", "parcial")):
        return "mesa"
    return "evento"


def _extraer_rango_fecha(
    linea: str, anio_default: int
) -> tuple[datetime, datetime | None] | None:
    matches = list(
        re.finditer(r"(?P<dia>\d{1,2})[/-](?P<mes>\d{1,2})(?:[/-](?P<anio>\d{2,4}))?", linea)
    )
    if not matches:
        return _extraer_fecha_textual(linea, anio_default)
    inicio = _datetime_desde_match(matches[0], anio_default)
    if inicio is None:
        return None
    fin = None
    if len(matches) > 1:
        fin = _datetime_desde_match(matches[1], inicio.year)
    return inicio, fin


def _extraer_fecha_textual(
    linea: str, anio_default: int
) -> tuple[datetime, datetime | None] | None:
    """Soporta fechas como ``10 de agosto de 2026`` y rangos simples."""
    patron = (
        r"(?P<dia>\d{1,2})\s+de\s+"
        r"(?P<mes>enero|febrero|marzo|abril|mayo|junio|julio|agosto|"
        r"septiembre|setiembre|octubre|noviembre|diciembre)"
        r"(?:\s+de\s+(?P<anio>\d{4}))?"
    )
    matches = list(re.finditer(patron, linea.lower()))
    if not matches:
        return None
    inicio = _datetime_desde_fecha_textual(matches[0], anio_default)
    if inicio is None:
        return None
    fin = None
    if len(matches) > 1:
        fin = _datetime_desde_fecha_textual(matches[1], inicio.year)
    return inicio, fin


def _datetime_desde_fecha_textual(
    match: re.Match[str], anio_default: int
) -> datetime | None:
    dia = int(match.group("dia"))
    mes = MESES_ES[match.group("mes")]
    anio = int(match.group("anio") or anio_default)
    try:
        return datetime.combine(datetime(anio, mes, dia).date(), time.min)
    except ValueError:
        return None


def _datetime_desde_match(match: re.Match[str], anio_default: int) -> datetime | None:
    dia = int(match.group("dia"))
    mes = int(match.group("mes"))
    anio_raw = match.group("anio")
    anio = anio_default
    if anio_raw:
        anio = int(anio_raw)
        if anio < 100:
            anio += 2000
    try:
        return datetime.combine(datetime(anio, mes, dia).date(), time.min)
    except ValueError:
        return None


def _inferir_anio(texto: str, fuente_url: str) -> int | None:
    for origen in (fuente_url, texto[:500]):
        match = re.search(r"(20\d{2})", origen)
        if match:
            return int(match.group(1))
    return None


def _inferir_fecha_desde_url(fuente_url: str) -> datetime | None:
    match = re.search(r"(20\d{2})[-_](\d{1,2})[-_](\d{1,2})", fuente_url)
    if not match:
        return None
    try:
        return datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return None


def _titulo_desde_linea(linea: str) -> str:
    sin_fecha = re.sub(
        r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b", "", linea
    )
    sin_fecha = re.sub(
        r"\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|"
        r"agosto|septiembre|setiembre|octubre|noviembre|diciembre)"
        r"(?:\s+de\s+\d{4})?\b",
        "",
        sin_fecha,
        flags=re.IGNORECASE,
    )
    sin_fecha = re.sub(r"\s+", " ", sin_fecha).strip(" :-")
    return sin_fecha[:140] or linea[:140]


def _crear_evento(
    *,
    titulo: str,
    descripcion: str | None,
    fecha_inicio: datetime,
    fecha_fin: datetime | None,
    tipo: str,
    carrera: str | None,
    fuente_url: str | None,
) -> EventoParseado:
    hash_input = "|".join(
        [
            titulo.strip().lower(),
            fecha_inicio.isoformat(),
            fecha_fin.isoformat() if fecha_fin else "",
            tipo,
            carrera or "",
            fuente_url or "",
        ]
    )
    return EventoParseado(
        titulo=titulo.strip(),
        descripcion=descripcion.strip() if descripcion else None,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        tipo=tipo,
        carrera=carrera,
        fuente_url=fuente_url,
        content_hash=hashlib.sha256(hash_input.encode("utf-8")).hexdigest(),
    )


def _deduplicar_eventos(eventos: list[EventoParseado]) -> list[EventoParseado]:
    vistos: set[str] = set()
    dedup: list[EventoParseado] = []
    for evento in eventos:
        if evento.content_hash in vistos:
            continue
        vistos.add(evento.content_hash)
        dedup.append(evento)
    return dedup


def _resumen_texto(texto: str, *, max_lineas: int) -> str | None:
    lineas = [_clean(linea) for linea in texto.splitlines()]
    utiles = [linea for linea in lineas if linea]
    if not utiles:
        return None
    return "\n".join(utiles[:max_lineas])


def _es_calendario_academico_2026_2027(fuente_url: str, texto: str) -> bool:
    objetivo = f"{fuente_url} {texto[:500]}".lower()
    return (
        "1lcgxovghd9pvf4zs_tchztad8ebwxnst" in objetivo
        or ("calendario" in objetivo and "2026" in objetivo and "2027" in objetivo)
    )


def _eventos_calendario_isi_2026_2027(
    fuente_url: str, carrera: str | None
) -> list[EventoParseado]:
    """Fallback para el PDF visual de Gradiente/ISI 2026-2027.

    El PDF oficial publicado por FRRO es una imagen sin texto extraible. Estos
    eventos reflejan la codificacion visual del calendario: celeste = mesa,
    borde negro = feriado sin actividad, circulo = inicio/fin de cuatrimestre,
    borde celeste = mesa especial.
    """
    eventos: list[EventoParseado] = []

    def add(
        titulo: str,
        fecha: str,
        tipo: str,
        descripcion: str | None = None,
        fin: str | None = None,
    ) -> None:
        eventos.append(
            _crear_evento(
                titulo=titulo,
                descripcion=descripcion,
                fecha_inicio=datetime.fromisoformat(fecha),
                fecha_fin=datetime.fromisoformat(fin) if fin else None,
                tipo=tipo,
                carrera=carrera,
                fuente_url=fuente_url,
            )
        )

    for inicio, fin in (
        ("2026-02-09", "2026-02-13"),
        ("2026-02-23", "2026-02-27"),
        ("2026-03-09", "2026-03-13"),
        ("2026-04-09", "2026-04-10"),
        ("2026-04-15", None),
        ("2026-04-21", None),
        ("2026-04-27", None),
        ("2026-05-07", "2026-05-08"),
        ("2026-05-13", None),
        ("2026-05-18", "2026-05-19"),
        ("2026-08-07", None),
        ("2026-08-13", None),
        ("2026-08-25", "2026-08-26"),
        ("2026-08-31", None),
        ("2026-09-04", None),
        ("2026-09-10", None),
        ("2026-09-16", None),
        ("2026-09-22", None),
        ("2026-09-28", None),
        ("2026-11-16", "2026-11-20"),
        ("2026-11-30", None),
        ("2026-12-01", "2026-12-04"),
        ("2026-12-14", "2026-12-18"),
        ("2027-02-10", "2027-02-12"),
        ("2027-02-22", "2027-02-26"),
        ("2027-03-08", "2027-03-12"),
    ):
        add("Mesa de Examen", inicio, "mesa", "Fecha de mesa de examen.", fin)

    for inicio, fin in (
        ("2026-06-22", "2026-06-26"),
        ("2026-10-26", "2026-10-30"),
    ):
        add(
            "Mesa Especial",
            inicio,
            "mesa",
            "Mesa especial. La inscripcion se confirma por Legajos y Actas.",
            fin,
        )

    feriados = {
        "2026-02-16": "Carnaval",
        "2026-02-17": "Carnaval",
        "2026-03-23": "Feriado Turistico",
        "2026-03-24": "Dia Nacional de la Memoria por la Verdad y la Justicia",
        "2026-04-02": "Dia del Veterano y los Caidos en la Guerra de Malvinas",
        "2026-04-03": "Viernes Santo",
        "2026-05-01": "Dia del Trabajador",
        "2026-05-02": "Dia del Docente Tecnologico",
        "2026-05-25": "Aniversario de la Revolucion de Mayo",
        "2026-06-15": "Paso a la Inmortalidad del Gral. Guemes",
        "2026-06-20": "Paso a la Inmortalidad del Gral. Belgrano",
        "2026-06-27": "Dia del Trabajador del Estado",
        "2026-07-09": "Dia de la Independencia",
        "2026-07-10": "Feriado Turistico",
        "2026-08-17": "Paso a la Inmortalidad del Gral. San Martin",
        "2026-08-19": "Aniversario de la Fundacion de la UON",
        "2026-09-21": "Dia del Estudiante",
        "2026-10-07": "Dia de la Virgen de Rosario",
        "2026-10-12": "Dia del Respeto a la Diversidad Cultural",
        "2026-11-23": "Dia de la Soberania Nacional (Trasladado 20/11)",
        "2026-11-26": "Dia del No Docente",
        "2026-12-07": "Feriado Turistico",
        "2026-12-08": "Inmaculada Concepcion de Maria",
        "2026-12-25": "Navidad",
        "2027-02-08": "Carnaval",
        "2027-02-09": "Carnaval",
        "2027-03-24": "Dia Nacional de la Memoria por la Verdad y la Justicia",
    }
    for fecha, titulo in feriados.items():
        add(titulo, fecha, "feriado", f"Feriado sin actividad academica: {titulo}.")

    for fecha, titulo in (
        ("2026-03-16", "Inicio del 1er Cuatrimestre"),
        ("2026-07-03", "Fin del 1er Cuatrimestre"),
        ("2026-07-20", "Inicio del 2do Cuatrimestre"),
        ("2026-11-13", "Fin del 2do Cuatrimestre"),
        ("2027-03-15", "Inicio del 1er Cuatrimestre"),
    ):
        add(titulo, fecha, "evento")

    add(
        "Inscripcion a materias anuales y del 1er Cuatrimestre",
        "2026-03-02",
        "evento",
        "Periodo de inscripcion a materias anuales y del 1er cuatrimestre.",
        "2026-03-16",
    )
    add(
        "Inscripcion a materias del 2do Cuatrimestre",
        "2026-07-06",
        "evento",
        "Periodo de inscripcion a materias del 2do cuatrimestre.",
        "2026-07-20",
    )
    add(
        "Inscripcion por Equivalencias",
        "2026-05-04",
        "evento",
        "Periodo de inscripcion por equivalencias.",
        "2026-09-11",
    )

    return _deduplicar_eventos(eventos)
