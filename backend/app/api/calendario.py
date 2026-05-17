"""Endpoints REST del calendario academico."""
from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.calendario import (
    EventoCalendarioOut,
    ResultadoSincCalendario,
    TipoEventoLiteral,
)
from app.services import calendario_service

router = APIRouter(prefix="/calendario", tags=["calendario"])


@router.get("", response_model=list[EventoCalendarioOut])
def listar_eventos(
    db: Annotated[Session, Depends(get_db)],
    desde: date | None = Query(None, description="Fecha inicial inclusive"),
    hasta: date | None = Query(None, description="Fecha final inclusive"),
    tipo: TipoEventoLiteral | None = Query(None),
    carrera: str | None = Query("ISI", description="ISI o null para todas"),
) -> list[EventoCalendarioOut]:
    """Lista eventos del calendario con filtros."""
    eventos = calendario_service.listar_eventos(
        db,
        desde=desde,
        hasta=hasta,
        tipo=tipo,
        carrera=carrera,
    )
    return [EventoCalendarioOut.model_validate(e) for e in eventos]


@router.get("/proximos", response_model=list[EventoCalendarioOut])
def proximos_eventos(
    db: Annotated[Session, Depends(get_db)],
    limite: int = Query(5, ge=1, le=50),
    carrera: str | None = Query("ISI"),
) -> list[EventoCalendarioOut]:
    """Eventos futuros mas cercanos."""
    eventos = calendario_service.proximos_eventos(
        db,
        limite=limite,
        carrera=carrera,
    )
    return [EventoCalendarioOut.model_validate(e) for e in eventos]


@router.get("/hoy", response_model=list[EventoCalendarioOut])
def eventos_hoy(
    db: Annotated[Session, Depends(get_db)],
    carrera: str | None = Query("ISI"),
) -> list[EventoCalendarioOut]:
    """Eventos de hoy."""
    eventos = calendario_service.eventos_hoy(db, carrera=carrera)
    return [EventoCalendarioOut.model_validate(e) for e in eventos]


@router.get("/{evento_id}", response_model=EventoCalendarioOut)
def get_evento(
    evento_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> EventoCalendarioOut:
    """Detalle de un evento por ID."""
    evento = calendario_service.get_evento(db, evento_id)
    if evento is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evento {evento_id} no encontrado.",
        )
    return EventoCalendarioOut.model_validate(evento)


@router.post(
    "/sincronizar",
    response_model=ResultadoSincCalendario,
    summary="Ingesta eventos desde fuentes FRRO configuradas",
)
def sincronizar_calendario(
    db: Annotated[Session, Depends(get_db)],
) -> ResultadoSincCalendario:
    """Scrapea FRRO y persiste eventos de forma idempotente."""
    resultado = calendario_service.sincronizar_calendario(db)
    if resultado.errores and resultado.eventos_detectados == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=resultado.model_dump(),
        )
    db.commit()
    return resultado
