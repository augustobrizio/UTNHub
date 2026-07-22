"""add profesor_id to cursada

Revision ID: b2c3d4e5f6a7
Revises: b3e8f1c2a9d7
Create Date: 2026-07-13

Nota: originalmente forkeaba de c1d2e3f4a5b6, igual que la cadena de novedades
(e7c3f1a9b204 → a1f7c2d3e4b5 → b3e8f1c2a9d7). Al mergear novedades quedaban dos
heads; se reencadena esta migración sobre b3e8f1c2a9d7 para tener un head lineal.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str = "b3e8f1c2a9d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Vinculo resuelto cursada -> profesor. Nullable (el docente no siempre
    # resuelve) y ON DELETE SET NULL (borrar un profesor no borra la cursada).
    op.add_column(
        "cursada",
        sa.Column(
            "profesor_id",
            sa.Integer(),
            sa.ForeignKey("profesor.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_cursada_profesor_id", "cursada", ["profesor_id"])


def downgrade() -> None:
    op.drop_index("ix_cursada_profesor_id", table_name="cursada")
    op.drop_column("cursada", "profesor_id")
