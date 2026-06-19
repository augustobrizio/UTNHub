"""add docente to comision

Revision ID: f3a2b1c9d8e7
Revises: c4a1b8d2e9f0
Create Date: 2026-06-19
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "f3a2b1c9d8e7"
down_revision: str = "c4a1b8d2e9f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("comision", sa.Column("docente", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("comision", "docente")
