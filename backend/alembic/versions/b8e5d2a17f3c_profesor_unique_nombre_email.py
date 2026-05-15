"""profesor unique nombre email

Revision ID: b8e5d2a17f3c
Revises: a3f8c2d91b47
Create Date: 2026-05-14

Agrega UNIQUE (nombre, email) en profesor con NULLS NOT DISTINCT, para que
el scraper de horarios de consulta pueda hacer get_or_create_profesor sin
generar duplicados (los emails son None en la fuente actual).

Antes de crear el constraint, deduplica los profesores existentes:
- Para cada (nombre, email) duplicado, conserva la fila con MIN(id).
- Remapea las FKs en ``horario_consulta`` y ``materia_profesor`` al id sobreviviente.
- Borra las filas duplicadas.
"""
from __future__ import annotations

from alembic import op

revision: str = 'b8e5d2a17f3c'
down_revision: str | None = 'a3f8c2d91b47'
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # Remap FK en horario_consulta hacia el id sobreviviente de cada grupo duplicado
    op.execute("""
        WITH ranked AS (
            SELECT id, nombre, email,
                   MIN(id) OVER (PARTITION BY nombre, email) AS keep_id
            FROM profesor
        )
        UPDATE horario_consulta hc
        SET profesor_id = r.keep_id
        FROM ranked r
        WHERE hc.profesor_id = r.id AND r.id <> r.keep_id;
    """)

    # Remap FK en materia_profesor
    op.execute("""
        WITH ranked AS (
            SELECT id, nombre, email,
                   MIN(id) OVER (PARTITION BY nombre, email) AS keep_id
            FROM profesor
        )
        UPDATE materia_profesor mp
        SET profesor_id = r.keep_id
        FROM ranked r
        WHERE mp.profesor_id = r.id AND r.id <> r.keep_id;
    """)

    # Borrar profesores duplicados (todos salvo el de menor id por grupo)
    op.execute("""
        DELETE FROM profesor
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY nombre, email ORDER BY id) AS rn
                FROM profesor
            ) sub
            WHERE rn > 1
        );
    """)

    op.create_unique_constraint(
        'uq_profesor_nombre_email',
        'profesor',
        ['nombre', 'email'],
        postgresql_nulls_not_distinct=True,
    )


def downgrade() -> None:
    # El downgrade solo dropea el constraint; los duplicados eliminados no se restauran.
    op.drop_constraint('uq_profesor_nombre_email', 'profesor', type_='unique')
