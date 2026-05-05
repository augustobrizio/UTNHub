"""Lógica de correlatividades.

Responsabilidades:
- Decidir si un usuario puede cursar una materia (RF-02).
- Decidir si un usuario puede rendir el final de una materia.
- Calcular el "estado visible" de cada materia para pintar el grafo
  (aprobado / regular / cursando / cursable / libre).

No accede a la DB directamente: pasa por ``materia_repo``.

Reglas (Plan ISI 2023):
- Para CURSAR una materia hay que cumplir cada correlativa según su tipo:
  ``tipo == "regular"`` → la correlativa está al menos regular o aprobada.
  ``tipo == "aprobada"`` → la correlativa está aprobada.
- Para RENDIR el final hay que tener TODAS las correlativas aprobadas
  (sin importar si la correlativa estaba marcada regular o aprobada).
- Caso especial Proyecto Final: para rendir necesita TODAS las troncales
  del plan aprobadas. Esto no se modela en la tabla ``correlatividad``;
  lo aplica este service.
"""
from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.db.models.academico import (
    CondicionMateria,
    Correlatividad,
    Materia,
    TipoCorrelativa,
    TipoMateria,
)
from app.repositories import materia_repo
from app.schemas.materia import (
    EstadoMateriaLiteral,
    FaltanteCorrelativa,
    ValidacionCorrelativas,
)

# Código de Proyecto Final en el plan ISI 2023 (ver seed).
PROYECTO_FINAL_CODIGO = "36"


# ---------------------------------------------------------------------------
# Helpers de comparación de condiciones
# ---------------------------------------------------------------------------
def _cumple_para_cursar(condicion: CondicionMateria, tipo_requerido: str) -> bool:
    """¿La condición actual cumple el requisito para cursar?"""
    if tipo_requerido == TipoCorrelativa.APROBADA:
        return condicion == CondicionMateria.APROBADO
    # tipo == "regular": basta con regular o aprobada
    return condicion in (CondicionMateria.REGULAR, CondicionMateria.APROBADO)


def _cumple_para_rendir(condicion: CondicionMateria) -> bool:
    """Para rendir, sólo aprobada cuenta."""
    return condicion == CondicionMateria.APROBADO


# ---------------------------------------------------------------------------
# API pública del service
# ---------------------------------------------------------------------------
def puede_cursar(
    db: Session, usuario_id: int, materia_codigo: str
) -> ValidacionCorrelativas:
    """¿El usuario cumple las correlativas para cursar esta materia?"""
    materia = materia_repo.get_by_codigo(db, materia_codigo)
    if materia is None:
        return ValidacionCorrelativas(
            materia_codigo=materia_codigo,
            accion="cursar",
            permitido=False,
            motivo="La materia no existe en el plan.",
        )

    correlativas = materia_repo.correlativas_de_materia(db, materia_codigo)
    condiciones = materia_repo.condiciones_usuario(db, usuario_id)

    faltantes: list[FaltanteCorrelativa] = []
    for corr in correlativas:
        actual = condiciones.get(corr.materia_requerida, CondicionMateria.NONE)
        if not _cumple_para_cursar(actual, corr.tipo or ""):
            faltantes.append(
                FaltanteCorrelativa(
                    materia_requerida=corr.materia_requerida,
                    nombre=corr.requerida.nombre if corr.requerida else "",
                    requiere=corr.tipo,  # type: ignore[arg-type]
                    tiene=actual,
                )
            )

    return ValidacionCorrelativas(
        materia_codigo=materia_codigo,
        accion="cursar",
        permitido=not faltantes,
        faltantes=faltantes,
    )


