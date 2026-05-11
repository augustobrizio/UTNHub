"""Servicio de importacion masiva desde texto pegado de SYSACAD.

Flujo en dos pasos:
  1. parsear_texto() -> PreviewImportSysacad
       Parsea el texto tab-separado que el alumno copia del Estado Academico,
       hace fuzzy matching contra la DB y devuelve un preview para revisar.
  2. confirmar_importacion() -> ResultadoImportSysacad
       Aplica el batch upsert con los items que el alumno confirmo.

Sin dependencias externas de APIs. Solo rapidfuzz (instalado localmente).
"""
from __future__ import annotations

import logging
import re

from rapidfuzz import fuzz, process
from sqlalchemy.orm import Session

from app.db.models.academico import CondicionMateria
from app.repositories import materia_repo
from app.schemas.materia import (
    ConfirmarImportIn,
    ItemImportMapeado,
    PreviewImportSysacad,
    ResultadoImportSysacad,
)

logger = logging.getLogger(__name__)

# Score minimo para considerar un match valido y marcarlo como importar=True.
CONFIANZA_MINIMA = 0.72

# Materias del cursillo / pre-ingreso que NO pertenecen al plan de carrera.
# Se excluyen antes del fuzzy-matching para evitar falsos positivos
# (ej: "Física" del cursillo coincide con "Física I" al 86%).
_CURSILLO_EXCLUIR: frozenset[str] = frozenset({
    "física",
    "fisica",
    "matemática",
    "matematica",
    "química",
    "quimica",
    "taller de orientación universitaria",
    "taller de orientacion universitaria",
    "taller de ingreso",
    "ingreso a la universidad",
    "inglés técnico",
    "ingles tecnico",
})

# Prioridad de condiciones para deduplicacion (mayor numero = mayor prioridad).
_PRIO: dict[CondicionMateria, int] = {
    CondicionMateria.APROBADO: 4,
    CondicionMateria.CURSANDO: 3,
    CondicionMateria.REGULAR: 2,
    CondicionMateria.LIBRE: 1,
    CondicionMateria.NONE: 0,
}


# ---------------------------------------------------------------------------
# Parseo del campo "Estado" de SYSACAD
# ---------------------------------------------------------------------------

def _parsear_condicion(estado_texto: str) -> tuple[CondicionMateria, float | None]:
    """Interpreta el texto del campo Estado y devuelve (condicion, nota).

    Patrones conocidos de SYSACAD:
      "Aprobada con 8 (90 hs.) Tomo: 2 Folio: 45"  -> aprobado, nota=8
      "Aprobada con 7,5 (120 hs.) ..."              -> aprobado, nota=7.5
      "Cursa en 4K02 Aula 501 Zeballos 1341"        -> cursando, nota=None
      "Regular"                                      -> regular, nota=None
    """
    texto = estado_texto.strip().lower()

    if "aprobad" in texto:
        match = re.search(r"con\s+(\d+(?:[.,]\d+)?)", texto)
        nota: float | None = None
        if match:
            nota = float(match.group(1).replace(",", "."))
        return CondicionMateria.APROBADO, nota

    if "cursa" in texto:
        return CondicionMateria.CURSANDO, None

    if "regular" in texto:
        return CondicionMateria.REGULAR, None

    return CondicionMateria.LIBRE, None


# ---------------------------------------------------------------------------
# Parseo del texto pegado
# ---------------------------------------------------------------------------

def _parsear_texto(texto: str) -> list[dict]:
    """Extrae filas validas del texto copiado del Estado Academico de SYSACAD.

    El formato esperado es tab-separado, una fila por linea:
      <anio_carrera>  <nombre>  <estado_texto>  [<anio_cursada>]

    - Filas donde la primera columna no es un entero 1-9 se descartan
      (headers, filas en blanco, filas de seccion).
    - Filas con estado vacio se descartan (materias sin registro).
    - Duplicados (mismo nombre, puede pasar si pegan dos veces) se
      resuelven quedandose con el de mayor prioridad de condicion.
    """
    # key: nombre.lower() -> dict con los campos del item
    visto: dict[str, dict] = {}

    for linea in texto.splitlines():
        cols = linea.split("\t")

        # Minimo: anio + nombre
        if len(cols) < 2:
            continue

        # Primera columna: anio de carrera (0-9; 0 = pre-ingreso o sin anio)
        try:
            anio_carrera = int(cols[0].strip())
            if not 0 <= anio_carrera <= 9:
                continue
        except ValueError:
            continue  # header o fila de seccion

        nombre = cols[1].strip()
        if not nombre:
            continue

        # Excluir materias del cursillo / pre-ingreso (nombres exactos normalizados)
        if nombre.lower() in _CURSILLO_EXCLUIR:
            continue

        # Tercera columna: estado (puede estar vacia)
        estado_texto = cols[2].strip() if len(cols) > 2 else ""
        if not estado_texto:
            continue  # sin estado = sin registro, ignorar

        # Cuarta columna: anio cursada (ej: 2023) — opcional
        anio_cursada: int | None = None
        if len(cols) > 3:
            try:
                posible_anio = int(cols[3].strip())
                if 1990 <= posible_anio <= 2100:
                    anio_cursada = posible_anio
            except ValueError:
                pass

        # Fallback: extraer anio del texto de estado (ej: "Aprobada en 2023",
        # "Aprobada con 8 (90 hs.) en 2023", "Aprobada en 2do cuat. 2022")
        if anio_cursada is None:
            year_match = re.search(r"\b(20\d{2})\b", estado_texto)
            if year_match:
                anio_cursada = int(year_match.group(1))

        condicion, nota = _parsear_condicion(estado_texto)

        # Deduplicar: quedarse con el estado de mayor prioridad
        key = nombre.lower()
        if key in visto:
            existing_prio = _PRIO.get(visto[key]["condicion"], 0)
            new_prio = _PRIO.get(condicion, 0)
            if new_prio <= existing_prio:
                continue  # el que ya tenemos es mejor o igual

        visto[key] = {
            "nombre": nombre,
            "estado_texto": estado_texto,
            "condicion": condicion,
            "nota": nota,
            "anio_cursada": anio_cursada,
        }

    return list(visto.values())


