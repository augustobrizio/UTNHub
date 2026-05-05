"""Endpoints REST para el dominio académico.

Capa de presentación: nunca acceder a la DB ni reglas de negocio acá.
Todas las llamadas pasan por ``services.materia_service`` o
``services.correlatividad_service``.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.materia import (
    GrafoResponse,
    MateriaOut,
    TipoMateriaLiteral,
    ValidacionCorrelativas,
)
from app.services import correlatividad_service, materia_service

router = APIRouter(prefix="/materias", tags=["materias"])


@router.get("", response_model=list[MateriaOut])
def listar_materias(
    db: Annotated[Session, Depends(get_db)],
    tipo: TipoMateriaLiteral | None = Query(
        None, description="Filtrar por troncal o electiva"
    ),
) -> list[MateriaOut]:
    """Lista plana de materias del plan, opcionalmente filtrada por tipo."""
    materias = materia_service.listar_materias(db, tipo=tipo)
    return [MateriaOut.model_validate(m) for m in materias]


@router.get("/grafo", response_model=GrafoResponse)
def grafo_materias(
    db: Annotated[Session, Depends(get_db)],
    tipo: TipoMateriaLiteral = Query(..., description="troncal o electiva"),
    usuario_id: int | None = Query(
        None,
        description=(
            "ID de usuario. Si se omite, los nodos quedan en estado 'libre' "
            "(modo público)."
        ),
    ),
) -> GrafoResponse:
    """Grafo de materias para una pestaña.

    Devuelve nodos (con estado calculado para el usuario) y edges
    (correlativas). El frontend usa este shape para pintar el árbol.
    """
    return materia_service.construir_grafo(db, tipo=tipo, usuario_id=usuario_id)


@router.get("/{codigo}", response_model=MateriaOut)
def get_materia(
    codigo: str,
    db: Annotated[Session, Depends(get_db)],
) -> MateriaOut:
    """Detalle de una materia por su código natural."""
    materia = materia_service.get_materia(db, codigo)
    if materia is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Materia '{codigo}' no encontrada.",
        )
    return MateriaOut.model_validate(materia)


@router.get(
    "/{codigo}/puede-cursar/{usuario_id}",
    response_model=ValidacionCorrelativas,
)
def puede_cursar(
    codigo: str,
    usuario_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> ValidacionCorrelativas:
    """¿El usuario cumple las correlativas para CURSAR esta materia?"""
    return correlatividad_service.puede_cursar(db, usuario_id, codigo)


@router.get(
    "/{codigo}/puede-rendir/{usuario_id}",
    response_model=ValidacionCorrelativas,
)
def puede_rendir(
    codigo: str,
    usuario_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> ValidacionCorrelativas:
    """¿El usuario cumple las correlativas para RENDIR el final?

    Aplica la regla especial de Proyecto Final (todas las troncales aprobadas).
    """
    return correlatividad_service.puede_rendir(db, usuario_id, codigo)
