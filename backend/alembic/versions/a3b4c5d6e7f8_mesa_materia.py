"""mesa_materia: dia y hora de la mesa de examen de cada materia

Revision ID: a3b4c5d6e7f8
Revises: a2b3c4d5e6f7
Create Date: 2026-09-07

En FRRO la mesa reparte las materias por dia de la semana, no por fecha: los
lunes se rinde Analisis Matematico I, los jueves Simulacion. Ese dato no cambia
llamado a llamado, asi que cuelga de la materia. ``evento_calendario`` sigue
diciendo que semana hay mesa; esta tabla dice que se rinde adentro.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mesa_materia",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("materia_codigo", sa.Text(), nullable=False),
        sa.Column("dia_semana", sa.Text(), nullable=False),
        sa.Column("hora", sa.Time(), nullable=True),
        sa.Column("nota", sa.Text(), nullable=True),
        sa.Column("origen", sa.Text(), server_default="seed", nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.ForeignKeyConstraint(
            ["materia_codigo"], ["materia.codigo"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuario.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("materia_codigo", name="uq_mesa_materia_materia"),
    )
    op.create_index(
        op.f("ix_mesa_materia_materia_codigo"), "mesa_materia", ["materia_codigo"]
    )
    op.create_index(op.f("ix_mesa_materia_dia_semana"), "mesa_materia", ["dia_semana"])
    op.create_index(op.f("ix_mesa_materia_origen"), "mesa_materia", ["origen"])


def downgrade() -> None:
    op.drop_index(op.f("ix_mesa_materia_origen"), table_name="mesa_materia")
    op.drop_index(op.f("ix_mesa_materia_dia_semana"), table_name="mesa_materia")
    op.drop_index(op.f("ix_mesa_materia_materia_codigo"), table_name="mesa_materia")
    op.drop_table("mesa_materia")
