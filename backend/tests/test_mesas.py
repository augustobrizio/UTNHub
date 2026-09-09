"""Mesas de examen: qué materias se rinden cada día de la semana.

La regla del dominio es que la mesa reparte las materias por **día de la
semana** y no por fecha. Lo que se fija acá es esa regla y sus bordes: el orden
en que se muestra la semana, qué pasa con las materias que todavía no tienen
día, y que sólo un admin pueda tocarlas.

El plan de juguete de ``conftest`` alcanza: seis materias son suficientes para
que cada caso quede cubierto sin arrastrar las 56 del plan real.
"""
from __future__ import annotations

import os
import sys
from datetime import time
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import mesas as mesas_api  # noqa: E402
from app.api.deps import get_current_user  # noqa: E402
from app.core.plan import DIAS_MESA  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.services import mesa_service  # noqa: E402
from tests.conftest import AM1, AM2, ALGEBRA, ELECTIVA  # noqa: E402


def _cargar(db: Session, codigo: str, dia: str, hora: time | None = None) -> None:
    mesa_service.definir_mesa(
        db, materia_codigo=codigo, dia_semana=dia, hora=hora, usuario_id=None
    )
    db.commit()


# ---------------------------------------------------------------------------
# La semana
# ---------------------------------------------------------------------------
def test_la_semana_trae_los_cinco_dias_aunque_esten_vacios(db: Session) -> None:
    """Un día que no aparece se lee como error de carga, no como 'no se rinde'."""
    _cargar(db, AM1, "lunes", time(15, 0))

    semana = mesa_service.semana_de_mesas(db)

    assert [d.dia_semana for d in semana.dias] == list(DIAS_MESA)
    assert semana.dias[0].total == 1
    assert all(d.total == 0 for d in semana.dias[1:])


def test_las_materias_de_un_dia_salen_ordenadas_por_hora(db: Session) -> None:
    """El alumno lee la mesa como una agenda: primero lo que se rinde antes."""
    _cargar(db, AM1, "lunes", time(15, 0))
    _cargar(db, ALGEBRA, "lunes", time(9, 0))
    _cargar(db, AM2, "lunes", time(17, 30))

    lunes = mesa_service.semana_de_mesas(db).dias[0]

    assert [m.materia_codigo for m in lunes.materias] == [ALGEBRA, AM1, AM2]


def test_los_dias_se_ordenan_como_la_semana_y_no_alfabeticamente(db: Session) -> None:
    """Alfabéticamente 'jueves' iría antes que 'lunes'; se muestra una semana."""
    _cargar(db, AM1, "jueves", time(9, 0))
    _cargar(db, ALGEBRA, "lunes", time(9, 0))

    dias_con_materias = [
        d.dia_semana for d in mesa_service.semana_de_mesas(db).dias if d.total
    ]

    assert dias_con_materias == ["lunes", "jueves"]


def test_las_materias_sin_dia_cargado_se_listan_aparte(db: Session) -> None:
    """Faltar el dato no es lo mismo que no rendirse: tiene que verse."""
    _cargar(db, AM1, "lunes", time(15, 0))

    semana = mesa_service.semana_de_mesas(db)

    assert "Análisis Matemático I" not in semana.sin_asignar
    assert "Álgebra y Geometría Analítica" in semana.sin_asignar


def test_la_semana_avisa_que_hay_que_confirmar_con_la_catedra(db: Session) -> None:
    """El aviso viaja en la respuesta, no sólo en el HTML: el chatbot lo usa."""
    semana = mesa_service.semana_de_mesas(db)

    assert "cátedra" in semana.aviso


def test_se_puede_filtrar_la_semana_por_tipo_de_materia(db: Session) -> None:
    _cargar(db, AM1, "lunes", time(15, 0))
    _cargar(db, ELECTIVA, "lunes", time(16, 0))

    semana = mesa_service.semana_de_mesas(db, tipo="electiva")

    assert [m.materia_codigo for m in semana.dias[0].materias] == [ELECTIVA]


# ---------------------------------------------------------------------------
# Un día suelto
# ---------------------------------------------------------------------------
def test_mesas_del_dia_devuelve_solo_ese_dia(db: Session) -> None:
    _cargar(db, AM1, "lunes", time(15, 0))
    _cargar(db, ALGEBRA, "martes", time(9, 0))

    del_lunes = mesa_service.mesas_del_dia(db, "lunes")

    assert [m.materia_codigo for m in del_lunes] == [AM1]


def test_un_dia_sin_mesa_no_es_un_dia_valido(db: Session) -> None:
    """En FRRO no se toma mesa el sábado: pedirlo es un error, no una lista vacía."""
    with pytest.raises(mesa_service.DiaInvalido):
        mesa_service.mesas_del_dia(db, "sabado")


def test_el_dia_se_normaliza_antes_de_validarlo(db: Session) -> None:
    """El chatbot manda lo que escribió el alumno: 'Lunes ' tiene que entrar."""
    _cargar(db, AM1, "lunes", time(15, 0))

    assert len(mesa_service.mesas_del_dia(db, "  Lunes ")) == 1


# ---------------------------------------------------------------------------
# Edición
# ---------------------------------------------------------------------------
def test_cargar_dos_veces_la_misma_materia_la_pisa_y_no_la_duplica(db: Session) -> None:
    """Corregir una mesa es corregirla, no agregar una segunda."""
    _cargar(db, AM1, "lunes", time(15, 0))
    _cargar(db, AM1, "jueves", time(9, 0))

    semana = mesa_service.semana_de_mesas(db)
    todas = [m for d in semana.dias for m in d.materias]

    assert len(todas) == 1
    assert todas[0].dia_semana == "jueves"
    assert todas[0].hora == time(9, 0)


