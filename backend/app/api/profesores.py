"""Endpoints del dominio profesor.

Por ahora expone:
- ``GET  /profesores`` — listado completo.
- ``POST /profesores/sincronizar-horarios`` — scrapea la pagina del Dpto. ISI
  y hace full refresh de ``horario_consulta`` + ``materia_profesor``.
"""
from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories import profesor_repo
from app.schemas.profesor import ProfesorOut, ResultadoSincHorarios
from app.services import profesor_consulta_service

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
