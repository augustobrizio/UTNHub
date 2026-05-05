"""Orquesta la construcción de respuestas del dominio académico.

Esto incluye armar el grafo (nodos + edges + contadores) que consume el
frontend para pintar el árbol de materias. La validación de
correlatividades concretas vive en ``correlatividad_service``.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.academico import (
    CondicionMateria,
    Materia,
    TipoMateria,
)
from app.repositories import materia_repo
from app.schemas.materia import (
    ContadoresGrafo,
    CorrelativaEdge,
    GrafoResponse,
    MateriaNodo,
    TipoCorrelativaLiteral,
    TipoMateriaLiteral,
)
from app.services.correlatividad_service import calcular_estado


def listar_materias(db: Session, *, tipo: str | None = None):
    """Lista plana de materias (para listados sin grafo)."""
    return materia_repo.list_materias(db, tipo=tipo)


def get_materia(db: Session, codigo: str) -> Materia | None:
    return materia_repo.get_by_codigo(db, codigo)


def construir_grafo(
    db: Session,
    *,
    tipo: TipoMateriaLiteral,
    usuario_id: int | None = None,
) -> GrafoResponse:
    """Construye la respuesta del grafo para una pestaña (troncal o electiva).

    Si ``usuario_id`` es None, todos los nodos quedan en estado "libre" y
    los contadores reflejan al usuario anónimo. La firma soporta usuario
    opcional para mostrar la grilla pública sin login.
    """
    materias = materia_repo.list_materias(db, tipo=tipo)
    codigos = [m.codigo for m in materias]

    correlativas = materia_repo.correlativas_de(db, codigos)

    condiciones = (
        materia_repo.condiciones_usuario(db, usuario_id)
        if usuario_id is not None
        else {}
    )
    notas = (
        materia_repo.notas_usuario(db, usuario_id)
        if usuario_id is not None
        else {}
    )

    # Indexar correlativas por materia destino para no recalcular en el loop.
    correlativas_por_materia: dict[str, list] = {}
    for corr in correlativas:
        correlativas_por_materia.setdefault(corr.materia_codigo, []).append(corr)

    nodos: list[MateriaNodo] = []
    contadores = {"aprobado": 0, "regular": 0, "cursando": 0, "cursable": 0, "libre": 0}

    for materia in materias:
        actual = condiciones.get(materia.codigo, CondicionMateria.NONE)
        estado = calcular_estado(
            materia=materia,
            condicion_actual=actual,
            correlativas=correlativas_por_materia.get(materia.codigo, []),
            condiciones_por_codigo=condiciones,
        )
        contadores[estado] += 1
        nodos.append(
            MateriaNodo(
                codigo=materia.codigo,
                nombre=materia.nombre,
                anio_carrera=materia.anio_carrera,
                cuatrimestre=materia.cuatrimestre,
                horas=materia.horas,
                tipo=materia.tipo,  # type: ignore[arg-type]
                estado=estado,
                nota=notas.get(materia.codigo),
            )
        )

    edges = [
        CorrelativaEdge(
            desde=corr.materia_requerida,
            hacia=corr.materia_codigo,
            tipo=_normalizar_tipo_correlativa(corr.tipo),
        )
        for corr in correlativas
        if _normalizar_tipo_correlativa(corr.tipo) is not None
    ]

    total = len(materias)
    porcentaje = round(contadores["aprobado"] / total * 100, 1) if total else 0.0
    contadores_grafo = ContadoresGrafo(
        aprobadas=contadores["aprobado"],
        regulares=contadores["regular"],
        cursando=contadores["cursando"],
        cursables=contadores["cursable"],
        libres=contadores["libre"],
        total=total,
        porcentaje_aprobadas=porcentaje,
    )

    return GrafoResponse(
        tipo=tipo,
        nodos=nodos,
        edges=edges,
        contadores=contadores_grafo,
    )


def _normalizar_tipo_correlativa(tipo: str | None) -> TipoCorrelativaLiteral | None:
    """Filtra valores no esperados para no romper el schema de la edge."""
    if tipo in ("regular", "aprobada"):
        return tipo  # type: ignore[return-value]
    return None


__all__ = [
    "TipoMateria",
    "construir_grafo",
    "get_materia",
    "listar_materias",
]
