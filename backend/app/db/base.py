"""Base declarativa de SQLAlchemy.

Todos los modelos del proyecto heredan de `Base`. Mantener este archivo
chico: sólo la metadata global y la convención de naming para que las
migraciones de Alembic generen nombres consistentes.
"""
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Convención de naming para constraints e índices. Permite que Alembic
# genere migraciones con nombres deterministas y evita los nombres
# autogenerados feos del estilo "uq_xxx_xxx_yyy".
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base declarativa común a todos los modelos."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