# ---------------------------------------------------------------------------
# Fuzzy matching contra la DB
# ---------------------------------------------------------------------------

def _matchear_materias(
    items_parsed: list[dict],
    db: Session,
) -> list[ItemImportMapeado]:
    """Para cada item parseado busca la mejor materia en la DB por nombre."""
    todas = materia_repo.list_materias(db)
    nombre_a_codigo: dict[str, tuple[str, str]] = {
        m.nombre: (m.codigo, m.nombre) for m in todas
    }
    opciones = list(nombre_a_codigo.keys())

    resultado: list[ItemImportMapeado] = []

    for item in items_parsed:
        match = process.extractOne(
            item["nombre"],
            opciones,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=0,
        )

        if match is None:
            resultado.append(
                ItemImportMapeado(
                    nombre_original=item["nombre"],
                    estado_texto=item["estado_texto"],
                    materia_codigo=None,
                    materia_nombre=None,
                    confianza=0.0,
                    condicion=item["condicion"],
                    nota=item["nota"],
                    anio_cursada=item["anio_cursada"],
                    importar=False,
                )
            )
            continue

        nombre_match, score, _ = match
        confianza = round(score / 100.0, 4)
        codigo, nombre_real = nombre_a_codigo[nombre_match]

        resultado.append(
            ItemImportMapeado(
                nombre_original=item["nombre"],
                estado_texto=item["estado_texto"],
                materia_codigo=codigo,
                materia_nombre=nombre_real,
                confianza=confianza,
                condicion=item["condicion"],
                nota=item["nota"],
                anio_cursada=item["anio_cursada"],
                importar=confianza >= CONFIANZA_MINIMA,
            )
        )

    return resultado


# ---------------------------------------------------------------------------
# API publica del servicio
# ---------------------------------------------------------------------------

def parsear_texto(texto: str, db: Session) -> PreviewImportSysacad:
    """Paso 1: parsea el texto pegado y hace fuzzy matching. No toca la DB.

    Raises ValueError si el texto no contiene filas validas.
    """
    advertencias: list[str] = []

    items_parsed = _parsear_texto(texto)

    if not items_parsed:
        raise ValueError(
            "No se encontraron materias en el texto. "
            "Asegurate de copiar la tabla completa del Estado Academico de SYSACAD."
        )

    items_mapeados = _matchear_materias(items_parsed, db)

    sin_match = [i for i in items_mapeados if i.confianza < CONFIANZA_MINIMA]
    if sin_match:
        nombres = ", ".join(f'"{i.nombre_original}"' for i in sin_match[:4])
        sufijo = f" y {len(sin_match) - 4} mas" if len(sin_match) > 4 else ""
        advertencias.append(
            f"{len(sin_match)} materia(s) no se pudieron mapear automaticamente: "
            f"{nombres}{sufijo}. Podras agregarlas manualmente desde el grafo."
        )

    total_mapeados = sum(1 for i in items_mapeados if i.confianza >= CONFIANZA_MINIMA)

    return PreviewImportSysacad(
        items=items_mapeados,
        total_parseados=len(items_parsed),
        total_mapeados=total_mapeados,
        advertencias=advertencias,
    )


def confirmar_importacion(
    db: Session,
    usuario_id: int,
    payload: ConfirmarImportIn,
) -> ResultadoImportSysacad:
    """Paso 2: aplica el batch upsert para los items con importar=True."""
    from app.repositories.materia_repo import upsert_usuario_materia

    importadas = 0
    omitidas = 0
    errores: list[str] = []

    for item in payload.items:
        if not item.importar or not item.materia_codigo:
            omitidas += 1
            continue

        try:
            upsert_usuario_materia(
                db,
                usuario_id=usuario_id,
                materia_codigo=item.materia_codigo,
                condicion=item.condicion,
                nota=item.nota,
                anio_cursada=item.anio_cursada,
            )
            importadas += 1
        except Exception as e:  # noqa: BLE001
            logger.warning("Error importando %s: %s", item.materia_codigo, e)
            errores.append(f"{item.materia_nombre or item.materia_codigo}: {e}")
            omitidas += 1

    db.commit()
    return ResultadoImportSysacad(
        importadas=importadas,
        omitidas=omitidas,
        errores=errores,
    )
