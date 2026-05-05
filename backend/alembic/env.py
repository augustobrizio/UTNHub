"""Configuración de Alembic para UTNHub.

Lo que hicimos respecto al template default:

1. Importamos ``Base`` y todos los modelos para que ``Base.metadata``
   conozca las 13 tablas. Esto es lo que Alembic compara contra la DB
   real cuando hacés ``alembic revision --autogenerate``.

2. La URL de conexión la leemos desde la misma config que la app
   (``app.config.get_settings``), que a su vez lee ``DATABASE_URL`` del
   ``.env``. De esta forma evitamos hardcodear credenciales en
   ``alembic.ini``.

3. Activamos ``compare_type`` y ``compare_server_default`` para que
   autogenerate detecte cambios sutiles (cambios de tipo, defaults).
"""
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# --- UTNHub: importamos nuestro Base y modelos -----------------------------
# Importar el paquete ``app.db.models`` ejecuta cada submódulo y registra
# todas las clases en ``Base.metadata``.
from app.config import get_settings
from app.db.base import Base
import app.db.models  # noqa: F401  (side effect: registra modelos)

# ---------------------------------------------------------------------------

# Alembic Config object: acceso a alembic.ini
config = context.config

# Inyectamos la URL desde nuestros settings, ignorando lo que esté en .ini.
config.set_main_option("sqlalchemy.url", get_settings().database_url)

# Logging de Python según la sección del .ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata que Alembic compara contra la DB para autogenerate.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Modo offline: genera SQL sin conectarse a la DB.

    Útil para inspeccionar las queries que Alembic emitiría sin
    tocar Neon.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo online: se conecta a Neon y aplica las migraciones."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
