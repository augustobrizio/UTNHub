"""reclasifica los exámenes institucionales (origen sistema) como 'mesa'

Las mesas de examen pasan a ser su propia categoría. El tipo 'examen' queda
reservado para los exámenes que el alumno declara que va a rendir.

Revision ID: c1d2e3f4a5b6
Revises: b8f4d1a6c2e9
Create Date: 2026-06-21

"""
from __future__ import annotations

from alembic import op

revision = "c1d2e3f4a5b6"
down_revision = "b8f4d1a6c2e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE evento_calendario SET tipo = 'mesa' "
        "WHERE tipo = 'examen' AND origen = 'sistema'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE evento_calendario SET tipo = 'examen' "
        "WHERE tipo = 'mesa' AND origen = 'sistema'"
    )
