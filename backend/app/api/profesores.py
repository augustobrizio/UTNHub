"""Endpoints del dominio profesor.

Expone:
- ``GET  /profesores`` — listado completo.
- ``POST /profesores/sincronizar-horarios`` — scrapea la pagina del Dpto. ISI
  y hace full refresh de ``horario_consulta`` + ``materia_profesor``.
- ``POST /profesores/sincronizar-mails`` — enriquece emails desde la sheet
  publica de UTNTAC.
- ``POST /profesores/sincronizar-catedras-utntac`` — crea catedras desde la
  sheet de recomendaciones de UTNTAC.
"""
from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories import profesor_repo
from app.schemas.profesor import (
    ProfesorOut,
    ResultadoSincCatedras,
    ResultadoSincHorarios,
    ResultadoSincMails,
)
from app.services import profesor_consulta_service, profesor_utntac_service

router = APIRouter(prefix="/profesores", tags=["profesores"])


@router.get("", response_model=list[ProfesorOut])
def listar_profesores(
    db: Annotated[Session, Depends(get_db)],
) -> list[ProfesorOut]:
    """Lista todos los profesores cargados."""
    return [
        ProfesorOut.model_validate(p) for p in profesor_repo.list_profesores(db)
    ]


@router.post(
    "/sincronizar-horarios",
    response_model=ResultadoSincHorarios,
    summary="Scrapea horarios de consulta desde FRRO y reemplaza los actuales",
)
def sincronizar_horarios(
    db: Annotated[Session, Depends(get_db)],
) -> ResultadoSincHorarios:
    """Full refresh de ``horario_consulta`` y ``materia_profesor`` desde el
    sitio del Dpto. ISI. Los profesores se upsertean para preservar IDs.

    - 422 si el scraper no devuelve filas (cambio la pagina o el formato).
    - 502 si falla la descarga del sitio externo.
    """
    try:
        resultado = profesor_consulta_service.sincronizar_horarios_consulta(db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo obtener la pagina de FRRO: {e}",
        )

    db.commit()
    return resultado


@router.post(
    "/sincronizar-mails",
    response_model=ResultadoSincMails,
    summary="Enriquece emails de profesores desde la sheet UTNTAC",
)
def sincronizar_mails(
    db: Annotated[Session, Depends(get_db)],
) -> ResultadoSincMails:
    """Lee la sheet publica de UTNTAC con mails de docentes.

    Para cada fila con email valido: si el profesor existe en el padron y no
    tiene email, se lo seteamos; si no existe lo creamos. Nunca sobreescribe
    un email previo.

    - 502 si falla la descarga del Google Sheet.
    """
    try:
        resultado = profesor_utntac_service.sincronizar_mails(db)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo obtener la sheet de mails: {e}",
        )

    db.commit()
    return resultado


@router.post(
    "/sincronizar-catedras-utntac",
    response_model=ResultadoSincCatedras,
    summary="Crea catedras (profesor<->materia) desde la sheet de recomendaciones UTNTAC",
)
def sincronizar_catedras_utntac(
    db: Annotated[Session, Depends(get_db)],
) -> ResultadoSincCatedras:
    """Lee la sheet publica de recomendaciones de UTNTAC.

    Crea profesores nuevos (los que aparecen en la sheet y no estaban) y los
    asocia a la materia correspondiente del plan ISI via ``materia_profesor``.
    Asignaturas que no pertenecen al plan ISI (FISICA, INGLES, ECONOMIA, etc.)
    quedan reportadas pero el profesor igualmente se crea.

    Los puntajes/popularidad/recomendaciones de la sheet NO se capturan por
    ahora (requieren un modelo nuevo).

    - 502 si falla la descarga del Google Sheet.
    """
    try:
        resultado = profesor_utntac_service.sincronizar_catedras(db)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo obtener la sheet de catedras: {e}",
        )

    db.commit()
    return resultado
