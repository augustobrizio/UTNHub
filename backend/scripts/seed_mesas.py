"""Seed idempotente de las mesas de examen (día y hora por materia).

Uso:
    docker compose exec app uv run python -m scripts.seed_mesas

Hace UPSERT por ``materia_codigo`` en ``mesa_materia``. Correrlo de nuevo no
duplica filas.

**No pisa lo que cargó un admin.** Las filas con ``origen='admin'`` se saltean:
si alguien corrigió una mesa desde el panel es porque la planilla estaba
desactualizada, y volver a correr el seed no puede deshacerlo. Con ``--forzar``
se reescriben igual.

Antes de escribir compara el nombre de la planilla contra el del plan y avisa
las diferencias — las cuatro conocidas están documentadas en
``app/db/seed/mesas_isi.py``. Una quinta diferencia probablemente signifique
que cambió el plan.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models.academico import MesaMateria
from app.db.seed.mesas_isi import MESAS, MesaSpec
from app.db.session import SessionLocal
from app.repositories import materia_repo

#: Nombres que la planilla escribe distinto del plan 2023 y que ya revisamos.
#: Si aparece una diferencia fuera de esta lista, el seed la reporta.
DIFERENCIAS_CONOCIDAS: frozenset[str] = frozenset({"7", "13", "19", "E13"})


def _hora(spec: MesaSpec):
    return datetime.strptime(spec["hora"], "%H:%M").time()


def _revisar_nombres(db: Session, specs: list[MesaSpec]) -> list[str]:
    """Diferencias entre el título de la planilla y el nombre del plan."""
    avisos: list[str] = []
    for spec in specs:
        materia = materia_repo.get_by_codigo(db, spec["codigo"])
        if materia is None:
            avisos.append(f"{spec['codigo']}: no está en el plan (¿seed de materias?)")
        elif materia.nombre != spec["nombre_fuente"]:
            marca = "" if spec["codigo"] in DIFERENCIAS_CONOCIDAS else "  <-- NUEVA"
            avisos.append(
                f"{spec['codigo']}: planilla '{spec['nombre_fuente']}' / "
                f"plan '{materia.nombre}'{marca}"
            )
    return avisos


def seed(*, forzar: bool = False) -> dict[str, object]:
    """Aplica el seed. Devuelve contadores y avisos para logging."""
    with SessionLocal() as db:
        avisos = _revisar_nombres(db, MESAS)

        escritas = 0
        respetadas: list[str] = []
        for spec in MESAS:
            if materia_repo.get_by_codigo(db, spec["codigo"]) is None:
                continue  # ya quedó reportado en los avisos
            actual = materia_repo.get_mesa(db, spec["codigo"])
            if actual is not None and actual.origen == "admin" and not forzar:
                respetadas.append(spec["codigo"])
                continue
            materia_repo.upsert_mesa(
                db,
                materia_codigo=spec["codigo"],
                dia_semana=spec["dia"],
                hora=_hora(spec),
                nota=actual.nota if actual is not None else None,
                origen="seed",
                usuario_id=None,
            )
            escritas += 1
        db.commit()

        total = db.query(MesaMateria).count()

    return {
        "specs": len(MESAS),
        "escritas": escritas,
        "respetadas": respetadas,
        "mesas_en_db": total,
        "avisos": avisos,
    }


def _main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Seed de mesas de examen ISI.")
    parser.add_argument(
        "--forzar",
        action="store_true",
        help="Reescribe también las mesas corregidas por un admin.",
    )
    args = parser.parse_args(argv)

    counts = seed(forzar=args.forzar)
    print("OK seed mesas ISI:")
    print(f"  specs en la planilla: {counts['specs']}")
    print(f"  escritas: {counts['escritas']}")
    print(f"  mesas en DB: {counts['mesas_en_db']}")
    respetadas = counts["respetadas"]
    if respetadas:
        print(f"  respetadas (origen=admin): {', '.join(respetadas)}")
    for aviso in counts["avisos"]:
        print(f"  aviso: {aviso}")
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
