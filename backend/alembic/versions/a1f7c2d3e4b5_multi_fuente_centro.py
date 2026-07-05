"""novedad multi-fuente: tabla centro + novedad_fuente

Revision ID: a1f7c2d3e4b5
Revises: e7c3f1a9b204
Create Date: 2026-07-04

Reestructura el dominio de novedades a 1 novedad -> N fuentes:

- ``centro``: entidad del centro de estudiantes / sitio institucional (con
  logo y perfil).
- ``novedad_fuente``: cada aparición de una novedad en un centro; toma el
  ``external_id`` (clave de dedup exacta) que antes vivía en ``novedad``.
- ``novedad`` queda como el evento canónico: se le sacan las columnas de
  fuente (external_id, fuente, origen, url).

Nota: los datos de ``novedad`` son de prueba (FRRO, regenerables); tras esta
migración se re-ingesta para poblar la nueva estructura.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "a1f7c2d3e4b5"
down_revision: str | None = "e7c3f1a9b204"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    op.create_table(
        "centro",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("handle", sa.Text(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("url_perfil", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name="pk_centro"),
        sa.UniqueConstraint("handle", name="uq_centro_handle"),
    )
    op.create_index(op.f("ix_centro_handle"), "centro", ["handle"], unique=False)

    op.create_table(
        "novedad_fuente",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("novedad_id", sa.Integer(), nullable=False),
        sa.Column("centro_id", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("imagen_url", sa.Text(), nullable=True),
        sa.Column("imagen_path", sa.Text(), nullable=True),
        sa.Column("fecha_publicacion", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True
        ),
        sa.ForeignKeyConstraint(
            ["novedad_id"],
            ["novedad.id"],
            name="fk_novedad_fuente_novedad_id_novedad",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["centro_id"],
            ["centro.id"],
            name="fk_novedad_fuente_centro_id_centro",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_novedad_fuente"),
        sa.UniqueConstraint("external_id", name="uq_novedad_fuente_external_id"),
    )
    op.create_index(
        op.f("ix_novedad_fuente_novedad_id"), "novedad_fuente", ["novedad_id"]
    )
    op.create_index(
        op.f("ix_novedad_fuente_centro_id"), "novedad_fuente", ["centro_id"]
    )
    op.create_index(
        op.f("ix_novedad_fuente_external_id"), "novedad_fuente", ["external_id"]
    )

    # novedad: sacar las columnas de fuente (migran a novedad_fuente).
    op.drop_index(op.f("ix_novedad_external_id"), table_name="novedad")
    op.drop_index(op.f("ix_novedad_fuente"), table_name="novedad")
    op.drop_constraint("uq_novedad_external_id", "novedad", type_="unique")
    op.drop_column("novedad", "external_id")
    op.drop_column("novedad", "fuente")
    op.drop_column("novedad", "origen")
    op.drop_column("novedad", "url")


def downgrade() -> None:
    op.add_column("novedad", sa.Column("url", sa.Text(), nullable=True))
    op.add_column("novedad", sa.Column("origen", sa.Text(), nullable=True))
    op.add_column("novedad", sa.Column("fuente", sa.Text(), nullable=True))
    op.add_column("novedad", sa.Column("external_id", sa.Text(), nullable=True))
    op.create_unique_constraint("uq_novedad_external_id", "novedad", ["external_id"])
    op.create_index(op.f("ix_novedad_fuente"), "novedad", ["fuente"])
    op.create_index(op.f("ix_novedad_external_id"), "novedad", ["external_id"])

    op.drop_index(op.f("ix_novedad_fuente_external_id"), table_name="novedad_fuente")
    op.drop_index(op.f("ix_novedad_fuente_centro_id"), table_name="novedad_fuente")
    op.drop_index(op.f("ix_novedad_fuente_novedad_id"), table_name="novedad_fuente")
    op.drop_table("novedad_fuente")
    op.drop_index(op.f("ix_centro_handle"), table_name="centro")
    op.drop_table("centro")
