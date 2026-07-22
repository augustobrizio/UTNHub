"""extiende novedad para pipeline de ingesta + ingesta_log

Revision ID: e7c3f1a9b204
Revises: c1d2e3f4a5b6
Create Date: 2026-06-21

Agrega a ``novedad`` las columnas del pipeline de ingesta multi-fuente
(Instagram + UTN web) con clasificación IA y gate de moderación:

- ``external_id`` (UNIQUE): identidad estable de la fuente, clave de dedup.
- ``fuente`` / ``origen``: canal y autor (handle / dependencia).
- ``imagen_url`` / ``imagen_path``: media del post/story y evidencia local
  descargada (cita de stories, que no tienen URL permanente).
- ``estado`` / ``confianza`` / ``motivo_descarte``: salida del clasificador IA
  y gate de moderación (publicada / pendiente / descartada).
- ``updated_at``.

Crea ``ingesta_log`` para la auditoría de cada corrida del pipeline (RNF-08).

Nota: ``novedad`` está vacía/sin uso, por lo que ``estado NOT NULL`` con
server_default es seguro sobre las filas existentes.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "e7c3f1a9b204"
down_revision: str | None = "c1d2e3f4a5b6"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    op.add_column("novedad", sa.Column("external_id", sa.Text(), nullable=True))
    op.add_column("novedad", sa.Column("fuente", sa.Text(), nullable=True))
    op.add_column("novedad", sa.Column("origen", sa.Text(), nullable=True))
    op.add_column("novedad", sa.Column("imagen_url", sa.Text(), nullable=True))
    op.add_column("novedad", sa.Column("imagen_path", sa.Text(), nullable=True))
    op.add_column(
        "novedad",
        sa.Column(
            "estado",
            sa.Text(),
            nullable=False,
            server_default="pendiente",
        ),
    )
    op.add_column("novedad", sa.Column("confianza", sa.Float(), nullable=True))
    op.add_column(
        "novedad", sa.Column("motivo_descarte", sa.Text(), nullable=True)
    )
    op.add_column(
        "novedad",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )

    op.create_unique_constraint("uq_novedad_external_id", "novedad", ["external_id"])
    op.create_index(
        op.f("ix_novedad_external_id"), "novedad", ["external_id"], unique=False
    )
    op.create_index(op.f("ix_novedad_fuente"), "novedad", ["fuente"], unique=False)
    op.create_index(op.f("ix_novedad_estado"), "novedad", ["estado"], unique=False)

    op.create_table(
        "ingesta_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fuente", sa.Text(), nullable=False),
        sa.Column("iniciado_en", sa.DateTime(), nullable=False),
        sa.Column("finalizado_en", sa.DateTime(), nullable=True),
        sa.Column("items_vistos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_nuevos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("items_novedad", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "items_descartados", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("tokens_usados", sa.Integer(), nullable=True),
        sa.Column("estado", sa.Text(), nullable=False),
        sa.Column("errores", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_ingesta_log"),
    )
    op.create_index(
        op.f("ix_ingesta_log_fuente"), "ingesta_log", ["fuente"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ingesta_log_fuente"), table_name="ingesta_log")
    op.drop_table("ingesta_log")

    op.drop_index(op.f("ix_novedad_estado"), table_name="novedad")
    op.drop_index(op.f("ix_novedad_fuente"), table_name="novedad")
    op.drop_index(op.f("ix_novedad_external_id"), table_name="novedad")
    op.drop_constraint("uq_novedad_external_id", "novedad", type_="unique")

    op.drop_column("novedad", "updated_at")
    op.drop_column("novedad", "motivo_descarte")
    op.drop_column("novedad", "confianza")
    op.drop_column("novedad", "estado")
    op.drop_column("novedad", "imagen_path")
    op.drop_column("novedad", "imagen_url")
    op.drop_column("novedad", "origen")
    op.drop_column("novedad", "fuente")
    op.drop_column("novedad", "external_id")
