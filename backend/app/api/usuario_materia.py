"""Endpoints REST para gestionar el estado de las materias de un usuario.

Estos endpoints son los que el frontend del grafo va a usar para que el
usuario marque sus materias como aprobadas, cursando, etc.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import CorrelativasNoCumplidas, MateriaInexistente
from app.db.session import get_db
from app.schemas.materia import UsuarioMateriaIn, UsuarioMateriaOut
from app.services import inscripcion_service

router = APIRouter(
    prefix="/usuarios/{usuario_id}/materias",
    tags=["usuario_materia"],
)


@router.get("", response_model=list[UsuarioMateriaOut])
def listar_estado(
    usuario_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[UsuarioMateriaOut]:
    """Listado de materias con condición registrada para el usuario."""
    filas = inscripcion_service.listar_estado_usuario(db, usuario_id)
    return [
        UsuarioMateriaOut(
            materia_codigo=f.materia_codigo,
            nombre=f.materia.nombre if f.materia else None,
            condicion=f.condicion,
            nota=f.nota,
            anio_cursada=f.anio_cursada,
        )
        for f in filas
    ]


@router.put("/{codigo}", response_model=UsuarioMateriaOut)
def registrar_estado(
    usuario_id: int,
    codigo: str,
    payload: UsuarioMateriaIn,
    db: Annotated[Session, Depends(get_db)],
) -> UsuarioMateriaOut:
    """Crea o actualiza el estado del usuario sobre una materia.

    Devuelve 422 si la materia no existe, 409 si no se cumplen las
    correlativas para cursar/regular (a menos que ``forzar=true``).
    """
    try:
        fila = inscripcion_service.registrar_estado(
            db,
            usuario_id=usuario_id,
            materia_codigo=codigo,
            condicion=payload.condicion,
            nota=payload.nota,
            anio_cursada=payload.anio_cursada,
            forzar=payload.forzar,
        )
    except MateriaInexistente as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
    except CorrelativasNoCumplidas as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "correlativas_no_cumplidas",
                "mensaje": str(e),
                "materia_codigo": e.materia_codigo,
                "faltantes": e.faltantes,
            },
        )

    db.commit()
    return UsuarioMateriaOut(
        materia_codigo=fila.materia_codigo,
        nombre=fila.materia.nombre if fila.materia else None,
        condicion=fila.condicion,
        nota=fila.nota,
        anio_cursada=fila.anio_cursada,
    )


@router.delete("/{codigo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_estado(
    usuario_id: int,
    codigo: str,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Borra el registro de cursada del usuario sobre la materia.

    Devuelve 204 si se borró, 404 si no existía.
    """
    borrado = inscripcion_service.eliminar_estado(db, usuario_id, codigo)
    if not borrado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El usuario {usuario_id} no tiene registro para '{codigo}'.",
        )
    db.commit()
