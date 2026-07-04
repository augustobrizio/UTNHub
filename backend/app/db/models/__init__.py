"""Registro central de modelos SQLAlchemy.

Importar cada modelo acá garantiza que ``Base.metadata`` los conozca cuando
Alembic autogenera migraciones o cuando se hace ``Base.metadata.create_all``.
"""
from app.db.models.academico import (  # noqa: F401
    Comision,
    CondicionMateria,
    Correlatividad,
    Horario,
    Materia,
    TipoCorrelativa,
    TipoMateria,
    UsuarioMateria,
)
from app.db.models.calendario import EventoCalendario, TipoEventoCalendario  # noqa: F401
from app.db.models.chat import Conversacion, Mensaje  # noqa: F401
from app.db.models.novedad import (  # noqa: F401
    CategoriaContenido,
    CategoriaNovedad,
    EstadoIngesta,
    EstadoNovedad,
    FaqQuestion,
    FuenteContenido,
    FuenteNovedad,
    IngestaLog,
    Novedad,
)
from app.db.models.profesor import (  # noqa: F401
    HorarioConsulta,
    MateriaProfesor,
    Profesor,
)
from app.db.models.usuario import Usuario  # noqa: F401

__all__ = [
    "CategoriaContenido",
    "CategoriaNovedad",
    "Comision",
    "CondicionMateria",
    "Conversacion",
    "Correlatividad",
    "EstadoIngesta",
    "EstadoNovedad",
    "EventoCalendario",
    "FaqQuestion",
    "FuenteContenido",
    "FuenteNovedad",
    "Horario",
    "HorarioConsulta",
    "IngestaLog",
    "Materia",
    "MateriaProfesor",
    "Mensaje",
    "Novedad",
    "Profesor",
    "TipoCorrelativa",
    "TipoEventoCalendario",
    "TipoMateria",
    "Usuario",
    "UsuarioMateria",
]
