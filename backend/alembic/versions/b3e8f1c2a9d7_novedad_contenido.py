"""novedad: campo contenido (cuerpo largo redactado por el LLM)

Revision ID: b3e8f1c2a9d7
Revises: a1f7c2d3e4b5
Create Date: 2026-07-05

``descripcion`` sigue siendo el resumen corto de la card. ``contenido`` es
un cuerpo mas largo, redactado combinando texto + imagen (flyers/stories),
para el detalle "ver mas" del frontend. Nullable: no todas las novedades lo
van a tener (ni las viejas, ni las que el LLM considera que no aportan mas
que el resumen).
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "b3e8f1c2a9d7"
down_revision: str | None = "a1f7c2d3e4b5"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    op.add_column("novedad", sa.Column("contenido", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("novedad", "contenido")