def test_no_se_puede_cargar_una_mesa_de_una_materia_que_no_existe(db: Session) -> None:
    """Una fila contra un código inventado no la sabe mostrar ninguna vista."""
    with pytest.raises(mesa_service.MateriaInexistente):
        mesa_service.definir_mesa(
            db, materia_codigo="NOEXISTE", dia_semana="lunes", hora=None
        )


def test_no_se_puede_cargar_una_mesa_un_dia_que_no_es_de_mesa(db: Session) -> None:
    with pytest.raises(mesa_service.DiaInvalido):
        mesa_service.definir_mesa(db, materia_codigo=AM1, dia_semana="domingo", hora=None)


def test_la_mesa_puede_quedar_sin_hora(db: Session) -> None:
    """El día suele confirmarse antes que el horario."""
    _cargar(db, AM1, "lunes", None)

    assert mesa_service.get_mesa(db, AM1).hora is None


def test_borrar_devuelve_la_materia_a_las_pendientes(db: Session) -> None:
    _cargar(db, AM1, "lunes", time(15, 0))

    assert mesa_service.borrar_mesa(db, AM1) is True
    db.commit()
    assert "Análisis Matemático I" in mesa_service.semana_de_mesas(db).sin_asignar


def test_borrar_una_mesa_que_no_esta_avisa_en_vez_de_fallar(db: Session) -> None:
    assert mesa_service.borrar_mesa(db, AM1) is False


def test_la_edicion_del_admin_queda_marcada_con_su_origen(db: Session) -> None:
    """El seed respeta lo que corrigió una persona: para eso mira el origen."""
    mesa_service.definir_mesa(
        db, materia_codigo=AM1, dia_semana="lunes", hora=time(15, 0), usuario_id=7
    )
    db.commit()

    mesa = mesa_service.get_mesa(db, AM1)
    assert mesa.origen == "admin"
    assert mesa.usuario_id == 7


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
def _app(db: Session, *, rol: str | None) -> TestClient:
    """App mínima con el router de mesas y la sesión que se le indique."""
    app = FastAPI()
    app.include_router(mesas_api.router)
    app.dependency_overrides[get_db] = lambda: db
    if rol is not None:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
            id=1, rol=rol
        )
    return TestClient(app)


def test_la_semana_de_mesas_se_lee_sin_cuenta(db: Session) -> None:
    """Qué se rinde cada día no es información personal (como el calendario)."""
    _cargar(db, AM1, "lunes", time(15, 0))

    res = _app(db, rol=None).get("/mesas")

    assert res.status_code == 200
    assert res.json()["dias"][0]["materias"][0]["nombre"] == "Análisis Matemático I"


def test_un_alumno_no_puede_cambiar_la_mesa_de_una_materia(db: Session) -> None:
    res = _app(db, rol="alumno").put(
        f"/mesas/{AM1}", json={"dia_semana": "lunes", "hora": "15:00"}
    )

    assert res.status_code == 403
    assert mesa_service.get_mesa(db, AM1) is None


def test_el_admin_carga_dia_hora_y_nota(db: Session) -> None:
    res = _app(db, rol="admin").put(
        f"/mesas/{AM1}",
        json={
            "dia_semana": "lunes",
            "hora": "15:00",
            "nota": "Confirmado con la cátedra el 3/9.",
        },
    )

    assert res.status_code == 200
    mesa = mesa_service.get_mesa(db, AM1)
    assert (mesa.dia_semana, mesa.hora) == ("lunes", time(15, 0))
    assert mesa.nota == "Confirmado con la cátedra el 3/9."


def test_la_api_rechaza_un_dia_que_no_es_de_mesa(db: Session) -> None:
    res = _app(db, rol="admin").put(
        f"/mesas/{AM1}", json={"dia_semana": "sabado", "hora": "15:00"}
    )

    assert res.status_code == 422


def test_cargar_una_materia_inexistente_da_404(db: Session) -> None:
    res = _app(db, rol="admin").put(
        "/mesas/NOEXISTE", json={"dia_semana": "lunes", "hora": "15:00"}
    )

    assert res.status_code == 404


# ---------------------------------------------------------------------------
# La planilla del Departamento
# ---------------------------------------------------------------------------
#
# El seed no toca la DB acá: lo que se fija es que la planilla siga siendo
# consistente con el plan. Si alguien agrega una mesa con un código que no
# existe, o repite una materia, se ve al correr los tests y no en producción.


def test_la_planilla_no_repite_materias() -> None:
    from app.db.seed.mesas_isi import MESAS

    codigos = [m["codigo"] for m in MESAS]

    assert len(codigos) == len(set(codigos))


def test_todas_las_mesas_de_la_planilla_son_materias_del_plan() -> None:
    from app.db.seed.isi_2023 import ELECTIVAS, TRONCALES
    from app.db.seed.mesas_isi import MESAS

    del_plan = {m["codigo"] for m in TRONCALES + ELECTIVAS}

    assert {m["codigo"] for m in MESAS} <= del_plan


def test_todas_las_mesas_caen_en_un_dia_habil_y_con_hora_valida() -> None:
    from datetime import datetime

    from app.db.seed.mesas_isi import MESAS

    for mesa in MESAS:
        assert mesa["dia"] in DIAS_MESA, mesa
        datetime.strptime(mesa["hora"], "%H:%M")  # revienta si el formato cambió