def puede_rendir(
    db: Session, usuario_id: int, materia_codigo: str
) -> ValidacionCorrelativas:
    """¿El usuario cumple las correlativas para rendir el final?

    - Caso general: TODAS las correlativas de la materia deben estar aprobadas.
    - Caso Proyecto Final: TODAS las troncales del plan deben estar aprobadas.
    """
    materia = materia_repo.get_by_codigo(db, materia_codigo)
    if materia is None:
        return ValidacionCorrelativas(
            materia_codigo=materia_codigo,
            accion="rendir",
            permitido=False,
            motivo="La materia no existe en el plan.",
        )

    condiciones = materia_repo.condiciones_usuario(db, usuario_id)

    if materia_codigo == PROYECTO_FINAL_CODIGO:
        return _validar_proyecto_final_para_rendir(db, condiciones)

    correlativas = materia_repo.correlativas_de_materia(db, materia_codigo)
    faltantes: list[FaltanteCorrelativa] = []
    for corr in correlativas:
        actual = condiciones.get(corr.materia_requerida, CondicionMateria.NONE)
        if not _cumple_para_rendir(actual):
            faltantes.append(
                FaltanteCorrelativa(
                    materia_requerida=corr.materia_requerida,
                    nombre=corr.requerida.nombre if corr.requerida else "",
                    requiere=TipoCorrelativa.APROBADA,  # type: ignore[arg-type]
                    tiene=actual,
                )
            )

    return ValidacionCorrelativas(
        materia_codigo=materia_codigo,
        accion="rendir",
        permitido=not faltantes,
        faltantes=faltantes,
    )


def _validar_proyecto_final_para_rendir(
    db: Session, condiciones: dict[str, CondicionMateria]
) -> ValidacionCorrelativas:
    """Regla especial: Proyecto Final exige todas las troncales aprobadas."""
    troncales = materia_repo.list_codigos_por_tipo(db, TipoMateria.TRONCAL)
    # Excluir el propio Proyecto Final del conjunto requerido.
    troncales.discard(PROYECTO_FINAL_CODIGO)

    faltantes_codigos = [
        codigo
        for codigo in troncales
        if not _cumple_para_rendir(
            condiciones.get(codigo, CondicionMateria.NONE)
        )
    ]

    if not faltantes_codigos:
        return ValidacionCorrelativas(
            materia_codigo=PROYECTO_FINAL_CODIGO,
            accion="rendir",
            permitido=True,
        )

    # Para devolver nombres legibles
    nombres = {
        m.codigo: m.nombre
        for m in materia_repo.list_materias(db)
        if m.codigo in faltantes_codigos
    }
    faltantes = [
        FaltanteCorrelativa(
            materia_requerida=codigo,
            nombre=nombres.get(codigo, ""),
            requiere=TipoCorrelativa.APROBADA,  # type: ignore[arg-type]
            tiene=condiciones.get(codigo, CondicionMateria.NONE),
        )
        for codigo in sorted(faltantes_codigos, key=_codigo_sort_key)
    ]
    return ValidacionCorrelativas(
        materia_codigo=PROYECTO_FINAL_CODIGO,
        accion="rendir",
        permitido=False,
        motivo="Para rendir Proyecto Final hay que tener todas las troncales aprobadas.",
        faltantes=faltantes,
    )


# ---------------------------------------------------------------------------
# Estado visible (para el grafo)
# ---------------------------------------------------------------------------
def calcular_estado(
    materia: Materia,
    condicion_actual: CondicionMateria,
    correlativas: Sequence[Correlatividad],
    condiciones_por_codigo: dict[str, CondicionMateria],
) -> EstadoMateriaLiteral:
    """Devuelve el estado visible de una materia para un usuario.

    Prioridad:
    1. ``aprobado`` si la condición actual es aprobado.
    2. ``regular`` si la condición actual es regular.
    3. ``cursando`` si la condición actual es cursando.
    4. ``cursable`` si todas las correlativas se cumplen para cursar.
    5. ``libre`` en cualquier otro caso (aún no se puede anotar).
    """
    if condicion_actual == CondicionMateria.APROBADO:
        return "aprobado"
    if condicion_actual == CondicionMateria.REGULAR:
        return "regular"
    if condicion_actual == CondicionMateria.CURSANDO:
        return "cursando"

    for corr in correlativas:
        actual = condiciones_por_codigo.get(
            corr.materia_requerida, CondicionMateria.NONE
        )
        if not _cumple_para_cursar(actual, corr.tipo or ""):
            return "libre"
    return "cursable"


def _codigo_sort_key(codigo: str) -> tuple[int, str]:
    """Orden natural: numéricos primero, después strings tipo ADUSI/E01."""
    try:
        return (0, f"{int(codigo):04d}")
    except ValueError:
        return (1, codigo)
