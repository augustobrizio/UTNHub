"""review_catedra (reseñas por profesor × materia, UTNTAC)

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-07-13
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: str = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_catedra",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("materia_codigo", sa.Text(), nullable=False),
        sa.Column("profesor_id", sa.Integer(), nullable=False),
        sa.Column("super_recomiendo", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("recomiendo", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("normal", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("evitaria", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("super_evitaria", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cantidad_respuestas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clasificacion", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["materia_codigo"], ["materia.codigo"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profesor_id"], ["profesor.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("materia_codigo", "profesor_id", name="uq_review_materia_profesor"),
    )
    op.create_index("ix_review_catedra_materia_codigo", "review_catedra", ["materia_codigo"])
    op.create_index("ix_review_catedra_profesor_id", "review_catedra", ["profesor_id"])


def downgrade() -> None:
    op.drop_index("ix_review_catedra_profesor_id", table_name="review_catedra")
    op.drop_index("ix_review_catedra_materia_codigo", table_name="review_catedra")
    op.drop_table("review_catedra")
