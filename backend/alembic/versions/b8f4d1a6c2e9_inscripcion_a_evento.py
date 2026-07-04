"""convierte eventos tipo 'inscripcion' en 'evento'

El tipo 'inscripcion' se elimina del taxonomy del calendario; las inscripciones
pasan a ser eventos institucionales. (El nuevo tipo 'trabajo_practico' lo crean
los alumnos, no requiere migración de datos.)

Revision ID: b8f4d1a6c2e9
Revises: a7c3e9f1b2d4
Create Date: 2026-06-21

"""
from __future__ import annotations

from alembic import op

revision = "b8f4d1a6c2e9"
down_revision = "a7c3e9f1b2d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE evento_calendario SET tipo = 'evento' WHERE tipo = 'inscripcion'")


def downgrade() -> None:
    # No se puede distinguir cuáles eran inscripciones originalmente; no-op.
    pass
