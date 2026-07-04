"""Service de novedades: pipeline de ingesta + lectura/moderación.

``run_ingesta_novedades`` es el callable host-agnóstico del pipeline. Hoy lo
invoca APScheduler in-process y el endpoint ``POST /novedades/sincronizar``;
mañana podría invocarlo una función serverless sin cambiar esta lógica. No
sabe nada de scheduling ni de HTTP.

Pipeline por fuente:
    fetch_recientes -> dedup por external_id -> clasificación IA (solo nuevos)
    -> gate de moderación -> persistencia + evidencia -> ingesta_log (RNF-08)
"""
from __future__ import annotations

import logging
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.ai import clasificador_novedades
from app.config import get_settings
from app.db.models.novedad import EstadoIngesta, EstadoNovedad
from app.repositories import novedad_repo
from app.schemas.novedad import ResultadoFuente, ResultadoIngesta
from app.scrapers.novedades.base import FuenteNovedad, NovedadCruda

logger = logging.getLogger(__name__)


# --- Construcción de fuentes desde config ------------------------------------
def construir_fuentes() -> list[FuenteNovedad]:
    """Arma las fuentes habilitadas según la configuración.

    Import local de los scrapers concretos para no exigir dependencias
    pesadas (instagrapi) si la fuente no está configurada.
    """
    settings = get_settings()
    fuentes: list[FuenteNovedad] = []

    if settings.instagram_handles_list and settings.instagram_usuario:
        from app.scrapers.novedades.instagram import InstagramFuente

        fuentes.append(InstagramFuente())

    if settings.utn_novedades_url:
        from app.scrapers.novedades.utn_web import UtnWebFuente

        fuentes.append(UtnWebFuente())

    return fuentes


# --- Pipeline ----------------------------------------------------------------
def run_ingesta_novedades(
    db: Session, fuentes: Sequence[FuenteNovedad] | None = None
) -> ResultadoIngesta:
    """Ejecuta el pipeline para todas las fuentes y devuelve el resumen.

    Hace ``commit`` por fuente: si una fuente falla, lo ya persistido por las
    otras se conserva. Es idempotente gracias al dedup por ``external_id``.
    """
    if fuentes is None:
        fuentes = construir_fuentes()

    resultado = ResultadoIngesta()
    for fuente in fuentes:
        resultado.fuentes.append(_procesar_fuente(db, fuente))
    return resultado


def _procesar_fuente(db: Session, fuente: FuenteNovedad) -> ResultadoFuente:
    settings = get_settings()
    res = ResultadoFuente(fuente=fuente.nombre)
    iniciado_en = datetime.now()
    tokens_total = 0

    try:
        crudos = list(fuente.fetch_recientes())
    except Exception as e:  # noqa: BLE001  — un fallo de fuente no tumba el resto
        logger.exception("Fallo trayendo items de %s", fuente.nombre)
        res.estado = EstadoIngesta.ERROR.value
        res.errores.append(f"fetch: {e}")
        _registrar_log(db, res, iniciado_en, tokens=None)
        return res

    res.items_vistos = len(crudos)

    # Dedup ANTES del LLM: solo los external_id no vistos pasan al clasificador.
    existentes = novedad_repo.external_ids_existentes(
        db, [c.external_id for c in crudos]
    )
    nuevos = [c for c in crudos if c.external_id not in existentes]
    res.items_nuevos = len(nuevos)

    # Tope por corrida (control de costos, RNF-11). El resto se difiere.
    nuevos = nuevos[: settings.novedades_max_items_por_corrida]

    for crudo in nuevos:
        try:
            tokens_total += _clasificar_y_persistir(db, crudo, res)
        except Exception as e:  # noqa: BLE001 — un item fallido no tumba la corrida
            logger.exception("Fallo clasificando item %s", crudo.external_id)
            res.errores.append(f"{crudo.external_id}: {e}")

    if res.errores and res.estado == EstadoIngesta.OK.value:
        res.estado = EstadoIngesta.PARCIAL.value

    _registrar_log(db, res, iniciado_en, tokens=tokens_total)
    return res


def _clasificar_y_persistir(
    db: Session, crudo: NovedadCruda, res: ResultadoFuente
) -> int:
    """Clasifica un item, lo persiste con su estado y devuelve tokens usados."""
    settings = get_settings()
    salida = clasificador_novedades.clasificar(crudo)
    clf = salida.clasificacion

    if not clf.es_novedad:
        estado = EstadoNovedad.DESCARTADA.value
        res.items_descartados += 1
    elif clf.confianza >= settings.novedades_umbral_publicar:
        estado = EstadoNovedad.PUBLICADA.value
        res.items_novedad += 1
    else:
        estado = EstadoNovedad.PENDIENTE.value
        res.items_novedad += 1

    imagen_path = _guardar_evidencia(crudo)

    novedad_repo.crear_novedad(
        db,
        external_id=crudo.external_id,
        fuente=crudo.fuente,
        origen=crudo.origen,
        url=crudo.url,
        titulo=clf.titulo,
        descripcion=clf.descripcion,
        categoria=clf.categoria,
        imagen_url=crudo.imagen_url,
        imagen_path=imagen_path,
        estado=estado,
        confianza=clf.confianza,
        motivo_descarte=clf.motivo if not clf.es_novedad else None,
        fecha_publicacion=crudo.fecha_publicacion,
    )
    return salida.tokens


def _guardar_evidencia(crudo: NovedadCruda) -> str | None:
    """Persiste la imagen descargada como evidencia (cita de stories, RF-06)."""
    if not crudo.imagen_bytes:
        return None
    settings = get_settings()
    media_dir = Path(settings.novedades_media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    nombre = crudo.external_id.replace(":", "_").replace("/", "_")
    ext = "jpg"
    if crudo.imagen_mime and "/" in crudo.imagen_mime:
        ext = crudo.imagen_mime.split("/")[-1]
    destino = media_dir / f"{nombre}.{ext}"
    try:
        destino.write_bytes(crudo.imagen_bytes)
    except OSError:
        logger.warning("No se pudo guardar evidencia para %s", crudo.external_id)
        return None
    return str(destino)


def _registrar_log(
    db: Session,
    res: ResultadoFuente,
    iniciado_en: datetime,
    *,
    tokens: int | None,
) -> None:
    """Escribe el log de auditoría y commitea la fuente."""
    novedad_repo.crear_ingesta_log(
        db,
        fuente=res.fuente,
        iniciado_en=iniciado_en,
        finalizado_en=datetime.now(),
        items_vistos=res.items_vistos,
        items_nuevos=res.items_nuevos,
        items_novedad=res.items_novedad,
        items_descartados=res.items_descartados,
        tokens_usados=tokens,
        estado=res.estado,
        errores=res.errores or None,
    )
    db.commit()


# --- Lectura / moderación ----------------------------------------------------
def listar(
    db: Session,
    *,
    fuente: str | None = None,
    categoria: str | None = None,
    estado: str | None = "publicada",
    limite: int = 20,
    offset: int = 0,
):
    """Lista novedades para la API (por defecto solo ``publicada``)."""
    return novedad_repo.listar(
        db,
        fuente=fuente,
        categoria=categoria,
        estado=estado,
        limite=limite,
        offset=offset,
    )


def get(db: Session, novedad_id: int):
    """Obtiene una novedad por ID."""
    return novedad_repo.get(db, novedad_id)


def moderar(db: Session, novedad_id: int, estado: str):
    """Cambia el estado de moderación de una novedad y commitea."""
    novedad = novedad_repo.actualizar_estado(db, novedad_id, estado)
    if novedad is not None:
        db.commit()
    return novedad
