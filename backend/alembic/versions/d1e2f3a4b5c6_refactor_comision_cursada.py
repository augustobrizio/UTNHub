"""refactor comision → cursada, nueva tabla comision real

Revision ID: d1e2f3a4b5c6
Revises: f3a2b1c9d8e7
Create Date: 2026-06-19
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: str = "f3a2b1c9d8e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. La vieja tabla comision pasa a llamarse cursada
    op.rename_table("comision", "cursada")

    # 2. Nueva tabla comision: representa la comisión real (ej. "1K01")
    op.create_table(
        "comision",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.Text(), nullable=True),
        sa.Column("anio", sa.Integer(), nullable=True),
    )

    # 3. cursada necesita FK a comision
    op.add_column("cursada", sa.Column("comision_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_cursada_comision", "cursada", "comision", ["comision_id"], ["id"]
    )

    # 4. Renombrar horario.comision_id → horario.cursada_id
    op.alter_column("horario", "comision_id", new_column_name="cursada_id")

    # 5. cursada ya no necesita nombre ni anio (ahora viven en comision)
    op.drop_column("cursada", "nombre")
    op.drop_column("cursada", "anio")


def downgrade() -> None:
    op.add_column("cursada", sa.Column("nombre", sa.Text(), nullable=True))
    op.add_column("cursada", sa.Column("anio", sa.Integer(), nullable=True))

    op.drop_column("cursada", "comision_id")
    op.drop_constraint("fk_cursada_comision", "cursada", type_="foreignkey")

    op.alter_column("horario", "cursada_id", new_column_name="comision_id")

    op.drop_table("comision")

    op.rename_table("cursada", "comision")
