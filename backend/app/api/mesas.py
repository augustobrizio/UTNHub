"""Endpoints REST de las mesas de examen.

Público de lectura, como el calendario y los horarios: qué se rinde cada día no
es información personal. La edición pide admin.

Capa de presentación: todo pasa por ``services.mesa_service``.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import requerir_admin
from app.db.session import get_db
from app.schemas.materia import TipoMateriaLiteral
from app.schemas.mesa import (
    DiaMesaConAvisoOut,
    DiaMesaLiteral,
    MesaMateriaIn,
    MesaMateriaOut,
    MesasSemanaOut,
)
from app.services import mesa_service

router = APIRouter(prefix="/mesas", tags=["mesas"])


@router.get("", response_model=MesasSemanaOut, summary="Qué se rinde cada día")
def semana_de_mesas(
    db: Annotated[Session, Depends(get_db)],
    tipo: TipoMateriaLiteral | None = Query(
        None, description="Filtrar por troncal o electiva"
    ),
    anio: int | None = Query(None, ge=1, le=5, description="Año de la carrera"),
) -> MesasSemanaOut:
    """Los cinco días con sus materias, más el aviso de confirmar con la cátedra."""
    return mesa_service.semana_de_mesas(db, tipo=tipo, anio=anio)


@router.get(
    "/dia/{dia}",
    response_model=DiaMesaConAvisoOut,
    summary="Materias que se rinden un día de la semana",
)
def mesas_del_dia(
    dia: DiaMesaLiteral,
    db: Annotated[Session, Depends(get_db)],
) -> DiaMesaConAvisoOut:
    """Lo que consulta el panel cuando la semana cae en mesa."""
    mesas = mesa_service.mesas_del_dia(db, dia)
    return DiaMesaConAvisoOut(
        dia_semana=dia,
        materias=[MesaMateriaOut.desde_modelo(m) for m in mesas],
    )


@router.get(
    "/{materia_codigo}",
    response_model=MesaMateriaOut,
    summary="Mesa de una materia",
)
def get_mesa(
    materia_codigo: str,
    db: Annotated[Session, Depends(get_db)],
) -> MesaMateriaOut:
    mesa = mesa_service.get_mesa(db, materia_codigo)
    if mesa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La materia '{materia_codigo}' no tiene mesa cargada.",
        )
    return MesaMateriaOut.desde_modelo(mesa)


@router.put(
    "/{materia_codigo}",
    response_model=MesaMateriaOut,
    summary="Fijar el día y la hora de una materia (admin)",
)
def definir_mesa(
    materia_codigo: str,
    payload: MesaMateriaIn,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[object, Depends(requerir_admin)],
) -> MesaMateriaOut:
    """Carga o corrige la mesa de una materia. Pisa la que hubiera."""
    try:
        mesa = mesa_service.definir_mesa(
            db,
            materia_codigo=materia_codigo,
            dia_semana=payload.dia_semana,
            hora=payload.hora,
            nota=payload.nota,
            usuario_id=getattr(admin, "id", None),
        )
    except mesa_service.MateriaInexistente as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    db.commit()
    db.refresh(mesa)
    return MesaMateriaOut.desde_modelo(mesa)


@router.delete(
    "/{materia_codigo}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sacar la mesa de una materia (admin)",
)
def borrar_mesa(
    materia_codigo: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[object, Depends(requerir_admin)],
) -> None:
    """La materia queda sin día cargado y pasa a la lista de pendientes."""
    if not mesa_service.borrar_mesa(db, materia_codigo):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La materia '{materia_codigo}' no tiene mesa cargada.",
        )
    db.commit()
