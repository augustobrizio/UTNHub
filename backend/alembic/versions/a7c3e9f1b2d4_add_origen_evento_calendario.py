"""add origen a evento_calendario

Revision ID: a7c3e9f1b2d4
Revises: e1f2a3b4c5d6
Create Date: 2026-06-21

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a7c3e9f1b2d4"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "evento_calendario",
        sa.Column("origen", sa.Text(), nullable=False, server_default="sistema"),
    )
    op.create_index(
        "ix_evento_calendario_origen", "evento_calendario", ["origen"]
    )


def downgrade() -> None:
    op.drop_index("ix_evento_calendario_origen", table_name="evento_calendario")
    op.drop_column("evento_calendario", "origen")
