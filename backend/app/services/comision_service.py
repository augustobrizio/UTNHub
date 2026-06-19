"""Lógica de negocio para comisiones y el builder de horarios."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.academico import CondicionMateria, Cursada, Materia, UsuarioMateria
from app.repositories import comision_repo, materia_repo
from app.schemas.comision import (
    ComisionCursadaOut,
    HorarioOut,
    MateriaCursableOut,
)
from app.services import correlatividad_service


def materias_cursables_con_comisiones(
    db: Session,
    usuario_id: int,
    anio: int,
    cuatrimestre: int,
) -> list[MateriaCursableOut]:
    """Devuelve las materias que el usuario puede cursar junto con sus comisiones
    disponibles para el año y cuatrimestre indicados.

    Incluye materias en estado 'cursable' y también las que ya están 'cursando'
    (por si el usuario quiere cambiar de comisión).
    """
    todas_las_materias = materia_repo.list_materias(db)
    condiciones = materia_repo.condiciones_usuario(db, usuario_id)

    # Determinar qué materias son cursables o cursando
    codigos_objetivo: list[str] = []
    for materia in todas_las_materias:
        condicion = condiciones.get(materia.codigo, CondicionMateria.NONE)
        # Excluir las ya terminadas
        if condicion in (CondicionMateria.APROBADO, CondicionMateria.REGULAR):
            continue
        correlativas = materia_repo.correlativas_de_materia(db, materia.codigo)
        from app.services.correlatividad_service import calcular_estado
        estado = calcular_estado(materia, condicion, correlativas, condiciones)
        if estado in ("cursable", "cursando"):
            codigos_objetivo.append(materia.codigo)

    if not codigos_objetivo:
        return []

    cursadas = comision_repo.cursadas_para_materias(
        db, codigos=codigos_objetivo, anio=anio, cuatrimestre=cuatrimestre
    )

    # Agrupar por materia
    por_materia: dict[str, tuple[Materia, list[Cursada]]] = {}
    for cursada in cursadas:
        codigo = cursada.materia_codigo
        if codigo not in por_materia:
            por_materia[codigo] = (cursada.materia, [])
        por_materia[codigo][1].append(cursada)

    resultado: list[MateriaCursableOut] = []
    for codigo in codigos_objetivo:
        if codigo not in por_materia:
            continue
        materia, lista_cursadas = por_materia[codigo]
        comisiones_out = [
            ComisionCursadaOut(
                comision_id=c.comision.id,
                comision_nombre=c.comision.nombre,
                cursada_id=c.id,
                docente=c.docente,
                horarios=[
                    HorarioOut(
                        dia=h.dia,
                        hora_inicio=h.hora_inicio,
                        hora_fin=h.hora_fin,
                        aula=h.aula,
                    )
                    for h in sorted(c.horarios, key=lambda h: (h.dia or "", h.hora_inicio or ""))
                ],
            )
            for c in lista_cursadas
        ]
        resultado.append(
            MateriaCursableOut(
                materia_codigo=codigo,
                materia_nombre=materia.nombre,
                anio_carrera=materia.anio_carrera,
                comisiones=comisiones_out,
            )
        )

    resultado.sort(key=lambda m: (m.anio_carrera or 99, m.materia_codigo))
    return resultado


def seleccionar_cursada(
    db: Session,
    usuario_id: int,
    materia_codigo: str,
    cursada_id: int,
) -> UsuarioMateria:
    """Asigna una cursada específica al registro usuario_materia.

    Si no existe el registro, lo crea con condicion='cursando'.
    """
    cursada = comision_repo.get_cursada(db, cursada_id)
    if cursada is None:
        raise ValueError(f"Cursada {cursada_id} no encontrada.")
    if cursada.materia_codigo != materia_codigo:
        raise ValueError(
            f"La cursada {cursada_id} no corresponde a la materia '{materia_codigo}'."
        )

    registro = comision_repo.get_cursada_usuario(db, usuario_id, materia_codigo)
    if registro is None:
        registro = UsuarioMateria(
            usuario_id=usuario_id,
            materia_codigo=materia_codigo,
            condicion=CondicionMateria.CURSANDO,
            cursada_id=cursada_id,
        )
        db.add(registro)
    else:
        registro.cursada_id = cursada_id
        if registro.condicion == CondicionMateria.NONE:
            registro.condicion = CondicionMateria.CURSANDO

    return registro


def deseleccionar_cursada(
    db: Session, usuario_id: int, materia_codigo: str
) -> bool:
    """Quita la cursada seleccionada sin borrar el registro usuario_materia."""
    registro = comision_repo.get_cursada_usuario(db, usuario_id, materia_codigo)
    if registro is None or registro.cursada_id is None:
        return False
    registro.cursada_id = None
    return True
