"""Seed idempotente del plan ISI 2023.

Uso:
    docker compose exec app uv run python -m scripts.seed_isi_2023
o:
    docker compose exec app uv run python backend/scripts/seed_isi_2023.py

Hace UPSERT por ``codigo`` en ``materia`` y por la tripleta
``(materia_codigo, materia_requerida, tipo)`` en ``correlatividad``.
Correrlo varias veces no duplica filas.

No borra registros que ya estén en la base y no aparezcan en el seed
(por las dudas — si querés un seed "destructivo" pasale ``--reset``).
"""
from __future__ import annotations

import argparse
import sys
from collections.abc import Iterable

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models.academico import Correlatividad, Materia, TipoCorrelativa
from app.db.seed.isi_2023 import MateriaSpec, todas_las_materias
from app.db.session import SessionLocal
from app.repositories import materia_repo


def _aplicar_materias(db: Session, specs: Iterable[MateriaSpec]) -> None:
    """Inserta o actualiza cada materia (sin tocar correlativas)."""
    for spec in specs:
        materia_repo.upsert_materia(
            db,
            codigo=spec["codigo"],
            nombre=spec["nombre"],
            anio_carrera=spec.get("anio_carrera"),
            cuatrimestre=spec.get("cuatrimestre"),
            horas=spec.get("horas"),
            tipo=spec.get("tipo"),
        )
    db.flush()


def _aplicar_correlativas(db: Session, specs: Iterable[MateriaSpec]) -> None:
    """Inserta correlativas declaradas en cada spec (regulares y aprobadas)."""
    for spec in specs:
        for codigo_req in spec.get("regulares", []) or []:
            materia_repo.upsert_correlativa(
                db,
                materia_codigo=spec["codigo"],
                materia_requerida=codigo_req,
                tipo=TipoCorrelativa.REGULAR,
            )
        for codigo_req in spec.get("aprobadas", []) or []:
            materia_repo.upsert_correlativa(
                db,
                materia_codigo=spec["codigo"],
                materia_requerida=codigo_req,
                tipo=TipoCorrelativa.APROBADA,
            )
    db.flush()


def _reset_correlativas(db: Session, codigos: Iterable[str]) -> None:
    """Borra correlativas de las materias indicadas (sólo con --reset)."""
    db.execute(
        delete(Correlatividad).where(Correlatividad.materia_codigo.in_(list(codigos)))
    )
    db.flush()


def seed(*, reset: bool = False) -> dict[str, int]:
    """Aplica el seed. Devuelve contadores para logging."""
    specs = todas_las_materias()
    codigos = [s["codigo"] for s in specs]

    with SessionLocal() as db:
        if reset:
            _reset_correlativas(db, codigos)

        _aplicar_materias(db, specs)
        _aplicar_correlativas(db, specs)
        db.commit()

        materias_total = db.query(Materia).count()
        correl_total = db.query(Correlatividad).count()

    return {
        "specs_cargadas": len(specs),
        "materias_en_db": materias_total,
        "correlativas_en_db": correl_total,
    }


def _main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Seed del plan ISI 2023.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Borra y reescribe las correlativas de las materias del seed.",
    )
    args = parser.parse_args(argv)

    counts = seed(reset=args.reset)
    print(f"OK seed ISI 2023:")
    print(f"  specs cargadas: {counts['specs_cargadas']}")
    print(f"  materias en DB: {counts['materias_en_db']}")
    print(f"  correlativas en DB: {counts['correlativas_en_db']}")
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
