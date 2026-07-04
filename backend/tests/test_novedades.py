from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import novedades as novedades_api  # noqa: E402
from app.db.models.novedad import IngestaLog, Novedad  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.repositories import novedad_repo  # noqa: E402
from app.schemas.novedad import ClasificacionNovedad  # noqa: E402
from app.ai import clasificador_novedades  # noqa: E402
from app.scrapers.novedades.base import NovedadCruda  # noqa: E402
from app.services import novedad_service  # noqa: E402


def _session() -> Session:
    engine = create_engine(
        "sqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Novedad.__table__.create(engine)
    IngestaLog.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    return SessionLocal()


class _FuenteFake:
    nombre = "instagram"

    def __init__(self, crudos: list[NovedadCruda]) -> None:
        self._crudos = crudos

    def fetch_recientes(self):
        return self._crudos


def _crudo(external_id: str, texto: str = "algo") -> NovedadCruda:
    return NovedadCruda(
        external_id=external_id,
        fuente="instagram",
        origen="@ceit",
        url="https://instagram.com/p/x/",
        texto=texto,
        fecha_publicacion=datetime(2026, 6, 1),
    )


def test_dedup_external_ids_existentes() -> None:
    db = _session()
    novedad_repo.crear_novedad(
        db,
        external_id="instagram_post:AAA",
        fuente="instagram",
        origen="@ceit",
        url=None,
        titulo="t",
        descripcion="d",
        categoria="aviso",
        imagen_url=None,
        imagen_path=None,
        estado="publicada",
        confianza=0.9,
        motivo_descarte=None,
        fecha_publicacion=None,
    )
    db.commit()

    existentes = novedad_repo.external_ids_existentes(
        db, ["instagram_post:AAA", "instagram_post:BBB"]
    )
    assert existentes == {"instagram_post:AAA"}


def test_pipeline_rutea_estados_y_registra_log(monkeypatch) -> None:
    db = _session()

    # El clasificador devuelve distinto según el external_id, sin llamar a OpenAI.
    def fake_clasificar(crudo: NovedadCruda):
        if crudo.external_id.endswith("ALTA"):
            clf = ClasificacionNovedad(
                es_novedad=True,
                categoria="aviso",
                titulo="Paro docente",
                descripcion="Hay paro el jueves.",
                confianza=0.95,
            )
        elif crudo.external_id.endswith("MEDIA"):
            clf = ClasificacionNovedad(
                es_novedad=True,
                categoria="evento",
                titulo="Charla",
                descripcion="Charla de algo.",
                confianza=0.5,
            )
        else:
            clf = ClasificacionNovedad(
                es_novedad=False,
                categoria="general",
                titulo="Meme",
                descripcion="-",
                confianza=0.9,
                motivo="No es informativo",
            )
        return clasificador_novedades.ResultadoClasificacion(clasificacion=clf, tokens=10)

    monkeypatch.setattr(clasificador_novedades, "clasificar", fake_clasificar)

    fuente = _FuenteFake(
        [_crudo("instagram_story:ALTA"), _crudo("instagram_story:MEDIA"), _crudo("instagram_story:NO")]
    )
    resultado = novedad_service.run_ingesta_novedades(db, [fuente])

    res = resultado.fuentes[0]
    assert res.items_vistos == 3
    assert res.items_nuevos == 3
    assert res.items_novedad == 2  # ALTA + MEDIA
    assert res.items_descartados == 1  # NO

    estados = {n.external_id: n.estado for n in novedad_repo.listar(db, estado=None)}
    assert estados["instagram_story:ALTA"] == "publicada"
    assert estados["instagram_story:MEDIA"] == "pendiente"
    assert estados["instagram_story:NO"] == "descartada"

    logs = db.query(IngestaLog).all()
    assert len(logs) == 1
    assert logs[0].tokens_usados == 30


def test_pipeline_es_idempotente(monkeypatch) -> None:
    db = _session()
    monkeypatch.setattr(
        clasificador_novedades,
        "clasificar",
        lambda crudo: clasificador_novedades.ResultadoClasificacion(
            clasificacion=ClasificacionNovedad(
                es_novedad=True,
                categoria="aviso",
                titulo="t",
                descripcion="d",
                confianza=0.99,
            ),
            tokens=5,
        ),
    )

    fuente = _FuenteFake([_crudo("instagram_post:DUP")])
    novedad_service.run_ingesta_novedades(db, [fuente])
    novedad_service.run_ingesta_novedades(db, [_FuenteFake([_crudo("instagram_post:DUP")])])

    assert len(novedad_repo.listar(db, estado=None)) == 1


def test_listar_api_solo_publicadas_por_defecto() -> None:
    db = _session()
    for eid, estado in (("a", "publicada"), ("b", "pendiente"), ("c", "descartada")):
        novedad_repo.crear_novedad(
            db,
            external_id=eid,
            fuente="instagram",
            origen="@ceit",
            url=None,
            titulo=eid,
            descripcion="d",
            categoria="aviso",
            imagen_url=None,
            imagen_path=None,
            estado=estado,
            confianza=0.9,
            motivo_descarte=None,
            fecha_publicacion=datetime(2026, 6, 1),
        )
    db.commit()

    app = FastAPI()
    app.include_router(novedades_api.router)
    app.dependency_overrides[get_db] = lambda: (yield db)
    client = TestClient(app)

    res = client.get("/novedades")
    assert res.status_code == 200
    titulos = [n["titulo"] for n in res.json()]
    assert titulos == ["a"]
