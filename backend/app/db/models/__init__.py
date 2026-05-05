"""Registro central de modelos SQLAlchemy.

Importar cada modelo acá garantiza que `Base.metadata` los conozca cuando
Alembic autogenera migraciones o cuando se hace `Base.metadata.create_all`.
"""
from app.db.models.academico import (  # noqa: F401
    CondicionMateria,
    Correlatividad,
    Materia,
    TipoCorrelativa,
    TipoMateria,
    UsuarioMateria,
)

__all__ = [
    "CondicionMateria",
    "Correlatividad",
    "Materia",
    "TipoCorrelativa",
    "TipoMateria",
    "UsuarioMateria",
]
