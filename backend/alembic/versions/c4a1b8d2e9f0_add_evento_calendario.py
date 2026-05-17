"""add evento calendario

Revision ID: c4a1b8d2e9f0
Revises: b8e5d2a17f3c
Create Date: 2026-05-16
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4a1b8d2e9f0"
down_revision: Union[str, Sequence[str], None] = "b8e5d2a17f3c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "evento_calendario",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("fecha_inicio", sa.DateTime(), nullable=False),
        sa.Column("fecha_fin", sa.DateTime(), nullable=True),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("carrera", sa.Text(), nullable=True),
        sa.Column("fuente_url", sa.Text(), nullable=True),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("content_hash", name="uq_evento_calendario_content_hash"),
    )
    op.create_index(
        op.f("ix_evento_calendario_fecha_inicio"),
        "evento_calendario",
        ["fecha_inicio"],
        unique=False,
    )
    op.create_index(
        op.f("ix_evento_calendario_tipo"),
        "evento_calendario",
        ["tipo"],
        unique=False,
    )
    op.create_index(
        op.f("ix_evento_calendario_carrera"),
        "evento_calendario",
        ["carrera"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_evento_calendario_carrera"), table_name="evento_calendario")
    op.drop_index(op.f("ix_evento_calendario_tipo"), table_name="evento_calendario")
    op.drop_index(
        op.f("ix_evento_calendario_fecha_inicio"), table_name="evento_calendario"
    )
    op.drop_table("evento_calendario")
