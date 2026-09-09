"""Tool: qué materias se rinden en la mesa de cada día de la semana.

La mesa de FRRO reparte las materias por día: preguntas como "¿qué se rinde el
lunes?" o "¿qué día rindo Bases de Datos?" se contestan con esta tabla, no con
el calendario —que sabe qué semana hay mesa, no qué se rinde adentro—.

La respuesta **siempre** arrastra el aviso de confirmar con la cátedra: es un
dato de referencia y el alumno decide si viajar a rendir con eso (RNF-12).
"""
from __future__ import annotations

from langchain_core.tools import tool
from sqlalchemy.orm import Session

from app.agent.tools._comun import buscar_materia
from app.core.plan import DIAS_MESA
from app.schemas.mesa import AVISO_MESAS
from app.services import mesa_service


def _hhmm(mesa) -> str:
    return mesa.hora.strftime("%H:%M") if mesa.hora else "horario a confirmar"


def crear_mesas_examen(db: Session):
    """Devuelve la tool `mesas_de_examen` atada a esta sesión."""

    @tool
    def mesas_de_examen(dia: str = "", materia: str = "") -> str:
        """Día y horario en que se rinde el final de las materias de ISI.

        En FRRO la mesa reparte las materias por día de la semana: el lunes se
        rinde Análisis Matemático I, el jueves Simulación. Usar cuando
        pregunten qué se rinde un día, qué día o a qué hora se rinde una
        materia, o cómo es la semana de mesas. Para saber **qué semanas del
        año** hay mesa, usar `proximos_eventos`.

        Args:
            dia: día de la semana (ej. "lunes"). Vacío para no filtrar.
            materia: nombre o código de una materia. Vacío para no filtrar.
        """
        if materia.strip():
            m = buscar_materia(db, materia)
            if m is None:
                return f"No encontré ninguna materia parecida a '{materia}' en el plan."
            mesa = mesa_service.get_mesa(db, m.codigo)
            if mesa is None:
                return (
                    f"{m.nombre} todavía no tiene día de mesa cargado en UTNHub. "
                    "Conviene consultarlo en el Departamento de Sistemas o con la "
                    "cátedra."
                )
            return (
                f"{m.nombre} se rinde los {mesa.dia_semana} a las {_hhmm(mesa)}."
                + (f" Nota: {mesa.nota}." if mesa.nota else "")
                + f"\n\n{AVISO_MESAS}"
            )

        if dia.strip():
            try:
                mesas = mesa_service.mesas_del_dia(db, dia)
            except mesa_service.DiaInvalido:
                return (
                    f"'{dia}' no es un día de mesa. Se toma mesa "
                    f"{', '.join(DIAS_MESA)}."
                )
            if not mesas:
                return f"No tengo materias cargadas para la mesa del {dia.lower()}."
            listado = "\n".join(
                f"- {m.materia.nombre} ({_hhmm(m)})" for m in mesas
            )
            return (
                f"Materias que se rinden los {dia.lower()} "
                f"({len(mesas)}):\n{listado}\n\n{AVISO_MESAS}"
            )

        # Sin filtro: el resumen de la semana, para no volcar las 53 materias.
        semana = mesa_service.semana_de_mesas(db)
        resumen = "\n".join(
            f"- {d.dia_semana}: {d.total} materias" for d in semana.dias
        )
        return (
            f"Así se reparte la semana de mesas:\n{resumen}\n\n"
            f"Preguntame por un día o por una materia para el detalle."
            f"\n\n{AVISO_MESAS}"
        )

    return mesas_de_examen
