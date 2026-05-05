"""Engine y session factory de SQLAlchemy.

Exposed:
- `engine`: el motor sync (Neon Postgres).
- `SessionLocal`: factory de sesiones.
- `get_db`: dependency de FastAPI para inyectar una sesión por request.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

_settings = get_settings()

# pool_pre_ping=True: el compute de Neon se duerme tras inactividad y la
# primera query puede fallar sin pre-ping (CLAUDE.md).
engine = create_engine(
    _settings.database_url,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency de FastAPI: cede una sesión y la cierra al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
