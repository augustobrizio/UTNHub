"""add profesor_id to cursada

Revision ID: b2c3d4e5f6a7
Revises: c1d2e3f4a5b6
Create Date: 2026-07-13
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str = "c1d2e3f4a5b6"
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
