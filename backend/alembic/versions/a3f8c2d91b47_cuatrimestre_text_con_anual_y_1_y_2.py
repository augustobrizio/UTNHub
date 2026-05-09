"""cuatrimestre TEXT con valores anual y 1 y 2

Revision ID: a3f8c2d91b47
Revises: 6ff16f5c4cea
Create Date: 2026-05-09

Cambia la columna cuatrimestre de INTEGER a TEXT para soportar los
valores 1, 2, anual y '1 y 2' (electivas que se dictan ambos cuatrimestres).
Tambien carga los valores correctos para todas las materias.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = 'a3f8c2d91b47'
down_revision: str | None = '6ff16f5c4cea'
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # Cambiar de INTEGER a TEXT
    op.alter_column(
        'materia',
        'cuatrimestre',
        existing_type=sa.Integer(),
        type_=sa.Text(),
        postgresql_using='cuatrimestre::TEXT',
        existing_nullable=True,
    )

    # Nulls -> 'anual'
    op.execute("UPDATE materia SET cuatrimestre = 'anual' WHERE cuatrimestre IS NULL")

    # Electivas con oferta en ambos cuatrimestres
    op.execute(
        "UPDATE materia SET cuatrimestre = '1 y 2' "
        "WHERE codigo IN ('E01','E02','E04','E06','E15','E17')"
    )

    # Electiva 1er cuatrimestre que no tenia valor
    op.execute("UPDATE materia SET cuatrimestre = '1' WHERE codigo = 'E14'")

    # Troncales 1er cuatrimestre
    op.execute(
        "UPDATE materia SET cuatrimestre = '1' "
        "WHERE codigo IN ('11','13','29','32','34')"
    )

    # Troncales 2do cuatrimestre
    op.execute(
        "UPDATE materia SET cuatrimestre = '2' "
        "WHERE codigo IN ('14','15','25','35')"
    )


def downgrade() -> None:
    # Revertir '1 y 2' y 'anual' a NULL antes de convertir de vuelta a INTEGER
    op.execute("UPDATE materia SET cuatrimestre = NULL WHERE cuatrimestre = 'anual'")
    op.execute("UPDATE materia SET cuatrimestre = NULL WHERE cuatrimestre = '1 y 2'")

    op.alter_column(
        'materia',
        'cuatrimestre',
        existing_type=sa.Text(),
        type_=sa.Integer(),
        postgresql_using='cuatrimestre::INTEGER',
        existing_nullable=True,
    )
