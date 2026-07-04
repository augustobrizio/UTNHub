"""Repository de novedades e ingesta_log."""
from __future__ import annotations

from collections.abc import Iterable, Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.novedad import IngestaLog, Novedad


# --- Dedup --------------------------------------------------------------------
def external_ids_existentes(
    db: Session, external_ids: Iterable[str]
) -> set[str]:
    """Devuelve, de los ``external_ids`` dados, cuáles ya están en la DB.

    Se usa para filtrar items ya vistos *antes* de invocar al clasificador IA
    (ahorro de tokens / idempotencia).
    """
    ids = [eid for eid in external_ids if eid]
    if not ids:
        return set()
    stmt = select(Novedad.external_id).where(Novedad.external_id.in_(ids))
    return {row[0] for row in db.execute(stmt).all() if row[0] is not None}


# --- Escritura ----------------------------------------------------------------
def crear_novedad(
    db: Session,
    *,
    external_id: str,
    fuente: str,
    origen: str | None,
    url: str | None,
    titulo: str | None,
    descripcion: str | None,
    categoria: str | None,
    imagen_url: str | None,
    imagen_path: str | None,
    estado: str,
    confianza: float | None,
    motivo_descarte: str | None,
    fecha_publicacion: datetime | None,
) -> Novedad:
    """Inserta una novedad ya clasificada. Hace flush (no commit)."""
    novedad = Novedad(
        external_id=external_id,
        fuente=fuente,
        origen=origen,
        url=url,
        titulo=titulo,
        descripcion=descripcion,
        categoria=categoria,
        imagen_url=imagen_url,
        imagen_path=imagen_path,
        estado=estado,
        confianza=confianza,
        motivo_descarte=motivo_descarte,
        fecha_publicacion=fecha_publicacion,
    )
    db.add(novedad)
    db.flush()
    return novedad


# --- Lectura ------------------------------------------------------------------
def listar(
    db: Session,
    *,
    fuente: str | None = None,
    categoria: str | None = None,
    estado: str | None = "publicada",
    limite: int = 20,
    offset: int = 0,
) -> Sequence[Novedad]:
    """Lista novedades ordenadas por fecha de publicación descendente.

    Por defecto solo trae las ``publicada`` (lo que ve el estudiante). Pasar
    ``estado=None`` para traer todos los estados (uso admin / moderación).
    """
    stmt = select(Novedad)
    if fuente is not None:
        stmt = stmt.where(Novedad.fuente == fuente)
    if categoria is not None:
        stmt = stmt.where(Novedad.categoria == categoria)
    if estado is not None:
        stmt = stmt.where(Novedad.estado == estado)
    stmt = stmt.order_by(
        Novedad.fecha_publicacion.desc().nullslast(),
        Novedad.created_at.desc().nullslast(),
        Novedad.id.desc(),
    )
    stmt = stmt.limit(limite).offset(offset)
    return db.execute(stmt).scalars().all()


def get(db: Session, novedad_id: int) -> Novedad | None:
    """Obtiene una novedad por ID."""
    return db.get(Novedad, novedad_id)


def actualizar_estado(
    db: Session, novedad_id: int, estado: str
) -> Novedad | None:
    """Cambia el estado de moderación de una novedad. Hace flush (no commit)."""
    novedad = db.get(Novedad, novedad_id)
    if novedad is None:
        return None
    novedad.estado = estado
    db.flush()
    return novedad


# --- Auditoría (RNF-08) -------------------------------------------------------
def crear_ingesta_log(
    db: Session,
    *,
    fuente: str,
    iniciado_en: datetime,
    finalizado_en: datetime,
    items_vistos: int,
    items_nuevos: int,
    items_novedad: int,
    items_descartados: int,
    tokens_usados: int | None,
    estado: str,
    errores: list[str] | None,
) -> IngestaLog:
    """Registra una corrida del pipeline. Hace flush (no commit)."""
    log = IngestaLog(
        fuente=fuente,
        iniciado_en=iniciado_en,
        finalizado_en=finalizado_en,
        items_vistos=items_vistos,
        items_nuevos=items_nuevos,
        items_novedad=items_novedad,
        items_descartados=items_descartados,
        tokens_usados=tokens_usados,
        estado=estado,
        errores="\n".join(errores) if errores else None,
    )
    db.add(log)
    db.flush()
    return log
